#!/usr/bin/env tsx
//
// scripts/gradelink-import-inactive.ts
//
// Creates stub profile + students rows for ~2,316 historical (graduated/
// withdrawn) Gradelink students. We need these as foreign-key anchors
// for the transcript importer — every grade in TranscriptExport.csv
// references a StudentID, and most of those StudentIDs aren't on the
// active roster.
//
// Profile shape:
//   - email: SchoolEmail when present (lowercased), otherwise a
//     synthetic placeholder
//     `gradelink-<StudentID>@archive.highbluffacademy.com`. The
//     `archive.` subdomain is a clear "this is not a real mailbox"
//     marker that still satisfies the schema's lowercase check.
//   - active: false
//   - roles: ['student']
//   - first_name / last_name / display_name from Gradelink
//   - gradelink_account_id from Gradelink AccountId
//
// Students row:
//   - profile_id linked
//   - legal_first_name, legal_last_name, preferred_name (parenthetical)
//   - dob (sanity-checked)
//   - status: 'graduated' when GraduationDate set OR neither date
//     present (presumed graduated); 'withdrawn' when WithdrawalDate
//     set without GraduationDate.
//   - graduated_at / withdrawn_at when known
//   - registered_at_hba from EntryDate
//   - address from Street/City/State/Zip
//   - gradelink_student_id
//
// Idempotent: re-running finds rows by gradelink_student_id and
// skips them. Dry-run by default; --commit applies in one
// transaction.

import { Client } from "pg"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parse as parseCsv } from "csv-parse/sync"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const raw of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function parseArgs() {
  return { commit: process.argv.includes("--commit") }
}

function parseMDY(raw: string): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`
}

function safeBirthdate(iso: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const yy = parseInt(m[1], 10)
  if (yy < 1900 || yy > new Date().getFullYear() - 4) return null
  return iso
}

function preferredFrom(fullName: string): string | null {
  const m = fullName.match(/\(([^)]+)\)/)
  if (!m) return null
  const inner = m[1].trim()
  if (!inner) return null
  if (/^(delete|do not use)$/i.test(inner)) return null
  return inner
}

function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return null
  return trimmed
}

type Row = Record<string, string>

type Decision =
  | { action: "skip"; reason: string }
  | { action: "insert"; profile: ProfileInsert; student: StudentInsert }
  | { action: "exists"; profile_id: string; student_id: string }

type ProfileInsert = {
  email: string
  email_synthetic: boolean
  first_name: string | null
  last_name: string | null
  display_name: string | null
  gradelink_account_id: string
}

type StudentInsert = {
  gradelink_student_id: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
  dob: string | null
  status: "active" | "graduated" | "withdrawn"
  graduated_at: string | null
  withdrawn_at: string | null
  registered_at_hba: string | null
  address_line1: string | null
  address_city: string | null
  address_region: string | null
  address_postal_code: string | null
}

function readInactiveRoster(): Row[] {
  const csvPath = path.resolve(
    process.cwd(),
    "hba gradelink migration",
    "StudentRosterInactive.csv"
  )
  if (!existsSync(csvPath)) {
    throw new Error(`Not found: ${csvPath}`)
  }
  return parseCsv(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Row[]
}

async function buildPlan(client: Client, rows: Row[]) {
  // Look up everything we have keyed by gradelink_student_id so we can
  // skip already-imported rows cheaply.
  const { rows: existingStudents } = await client.query<{
    gradelink_student_id: string
    id: string
    profile_id: string
  }>(
    `select gradelink_student_id, id, profile_id from students where gradelink_student_id is not null`
  )
  const haveStudent = new Map<string, { id: string; profile_id: string }>()
  for (const r of existingStudents) {
    haveStudent.set(r.gradelink_student_id, {
      id: r.id,
      profile_id: r.profile_id,
    })
  }

  const { rows: existingProfiles } = await client.query<{
    gradelink_account_id: string
    id: string
  }>(
    `select gradelink_account_id, id from profiles where gradelink_account_id is not null`
  )
  const haveProfile = new Map<string, string>()
  for (const r of existingProfiles) {
    haveProfile.set(r.gradelink_account_id, r.id)
  }

  // Build a set of all existing emails so we can avoid collisions when
  // synthesizing.
  const { rows: existingEmails } = await client.query<{ email: string }>(
    `select email from profiles`
  )
  const takenEmails = new Set(existingEmails.map((r) => r.email.toLowerCase()))

  const decisions: Decision[] = []
  let skip_delete = 0
  let skip_existing_student = 0
  let skip_existing_profile = 0
  let new_insert = 0
  let email_collision_skip = 0

  for (const r of rows) {
    const fullName = (r.FullName ?? "").trim()
    if (/\((delete|do not use)\)/i.test(fullName)) {
      decisions.push({
        action: "skip",
        reason: `marked delete/do-not-use: ${fullName}`,
      })
      skip_delete += 1
      continue
    }

    const studentId = (r.StudentID ?? "").trim()
    const accountId = (r.AccountId ?? "").trim()
    if (!studentId || !accountId) {
      decisions.push({
        action: "skip",
        reason: `missing StudentID/AccountId for "${fullName}"`,
      })
      continue
    }

    // Already imported (covers re-run + the 63 active-roster students
    // that we just linked).
    const existingS = haveStudent.get(studentId)
    if (existingS) {
      decisions.push({
        action: "exists",
        profile_id: existingS.profile_id,
        student_id: existingS.id,
      })
      skip_existing_student += 1
      continue
    }
    const existingP = haveProfile.get(accountId)
    if (existingP) {
      // Profile exists (e.g. linked via active roster) but no students
      // row — odd, log so we can investigate. Don't try to fix here.
      decisions.push({
        action: "skip",
        reason: `profile ${existingP} exists for account ${accountId} but no students row; skipping to avoid weirdness`,
      })
      skip_existing_profile += 1
      continue
    }

    // Decide email: prefer SchoolEmail when set + looks like an email,
    // otherwise synthesize.
    let email = normalizeEmail(r.SchoolEmail ?? "")
    let synthetic = false
    if (!email) {
      email = `gradelink-${studentId}@archive.highbluffacademy.com`
      synthetic = true
    }
    if (takenEmails.has(email)) {
      // Collision against an existing profile. Almost never happens
      // for the synthetic pattern; for SchoolEmail it can if a
      // current HBA email is reused. Fall back to synthetic with the
      // account id appended so we don't lose the row.
      const fallback = `gradelink-${studentId}@archive.highbluffacademy.com`
      if (takenEmails.has(fallback)) {
        decisions.push({
          action: "skip",
          reason: `email collision for student ${studentId} (${fullName}); can't synthesize a unique email`,
        })
        email_collision_skip += 1
        continue
      }
      email = fallback
      synthetic = true
    }
    takenEmails.add(email)

    // Status logic. GraduationDate wins over WithdrawalDate when both
    // present (graduating wraps up everything else).
    const gradISO = parseMDY((r.GraduationDate ?? "").trim())
    const wdrwISO = parseMDY((r.WithdrawalDate ?? "").trim())
    let status: "graduated" | "withdrawn"
    if (gradISO) status = "graduated"
    else if (wdrwISO) status = "withdrawn"
    else status = "graduated" // presumed — neither date set in Gradelink

    const fname = (r.FName ?? "").trim()
    const lname = (r.LName ?? "").trim()
    if (!fname || !lname) {
      decisions.push({
        action: "skip",
        reason: `missing fname/lname for student ${studentId}`,
      })
      continue
    }

    const displayName = fullName || `${lname}, ${fname}`.trim()
    const profile: ProfileInsert = {
      email,
      email_synthetic: synthetic,
      first_name: fname || null,
      last_name: lname || null,
      display_name: displayName || null,
      gradelink_account_id: accountId,
    }

    const student: StudentInsert = {
      gradelink_student_id: studentId,
      legal_first_name: fname,
      legal_last_name: lname,
      preferred_name: preferredFrom(fullName),
      dob: safeBirthdate(parseMDY((r.Birthdate ?? "").trim())),
      status,
      graduated_at: gradISO,
      withdrawn_at: status === "withdrawn" ? wdrwISO : null,
      registered_at_hba: parseMDY((r.EntryDate ?? "").trim()),
      address_line1: (r.Street ?? "").trim() || null,
      address_city: (r.City ?? "").trim() || null,
      address_region: (r.State ?? "").trim() || null,
      address_postal_code: (r.Zip ?? "").trim() || null,
    }

    decisions.push({ action: "insert", profile, student })
    new_insert += 1
  }

  return {
    decisions,
    summary: {
      total_rows: rows.length,
      new_insert,
      skip_existing_student,
      skip_existing_profile,
      skip_delete,
      email_collision_skip,
      other_skip:
        decisions.filter((d) => d.action === "skip").length -
        skip_delete -
        skip_existing_profile -
        email_collision_skip,
    },
  }
}

async function applyPlan(
  client: Client,
  decisions: Decision[]
): Promise<void> {
  for (const d of decisions) {
    if (d.action !== "insert") continue
    const { profile, student } = d
    const { rows: insertedProfile } = await client.query<{ id: string }>(
      `insert into profiles
         (email, first_name, last_name, display_name, roles, active,
          gradelink_account_id)
       values ($1, $2, $3, $4, array['student']::text[], false, $5)
       returning id`,
      [
        profile.email,
        profile.first_name,
        profile.last_name,
        profile.display_name,
        profile.gradelink_account_id,
      ]
    )
    const profileId = insertedProfile[0].id
    await client.query(
      `insert into students
         (profile_id, gradelink_student_id, legal_first_name, legal_last_name,
          preferred_name, dob, status, graduated_at, withdrawn_at,
          registered_at_hba, address_line1, address_city, address_region,
          address_postal_code)
       values ($1, $2, $3, $4, $5, $6::date, $7, $8::date, $9::date,
               $10::date, $11, $12, $13, $14)`,
      [
        profileId,
        student.gradelink_student_id,
        student.legal_first_name,
        student.legal_last_name,
        student.preferred_name,
        student.dob,
        student.status,
        student.graduated_at,
        student.withdrawn_at,
        student.registered_at_hba,
        student.address_line1,
        student.address_city,
        student.address_region,
        student.address_postal_code,
      ]
    )
  }
}

async function main() {
  loadEnvLocal()
  const { commit } = parseArgs()
  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local")
    process.exit(2)
  }
  const rows = readInactiveRoster()
  console.log(`[inactive] Read ${rows.length} inactive-roster rows`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    const { decisions, summary } = await buildPlan(client, rows)
    console.log(`Summary:`)
    console.log(`  total rows                  : ${summary.total_rows}`)
    console.log(`  new inserts (profile+student): ${summary.new_insert}`)
    console.log(`  skipped — already in DB     : ${summary.skip_existing_student}`)
    console.log(`  skipped — DELETE marker     : ${summary.skip_delete}`)
    console.log(
      `  skipped — profile-but-no-student : ${summary.skip_existing_profile}`
    )
    console.log(
      `  skipped — email collision   : ${summary.email_collision_skip}`
    )
    console.log(`  skipped — other             : ${summary.other_skip}`)

    if (!commit) {
      console.log(`\nDry run only. Re-run with --commit to write.`)
      return
    }

    console.log(`\nApplying ...`)
    await client.query("begin")
    try {
      await applyPlan(client, decisions)
      await client.query("commit")
      console.log(`OK — committed ${summary.new_insert} new students.`)
    } catch (err) {
      await client.query("rollback")
      console.error("ROLLBACK:", err instanceof Error ? err.message : err)
      process.exitCode = 1
    }
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
