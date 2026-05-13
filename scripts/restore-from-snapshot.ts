#!/usr/bin/env tsx
//
// scripts/restore-from-snapshot.ts
//
// Restore an SIS database from a JSON snapshot produced by
// lib/db-backup.ts. Reads the file, then writes each table's rows in
// foreign-key-safe order to whatever Supabase project the env vars
// HBA_SUPABASE_URL + HBA_SUPABASE_SERVICE_ROLE_KEY are pointed at.
//
// Defaults to dry-run (counts only, no writes). Pass --apply to
// actually upsert rows. Pass --only=<table[,table…]> to restore a
// subset.
//
// Idempotent: every insert is an upsert by id, so if you partially
// restore and rerun, rows already present are overwritten in place
// rather than duplicated. Safe to abort mid-restore and resume.
//
// Usage:
//   # Dry run (counts only)
//   npx tsx scripts/restore-from-snapshot.ts snapshot-2026-05-13.json
//
//   # Actually write
//   HBA_SUPABASE_URL=… HBA_SUPABASE_SERVICE_ROLE_KEY=… \
//     npx tsx scripts/restore-from-snapshot.ts \
//       snapshot-2026-05-13.json --apply
//
//   # Subset
//   npx tsx scripts/restore-from-snapshot.ts file.json \
//     --apply --only=profiles,students,parent_links

import { readFile } from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

// ============================================================================
// Restore order
// ============================================================================
//
// Tables are written in this order to respect foreign-key dependencies.
// Independents go first; tables that reference others come after their
// dependencies are in place.

const RESTORE_ORDER: readonly string[] = [
  // Independents (no FK to other restored tables)
  "profiles",
  "terms",
  "courses",
  "conference_events",
  "applications",
  "calendar_events",
  "graduation_requirements",
  "course_subject_assignments",

  // Depend on profiles + applications
  "application_documents",
  "students",

  // Depend on profiles + students
  "parent_links",
  "student_health_records",
  "student_post_enrollment_data",
  "student_documents",

  // Depend on profiles + courses
  "teacher_qualifications",
  "teacher_availability",
  "teacher_workload_preferences",

  // Depend on courses + terms (+ profiles)
  "course_sections",

  // Depend on course_sections + students
  "enrollments",
  "attendance_records",

  // Depend on course_sections
  "assignment_categories",
  "assignments",
  "section_announcements",
  "incidents",

  // Depend on assignments + enrollments
  "scores",

  // Depend on conference_events + profiles + students
  "conference_slots",

  // Depend on students + courses
  "student_course_requests",

  // Schedule-draft trio
  "schedule_drafts",
  "schedule_draft_sections",
  "schedule_draft_assignments",

  // Audit + ops (mostly independent, just nullable FKs to profiles)
  "admin_audit_log",
  "sent_mass_emails",
]

// ============================================================================
// CLI parsing
// ============================================================================

type Args = {
  snapshotPath: string
  apply: boolean
  only: Set<string> | null
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE)
    process.exit(0)
  }
  let snapshotPath: string | null = null
  let apply = false
  let only: Set<string> | null = null
  for (const arg of argv) {
    if (arg === "--apply") apply = true
    else if (arg.startsWith("--only=")) {
      only = new Set(arg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean))
    } else if (arg.startsWith("--")) {
      console.error(`Unknown flag: ${arg}`)
      console.error(USAGE)
      process.exit(2)
    } else if (!snapshotPath) {
      snapshotPath = arg
    } else {
      console.error(`Multiple positional args; expected one snapshot path.`)
      process.exit(2)
    }
  }
  if (!snapshotPath) {
    console.error("Missing snapshot path argument.")
    console.error(USAGE)
    process.exit(2)
  }
  return { snapshotPath, apply, only }
}

const USAGE = `
Usage: npx tsx scripts/restore-from-snapshot.ts <snapshot.json> [--apply] [--only=table1,table2]

  <snapshot.json>   Path to a snapshot file produced by lib/db-backup.ts.
  --apply           Actually upsert rows. Without this flag the script
                    reads the snapshot and prints per-table row counts
                    but writes nothing.
  --only=<list>     Restore only the listed tables (comma-separated).
                    Useful for "restore just this one table that got
                    corrupted" workflows.

Environment:
  HBA_SUPABASE_URL                  Target Supabase project URL.
  HBA_SUPABASE_SERVICE_ROLE_KEY     Service-role key for that project.

Notes:
  - Idempotent: each insert is an upsert by primary key, so partial
    restores can be safely re-run.
  - The script writes tables in FK-dependency order. If a row references
    a profile/student/section that wasn't in the snapshot, the upsert
    will fail; the script reports which row failed and continues.
`

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs()

  const url = process.env.HBA_SUPABASE_URL
  const key = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      "Missing HBA_SUPABASE_URL or HBA_SUPABASE_SERVICE_ROLE_KEY. See --help."
    )
    process.exit(2)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Read + parse the snapshot.
  const absPath = path.resolve(args.snapshotPath)
  console.log(`[restore] Reading snapshot from ${absPath}`)
  const raw = await readFile(absPath, "utf-8")
  let payload: { generated_at?: string; tables?: Record<string, unknown[]> }
  try {
    payload = JSON.parse(raw)
  } catch (err) {
    console.error(
      `[restore] Snapshot is not valid JSON: ${err instanceof Error ? err.message : err}`
    )
    process.exit(3)
  }
  const tables = payload.tables ?? {}
  if (Object.keys(tables).length === 0) {
    console.error("[restore] Snapshot has no `tables` field. Aborting.")
    process.exit(3)
  }
  console.log(
    `[restore] Snapshot generated_at: ${payload.generated_at ?? "(unknown)"}`
  )

  const willWrite = args.apply
  if (!willWrite) {
    console.log("[restore] DRY RUN — no rows will be written. Pass --apply to commit.")
  } else {
    console.log(`[restore] APPLY mode — writing to ${url}`)
  }

  let totalRows = 0
  let totalErrors = 0

  for (const tableName of RESTORE_ORDER) {
    if (args.only && !args.only.has(tableName)) continue
    const rows = tables[tableName] as Array<Record<string, unknown>> | undefined
    if (!rows) {
      console.log(`[${tableName}] (not in snapshot — skipping)`)
      continue
    }
    if (rows.length === 0) {
      console.log(`[${tableName}] 0 rows`)
      continue
    }

    if (!willWrite) {
      console.log(`[${tableName}] would upsert ${rows.length} row(s)`)
      totalRows += rows.length
      continue
    }

    // Upsert in chunks to avoid blowing past supabase-js / postgrest
    // payload size limits.
    const CHUNK = 500
    let inserted = 0
    let errored = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await supabase
        .from(tableName)
        .upsert(chunk, { onConflict: "id" })
      if (error) {
        errored += chunk.length
        console.error(
          `[${tableName}] chunk ${i}–${i + chunk.length} failed: ${error.message}`
        )
      } else {
        inserted += chunk.length
      }
    }
    console.log(
      `[${tableName}] ${inserted}/${rows.length} upserted${
        errored ? ` (${errored} errored)` : ""
      }`
    )
    totalRows += inserted
    totalErrors += errored
  }

  // Tables in the snapshot but NOT in RESTORE_ORDER — flag so we know
  // to expand the script next time the schema grows.
  const unknown = Object.keys(tables).filter(
    (t) => !RESTORE_ORDER.includes(t) && (tables[t]?.length ?? 0) > 0
  )
  if (unknown.length > 0) {
    console.warn(
      `[restore] WARNING: snapshot contains ${unknown.length} table(s) not in RESTORE_ORDER:`,
      unknown.join(", "),
      "— add them to RESTORE_ORDER in this script if they should be restored."
    )
  }

  console.log()
  console.log(
    willWrite
      ? `[restore] DONE. ${totalRows} row(s) upserted${totalErrors ? `, ${totalErrors} errored.` : "."}`
      : `[restore] DRY RUN COMPLETE. ${totalRows} row(s) would be written. Re-run with --apply to commit.`
  )
  if (totalErrors > 0) process.exit(1)
}

main().catch((err) => {
  console.error("[restore] FATAL:", err)
  process.exit(1)
})
