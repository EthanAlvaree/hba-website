#!/usr/bin/env tsx
//
// scripts/gradelink-import-parents.ts
//
// Imports the active-student contacts file:
//   - Skips rows where Relationship='(Student record)' (those are
//     the student's own row, not a real contact).
//   - Skips rows with no Email1 (we can't sign them into a portal
//     without an email; emergency-only contacts with no email can
//     be added through the admin UI later).
//   - For parent-like relationships (mother/father/parent/guardian/
//     stepparent), creates the profile with 'parent' role + a
//     parent_links row marked is_primary=true.
//   - For extended-family / friend relationships with an email,
//     creates the profile + parent_link with is_primary=false +
//     is_emergency_contact=true. Can_view_grades=false by default
//     (admin can grant).
//
// Dedup: profiles keyed by lower(email). One parent with multiple
// HBA-enrolled kids ends up as one profile with multiple
// parent_links rows. Idempotent via the (student_id, parent_profile_id)
// unique constraint on parent_links.

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

function normalizeEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return null
  return trimmed
}

function firstNonEmpty(...values: string[]): string | null {
  for (const v of values) {
    const t = (v ?? "").trim()
    if (t) return t
  }
  return null
}

function pickPhone(...values: string[]): string | null {
  for (const v of values) {
    if (!v) continue
    // Cells like "(678) 650-4767 - Cell" or "8587641212 - Phone 1". Take
    // just the numeric portion.
    const digits = v.replace(/[^\d]/g, "")
    if (digits.length >= 7) return digits
  }
  return null
}

function classifyRelationship(raw: string): {
  normalized: string
  is_primary: boolean
} {
  const lower = raw.trim().toLowerCase()
  if (/^mother(\s|\/|$)|^mom(\s|$)|^moms partner$|^stepmother/.test(lower)) {
    return { normalized: lower.startsWith("stepmother") ? "Stepmother" : "Mother", is_primary: !lower.startsWith("stepmother") }
  }
  if (/^father(\s|\/|$)|^stepfather/.test(lower)) {
    return { normalized: lower.startsWith("stepfather") ? "Stepfather" : "Father", is_primary: !lower.startsWith("stepfather") }
  }
  if (/^(legal\s+)?guardian|gaurdian|^parent$|^step parent$/.test(lower)) {
    return { normalized: "Guardian", is_primary: true }
  }
  // Everything else (sibling, aunt, friend, etc.) → not primary.
  // Capitalize first letter for the relationship label.
  const capitalized = raw.trim().slice(0, 1).toUpperCase() + raw.trim().slice(1)
  return { normalized: capitalized || "Contact", is_primary: false }
}

type Row = Record<string, string>

type Action =
  | { kind: "skip"; reason: string; row: Row }
  | {
      kind: "link"
      student_id: string
      profile_email: string
      profile_first: string | null
      profile_last: string | null
      profile_display: string
      profile_phone: string | null
      profile_personal_email: string
      address_line1: string | null
      address_city: string | null
      address_region: string | null
      address_postal_code: string | null
      relationship: string
      is_primary: boolean
      is_emergency_contact: boolean
      can_view_grades: boolean
      can_view_attendance: boolean
    }

function readActiveContacts(): Row[] {
  const csvPath = path.resolve(
    process.cwd(),
    "hba gradelink migration",
    "StudentContactsActive.csv"
  )
  if (!existsSync(csvPath)) throw new Error(`Not found: ${csvPath}`)
  return parseCsv(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Row[]
}

async function buildPlan(client: Client, rows: Row[]) {
  // Map Gradelink StudentID → students.id (only the active ones — the
  // 92 active roster + 22 extra-active is the universe we care about).
  const { rows: studentRows } = await client.query<{
    id: string
    gradelink_student_id: string | null
  }>(
    `select id, gradelink_student_id from students where gradelink_student_id is not null`
  )
  const byGradelinkId = new Map<string, string>()
  for (const r of studentRows) {
    if (r.gradelink_student_id) byGradelinkId.set(r.gradelink_student_id, r.id)
  }

  const actions: Action[] = []
  let skip_self = 0
  let skip_no_email = 0
  let skip_no_student = 0
  let plan_primary = 0
  let plan_emergency = 0

  for (const r of rows) {
    const relRaw = (r.Relationship ?? "").trim()
    if (relRaw === "(Student record)") {
      actions.push({ kind: "skip", reason: "(Student record)", row: r })
      skip_self += 1
      continue
    }

    const email = normalizeEmail(r.Email1 ?? "")
    if (!email) {
      actions.push({
        kind: "skip",
        reason: `no Email1 (${r.ContactName})`,
        row: r,
      })
      skip_no_email += 1
      continue
    }

    const studentId = byGradelinkId.get((r.StudentID ?? "").trim())
    if (!studentId) {
      actions.push({
        kind: "skip",
        reason: `no SIS student for StudentID=${r.StudentID}`,
        row: r,
      })
      skip_no_student += 1
      continue
    }

    const { normalized: relationship, is_primary } = classifyRelationship(relRaw)
    const rolesPerms = (r.RolesAndPermissions ?? "").toLowerCase()
    const is_emergency = is_primary || rolesPerms.includes("emergency")

    if (is_primary) plan_primary += 1
    else plan_emergency += 1

    actions.push({
      kind: "link",
      student_id: studentId,
      profile_email: email,
      profile_first: firstNonEmpty(r.Fname),
      profile_last: firstNonEmpty(r.Lname),
      profile_display:
        firstNonEmpty(r.ContactName, `${r.Lname}, ${r.Fname}`) ?? email,
      profile_phone: pickPhone(r.Phone1, r.Phone2, r.Phone3),
      profile_personal_email: email,
      address_line1: firstNonEmpty(r.AddressLine1, r.AddressLine2),
      address_city: firstNonEmpty(r.City),
      address_region: firstNonEmpty(r.State),
      address_postal_code: firstNonEmpty(r.Zip),
      relationship,
      is_primary,
      is_emergency_contact: is_emergency,
      // Primary parents see grades/attendance by default; emergency
      // contacts don't unless an admin grants it.
      can_view_grades: is_primary,
      can_view_attendance: is_primary,
    })
  }

  return {
    actions,
    summary: {
      total_rows: rows.length,
      skip_self,
      skip_no_email,
      skip_no_student,
      plan_primary,
      plan_emergency,
    },
  }
}

async function applyPlan(client: Client, actions: Action[]) {
  // Cache profiles by email so we don't make N queries when the same
  // parent appears for multiple siblings.
  const profileCache = new Map<string, string>()
  // Reset cache from the DB so re-runs find profiles created on
  // previous commits.
  const { rows: existing } = await client.query<{
    id: string
    email: string
  }>(`select id, email from profiles`)
  for (const e of existing) profileCache.set(e.email.toLowerCase(), e.id)

  let profiles_created = 0
  let parent_role_added = 0
  let links_inserted = 0
  let links_skipped_existing = 0

  for (const a of actions) {
    if (a.kind !== "link") continue

    let profileId = profileCache.get(a.profile_email)
    if (!profileId) {
      const { rows: ins } = await client.query<{ id: string }>(
        `insert into profiles
           (email, first_name, last_name, display_name,
            mobile_phone, address_line1, address_city, address_region,
            address_postal_code, roles, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 array['parent']::text[], true)
         returning id`,
        [
          a.profile_email,
          a.profile_first,
          a.profile_last,
          a.profile_display,
          a.profile_phone,
          a.address_line1,
          a.address_city,
          a.address_region,
          a.address_postal_code,
        ]
      )
      profileId = ins[0].id
      profileCache.set(a.profile_email, profileId)
      profiles_created += 1
    } else {
      // Ensure 'parent' role is present on the existing profile.
      const { rowCount } = await client.query(
        `update profiles
            set roles = array_append(roles, 'parent')
          where id = $1
            and not 'parent' = any(roles)`,
        [profileId]
      )
      if ((rowCount ?? 0) > 0) parent_role_added += 1
    }

    // Insert parent_link, no-op on conflict (unique on student_id + parent_profile_id).
    const { rowCount } = await client.query(
      `insert into parent_links
         (student_id, parent_profile_id, relationship, is_primary,
          is_emergency_contact, can_view_grades, can_view_attendance,
          can_receive_communications)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       on conflict (student_id, parent_profile_id) do nothing`,
      [
        a.student_id,
        profileId,
        a.relationship,
        a.is_primary,
        a.is_emergency_contact,
        a.can_view_grades,
        a.can_view_attendance,
      ]
    )
    if ((rowCount ?? 0) > 0) links_inserted += 1
    else links_skipped_existing += 1
  }

  return { profiles_created, parent_role_added, links_inserted, links_skipped_existing }
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
  const rows = readActiveContacts()
  console.log(`[parents] Read ${rows.length} active-contact rows`)

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    const { actions, summary } = await buildPlan(client, rows)
    console.log(`Plan:`)
    console.log(`  total rows            : ${summary.total_rows}`)
    console.log(`  skip — Student record : ${summary.skip_self}`)
    console.log(`  skip — no email       : ${summary.skip_no_email}`)
    console.log(`  skip — no SIS student : ${summary.skip_no_student}`)
    console.log(`  to link (primary)     : ${summary.plan_primary}`)
    console.log(`  to link (emergency)   : ${summary.plan_emergency}`)

    if (!commit) {
      console.log(`\nDry run only. Re-run with --commit to write.`)
      return
    }

    console.log(`\nApplying ...`)
    await client.query("begin")
    try {
      const r = await applyPlan(client, actions)
      await client.query("commit")
      console.log(`OK — committed.`)
      console.log(`  profiles created           : ${r.profiles_created}`)
      console.log(`  parent role added (existing): ${r.parent_role_added}`)
      console.log(`  parent_links inserted      : ${r.links_inserted}`)
      console.log(`  parent_links already there : ${r.links_skipped_existing}`)
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
