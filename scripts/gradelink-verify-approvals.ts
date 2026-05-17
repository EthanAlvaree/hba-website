#!/usr/bin/env tsx
//
// Sanity-checks the approvals JSON against the live DB:
//   - every "link" decision points at an email that actually exists
//     in the profiles table
//   - every shared_mailbox / teacher / alumnus / extra_active_student
//     email exists too
//   - flags anything missing so we can fix typos before the importer
//     runs.
//
// Read-only. Run after `npm run gradelink:approvals`.

import { Client } from "pg"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

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

type Approvals = {
  active_roster: Array<{
    decision: "link" | "create" | "skip"
    match_email: string | null
    full_name: string
  }>
  shared_mailboxes: string[]
  active_teachers: Array<{ email: string; name: string }>
  inactive_teachers: Array<{ email: string; name: string }>
  inactive_alumni: Array<{ email: string; name: string }>
  extra_active_students: string[]
}

async function main() {
  loadEnvLocal()
  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error("Missing DATABASE_URL in .env.local")
    process.exit(2)
  }

  const approvalsPath = path.resolve(
    process.cwd(),
    "scripts",
    ".gradelink-approvals.json"
  )
  if (!existsSync(approvalsPath)) {
    console.error(
      `Missing ${approvalsPath}. Run \`npm run gradelink:approvals\` first.`
    )
    process.exit(2)
  }
  const approvals = JSON.parse(readFileSync(approvalsPath, "utf-8")) as Approvals

  // Collect every email the JSON expects to find in profiles.
  const expectedEmails = new Set<string>()
  const labels = new Map<string, string>() // email -> human label

  for (const e of approvals.active_roster) {
    if (e.decision === "link" && e.match_email) {
      expectedEmails.add(e.match_email.toLowerCase())
      labels.set(e.match_email.toLowerCase(), `Gradelink link: ${e.full_name}`)
    }
  }
  for (const m of approvals.shared_mailboxes) {
    expectedEmails.add(m.toLowerCase())
    labels.set(m.toLowerCase(), "Shared mailbox")
  }
  for (const t of approvals.active_teachers) {
    expectedEmails.add(t.email.toLowerCase())
    labels.set(t.email.toLowerCase(), `Active teacher: ${t.name}`)
  }
  for (const t of approvals.inactive_teachers) {
    expectedEmails.add(t.email.toLowerCase())
    labels.set(t.email.toLowerCase(), `Inactive teacher: ${t.name}`)
  }
  for (const a of approvals.inactive_alumni) {
    expectedEmails.add(a.email.toLowerCase())
    labels.set(a.email.toLowerCase(), `Inactive alumnus: ${a.name}`)
  }
  for (const s of approvals.extra_active_students) {
    expectedEmails.add(s.toLowerCase())
    labels.set(s.toLowerCase(), `Extra async-online student`)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  let foundEmails: Set<string>
  try {
    const { rows } = await client.query<{ email: string }>(
      `select email from profiles where lower(email) = any($1::text[])`,
      [Array.from(expectedEmails)]
    )
    foundEmails = new Set(rows.map((r) => r.email.toLowerCase()))
  } finally {
    await client.end()
  }

  const missing: { email: string; label: string }[] = []
  for (const e of expectedEmails) {
    if (!foundEmails.has(e)) {
      missing.push({ email: e, label: labels.get(e) ?? "" })
    }
  }

  console.log(`Expected emails in profiles: ${expectedEmails.size}`)
  console.log(`Found:                     ${foundEmails.size}`)
  console.log(`Missing:                   ${missing.length}`)
  if (missing.length > 0) {
    console.log("")
    console.log("Missing entries (these emails are in the approvals JSON but")
    console.log("don't exist in profiles — fix the typo or pick the right one):")
    for (const m of missing) {
      console.log(`  - ${m.email}   (${m.label})`)
    }
    process.exitCode = 1
  } else {
    console.log("")
    console.log("OK — every approval-target email exists in profiles.")
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
