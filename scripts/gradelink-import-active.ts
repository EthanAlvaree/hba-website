#!/usr/bin/env tsx
//
// scripts/gradelink-import-active.ts
//
// Applies the approved Gradelink mapping to the SIS DB. One operation:
//   - For "link" decisions (existing M365 profile): patch profile +
//     upsert a students row, attach gradelink_student_id /
//     gradelink_account_id so future re-runs are idempotent.
//   - For "create" decisions: do NOT create the profile here — we
//     don't own M365 yet. Write the desired-username plan to
//     .gradelink-pending-m365.json instead. The M365 provisioning
//     step picks it up next.
//   - For "skip" decisions: no-op, just log.
//   - Apply auxiliary classifications: shared_mailbox role,
//     active/inactive teachers, alumni deactivation, extra async-
//     online students who need student-role + students row.
//
// Dry-run by default. Use --commit to actually write.
//
//   npm run gradelink:import-active            # preview
//   npm run gradelink:import-active -- --commit
//
// All writes happen inside a single transaction. If anything fails,
// nothing lands.

import { Client } from "pg"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

// ============================================================================
// .env loader (mirrors db-sql.ts)
// ============================================================================

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
  const argv = process.argv.slice(2)
  return {
    commit: argv.includes("--commit"),
  }
}

// ============================================================================
// Types mirroring the approvals JSON
// ============================================================================

type Decision = "link" | "create" | "skip"

type ApprovalEntry = {
  gradelink_student_id: string
  gradelink_account_id: string
  full_name: string
  fname: string
  lname: string
  grade_level: string
  birthdate: string | null
  decision: Decision
  match_email: string | null
  desired_username: string | null
  notes: string
  matcher_tier: string
}

type Approvals = {
  active_roster: ApprovalEntry[]
  shared_mailboxes: string[]
  active_teachers: { email: string; name: string }[]
  inactive_teachers: { email: string; name: string }[]
  inactive_alumni: { email: string; name: string }[]
  extra_active_students: string[]
}

// ============================================================================
// Per-row helpers
// ============================================================================

function preferredFrom(fullName: string): string | null {
  const m = fullName.match(/\(([^)]+)\)/)
  if (!m) return null
  const inner = m[1].trim()
  if (!inner) return null
  if (/^(delete|do not use)$/i.test(inner)) return null
  return inner
}

/** Birthdate sanity: must be a valid YYYY-MM-DD and between 1980 and (today
 *  minus 5 years). Returns null for the Gradelink garbage dates like
 *  2025-08-17 or 2026-01-01. */
function safeBirthdate(value: string | null): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const yyyy = parseInt(m[1], 10)
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  if (yyyy < 1980) return null
  if (yyyy > fiveYearsAgo.getFullYear()) return null
  return value
}

/** Pull grad year (4-digit) from an HBA student email like
 *  "audrey.guo.28@highbluffacademy.com" → 2028. Null if not present. */
function gradYearFromEmail(email: string): number | null {
  const m = email.toLowerCase().match(/\.(\d{2})@highbluffacademy\.com$/)
  if (!m) return null
  const yy = parseInt(m[1], 10)
  return 2000 + yy
}

/** Derive current_grade given a graduation year and today. The
 *  "current grade" in May 2026 for a class of 2028 student is 10
 *  (they finish 10th this year). Formula: 12 - (grad_year - school_year_end). */
function gradeFromGradYear(gradYear: number): string | null {
  const today = new Date()
  const schoolYearEnd =
    today.getMonth() >= 6 // July or later: we're already in the next school year
      ? today.getFullYear() + 1
      : today.getFullYear()
  const grade = 12 - (gradYear - schoolYearEnd)
  if (grade < 1 || grade > 12) return null
  return String(grade)
}

/** Build a desired M365 username for a "create" entry. Pattern:
 *  preferred-or-first.lastname.YY where YY is the last two digits of
 *  the implied grad year (computed from grade_level + today). */
function deriveDesiredUsername(entry: ApprovalEntry): {
  username: string
  domain: string
  grad_year: number
} | null {
  const preferred = preferredFrom(entry.full_name)
  const firstTokens = (preferred ?? entry.fname).trim().toLowerCase().split(/\s+/)
  const first = firstTokens[0] // single-token first name for the email
  const last = entry.lname
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "") // strip spaces/hyphens for the email handle
  if (!first || !last) return null

  // Imply grad year from grade. May 2026, grade 10 → grad 2028 (they
  // finish 10th this school year, then 11th next year, then graduate).
  const grade = parseInt(entry.grade_level, 10)
  if (!Number.isFinite(grade)) return null
  const today = new Date()
  const schoolYearEnd =
    today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear()
  const gradYear = schoolYearEnd + (12 - grade)
  const yy = String(gradYear).slice(2)

  return {
    username: `${first}.${last}.${yy}`,
    domain: "highbluffacademy.com",
    grad_year: gradYear,
  }
}

// ============================================================================
// Plan / apply pipeline
// ============================================================================

type LinkAction = {
  kind: "link"
  entry: ApprovalEntry
  profile_id: string
  profile_first_name: string | null
  profile_last_name: string | null
  profile_display_name: string | null
  profile_roles: string[]
  students_row_exists: boolean
}

type CreateAction = {
  kind: "create"
  entry: ApprovalEntry
  desired_email: string
  grad_year: number
}

type AuxAction =
  | { kind: "shared_mailbox"; email: string; profile_id: string; roles_before: string[]; active_before: boolean }
  | { kind: "active_teacher"; email: string; profile_id: string; roles_before: string[] }
  | { kind: "inactive_teacher"; email: string; profile_id: string; roles_before: string[]; active_before: boolean }
  | { kind: "inactive_alumnus"; email: string; profile_id: string; roles_before: string[]; active_before: boolean }
  | { kind: "extra_student"; email: string; profile_id: string; roles_before: string[]; first: string | null; last: string | null; grad_year: number | null; students_exists: boolean }

async function buildPlan(client: Client, approvals: Approvals) {
  const links: LinkAction[] = []
  const creates: CreateAction[] = []
  const skips: ApprovalEntry[] = []
  const aux: AuxAction[] = []
  const errors: string[] = []

  // ---- Active roster ------------------------------------------------------
  for (const entry of approvals.active_roster) {
    if (entry.decision === "skip") {
      skips.push(entry)
      continue
    }
    if (entry.decision === "create") {
      const u = deriveDesiredUsername(entry)
      if (!u) {
        errors.push(
          `Could not derive username for "${entry.full_name}" (grade=${entry.grade_level}, fname=${entry.fname}, lname=${entry.lname})`
        )
        continue
      }
      creates.push({
        kind: "create",
        entry,
        desired_email: `${u.username}@${u.domain}`,
        grad_year: u.grad_year,
      })
      continue
    }
    // link
    if (!entry.match_email) {
      errors.push(`"link" entry "${entry.full_name}" has no match_email`)
      continue
    }
    const { rows } = await client.query<{
      id: string
      first_name: string | null
      last_name: string | null
      display_name: string | null
      roles: string[]
      students_id: string | null
    }>(
      `select p.id,
              p.first_name,
              p.last_name,
              p.display_name,
              p.roles,
              s.id as students_id
         from profiles p
         left join students s on s.profile_id = p.id
        where lower(p.email) = lower($1)`,
      [entry.match_email]
    )
    if (rows.length === 0) {
      errors.push(
        `"link" entry "${entry.full_name}" points at ${entry.match_email} but no such profile exists`
      )
      continue
    }
    const p = rows[0]
    links.push({
      kind: "link",
      entry,
      profile_id: p.id,
      profile_first_name: p.first_name,
      profile_last_name: p.last_name,
      profile_display_name: p.display_name,
      profile_roles: p.roles,
      students_row_exists: p.students_id !== null,
    })
  }

  // ---- Shared mailboxes ---------------------------------------------------
  for (const email of approvals.shared_mailboxes) {
    const { rows } = await client.query<{
      id: string
      roles: string[]
      active: boolean
    }>(
      `select id, roles, active from profiles where lower(email)=lower($1)`,
      [email]
    )
    if (rows.length === 0) {
      errors.push(`shared_mailbox: ${email} not found`)
      continue
    }
    aux.push({
      kind: "shared_mailbox",
      email,
      profile_id: rows[0].id,
      roles_before: rows[0].roles,
      active_before: rows[0].active,
    })
  }

  // ---- Active teachers ----------------------------------------------------
  for (const t of approvals.active_teachers) {
    const { rows } = await client.query<{ id: string; roles: string[] }>(
      `select id, roles from profiles where lower(email)=lower($1)`,
      [t.email]
    )
    if (rows.length === 0) {
      errors.push(`active_teacher: ${t.email} not found`)
      continue
    }
    aux.push({
      kind: "active_teacher",
      email: t.email,
      profile_id: rows[0].id,
      roles_before: rows[0].roles,
    })
  }

  // ---- Inactive teachers --------------------------------------------------
  for (const t of approvals.inactive_teachers) {
    const { rows } = await client.query<{
      id: string
      roles: string[]
      active: boolean
    }>(
      `select id, roles, active from profiles where lower(email)=lower($1)`,
      [t.email]
    )
    if (rows.length === 0) {
      errors.push(`inactive_teacher: ${t.email} not found`)
      continue
    }
    aux.push({
      kind: "inactive_teacher",
      email: t.email,
      profile_id: rows[0].id,
      roles_before: rows[0].roles,
      active_before: rows[0].active,
    })
  }

  // ---- Inactive alumni ----------------------------------------------------
  for (const a of approvals.inactive_alumni) {
    const { rows } = await client.query<{
      id: string
      roles: string[]
      active: boolean
    }>(
      `select id, roles, active from profiles where lower(email)=lower($1)`,
      [a.email]
    )
    if (rows.length === 0) {
      errors.push(`inactive_alumnus: ${a.email} not found`)
      continue
    }
    aux.push({
      kind: "inactive_alumnus",
      email: a.email,
      profile_id: rows[0].id,
      roles_before: rows[0].roles,
      active_before: rows[0].active,
    })
  }

  // ---- Extra async-online students ----------------------------------------
  for (const email of approvals.extra_active_students) {
    const { rows } = await client.query<{
      id: string
      first_name: string | null
      last_name: string | null
      roles: string[]
      students_id: string | null
    }>(
      `select p.id, p.first_name, p.last_name, p.roles, s.id as students_id
         from profiles p
         left join students s on s.profile_id = p.id
        where lower(p.email) = lower($1)`,
      [email]
    )
    if (rows.length === 0) {
      errors.push(`extra_student: ${email} not found`)
      continue
    }
    const p = rows[0]
    aux.push({
      kind: "extra_student",
      email,
      profile_id: p.id,
      roles_before: p.roles,
      first: p.first_name,
      last: p.last_name,
      grad_year: gradYearFromEmail(email),
      students_exists: p.students_id !== null,
    })
  }

  return { links, creates, skips, aux, errors }
}

async function applyPlan(
  client: Client,
  plan: Awaited<ReturnType<typeof buildPlan>>
) {
  // -------- Links: update profile + upsert students row --------------------
  for (const L of plan.links) {
    const newRoles = L.profile_roles.includes("student")
      ? L.profile_roles
      : [...L.profile_roles, "student"]

    // Patch profile. Only set first/last/display when currently null —
    // don't clobber M365-sourced values.
    await client.query(
      `update profiles
          set roles = $2::text[],
              gradelink_account_id = coalesce(gradelink_account_id, $3),
              first_name = coalesce(first_name, $4),
              last_name = coalesce(last_name, $5),
              display_name = coalesce(display_name, $6)
        where id = $1`,
      [
        L.profile_id,
        newRoles,
        L.entry.gradelink_account_id,
        L.entry.fname || null,
        L.entry.lname || null,
        L.entry.full_name || null,
      ]
    )

    const dob = safeBirthdate(L.entry.birthdate)
    const preferred = preferredFrom(L.entry.full_name)
    const grade = L.entry.grade_level || null

    if (L.students_row_exists) {
      // Don't clobber dob / current_grade if already set — but DO claim
      // the gradelink_student_id so subsequent runs find this row.
      await client.query(
        `update students
            set gradelink_student_id = coalesce(gradelink_student_id, $2),
                legal_first_name = coalesce(legal_first_name, $3),
                legal_last_name  = coalesce(legal_last_name, $4),
                preferred_name   = coalesce(preferred_name, $5),
                dob              = coalesce(dob, $6::date),
                current_grade    = coalesce(current_grade, $7)
          where profile_id = $1`,
        [
          L.profile_id,
          L.entry.gradelink_student_id,
          L.entry.fname || null,
          L.entry.lname || null,
          preferred,
          dob,
          grade,
        ]
      )
    } else {
      await client.query(
        `insert into students
           (profile_id, gradelink_student_id, legal_first_name,
            legal_last_name, preferred_name, dob, current_grade, status)
         values ($1, $2, $3, $4, $5, $6::date, $7, 'active')`,
        [
          L.profile_id,
          L.entry.gradelink_student_id,
          L.entry.fname,
          L.entry.lname,
          preferred,
          dob,
          grade,
        ]
      )
    }
  }

  // -------- Shared mailboxes ----------------------------------------------
  for (const a of plan.aux) {
    if (a.kind === "shared_mailbox") {
      await client.query(
        `update profiles set roles = $2::text[] where id = $1`,
        [a.profile_id, ["shared_mailbox"]]
      )
    } else if (a.kind === "active_teacher") {
      const nextRoles = a.roles_before.includes("faculty")
        ? a.roles_before
        : [...a.roles_before, "faculty"]
      await client.query(
        `update profiles set roles = $2::text[] where id = $1`,
        [a.profile_id, nextRoles]
      )
    } else if (a.kind === "inactive_teacher") {
      const nextRoles = a.roles_before.includes("faculty")
        ? a.roles_before
        : [...a.roles_before, "faculty"]
      await client.query(
        `update profiles set roles = $2::text[], active = false where id = $1`,
        [a.profile_id, nextRoles]
      )
    } else if (a.kind === "inactive_alumnus") {
      const nextRoles = a.roles_before.includes("student")
        ? a.roles_before
        : [...a.roles_before, "student"]
      await client.query(
        `update profiles set roles = $2::text[], active = false where id = $1`,
        [a.profile_id, nextRoles]
      )
    } else if (a.kind === "extra_student") {
      const nextRoles = a.roles_before.includes("student")
        ? a.roles_before
        : [...a.roles_before, "student"]
      await client.query(
        `update profiles set roles = $2::text[] where id = $1`,
        [a.profile_id, nextRoles]
      )
      if (!a.students_exists) {
        const grade =
          a.grad_year != null ? gradeFromGradYear(a.grad_year) : null
        await client.query(
          `insert into students
             (profile_id, legal_first_name, legal_last_name, current_grade,
              status)
           values ($1, $2, $3, $4, 'active')`,
          [a.profile_id, a.first ?? "", a.last ?? "", grade]
        )
      }
    }
  }
}

// ============================================================================
// Reports
// ============================================================================

function writePendingM365(plan: Awaited<ReturnType<typeof buildPlan>>) {
  const outPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-pending-m365.json"
  )
  const rows = plan.creates.map((c) => ({
    gradelink_student_id: c.entry.gradelink_student_id,
    gradelink_account_id: c.entry.gradelink_account_id,
    full_name: c.entry.full_name,
    legal_first_name: c.entry.fname,
    legal_last_name: c.entry.lname,
    preferred_name: preferredFrom(c.entry.full_name),
    grade_level: c.entry.grade_level,
    birthdate: safeBirthdate(c.entry.birthdate),
    desired_email: c.desired_email,
    grad_year: c.grad_year,
  }))
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        _meta: {
          generated: new Date().toISOString(),
          source: "scripts/gradelink-import-active.ts",
          count: rows.length,
        },
        pending: rows,
      },
      null,
      2
    ),
    "utf-8"
  )
  return outPath
}

function summarize(plan: Awaited<ReturnType<typeof buildPlan>>) {
  console.log("Active roster plan:")
  console.log(`  link   : ${plan.links.length}`)
  console.log(`  create : ${plan.creates.length}`)
  console.log(`  skip   : ${plan.skips.length}`)
  console.log(`Auxiliary:`)
  const auxCounts = { shared_mailbox: 0, active_teacher: 0, inactive_teacher: 0, inactive_alumnus: 0, extra_student: 0 }
  for (const a of plan.aux) auxCounts[a.kind] += 1
  console.log(`  shared_mailbox    : ${auxCounts.shared_mailbox}`)
  console.log(`  active_teacher    : ${auxCounts.active_teacher}`)
  console.log(`  inactive_teacher  : ${auxCounts.inactive_teacher}`)
  console.log(`  inactive_alumnus  : ${auxCounts.inactive_alumnus}`)
  console.log(`  extra_student     : ${auxCounts.extra_student}`)
  if (plan.errors.length > 0) {
    console.log(`\nERRORS (${plan.errors.length}):`)
    for (const e of plan.errors) console.log(`  - ${e}`)
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  loadEnvLocal()
  const { commit } = parseArgs()

  const approvalsPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-approvals.json"
  )
  if (!existsSync(approvalsPath)) {
    console.error(`Missing ${approvalsPath}. Run \`npm run gradelink:approvals\`.`)
    process.exit(2)
  }
  const approvals = JSON.parse(readFileSync(approvalsPath, "utf-8")) as Approvals

  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local")
    process.exit(2)
  }
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    const plan = await buildPlan(client, approvals)
    summarize(plan)

    if (plan.errors.length > 0) {
      console.log(`\nRefusing to apply: fix errors above and re-run.`)
      process.exitCode = 1
      return
    }

    const pendingPath = writePendingM365(plan)
    console.log(
      `\nPending M365 creation list: ${path.relative(process.cwd(), pendingPath)} (${plan.creates.length} students)`
    )

    if (!commit) {
      console.log("\nDry run only. Re-run with --commit to write to the DB.")
      return
    }

    console.log("\nApplying ...")
    await client.query("begin")
    try {
      await applyPlan(client, plan)
      await client.query("commit")
      console.log("OK — committed.")
    } catch (err) {
      await client.query("rollback")
      console.error(
        "ROLLBACK:",
        err instanceof Error ? err.message : err
      )
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
