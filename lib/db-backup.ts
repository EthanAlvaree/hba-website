// lib/db-backup.ts
//
// Weekly full-database snapshot. Pulls every high-value table via the
// service-role client, concatenates into a single JSON document, and
// uploads to the "db-backups" Supabase Storage bucket with a timestamped
// path. This is a defense-in-depth backup on top of Supabase's own
// daily snapshots — if Supabase ever loses or rolls back the project,
// the snapshot in their Storage bucket still gives us a path back.
//
// The output is plain JSON: { generated_at, schema_hash, tables: { name: rows[] } }.
// At HBA's scale (a single school) the entire snapshot fits in well
// under 10 MB. If the school ever scales to thousands of attendance
// rows per day, switch to per-table NDJSON files in the same bucket.
//
// Retention: keep the most recent N snapshots, delete older. Avoids the
// bucket growing unboundedly without us noticing.

import "server-only"
import { getServiceSupabase } from "@/lib/supabase-server"

const BUCKET = "db-backups"
const KEEP_LATEST = 12 // ~3 months of weekly snapshots

// Tables to include in the snapshot. Listed explicitly (not introspected)
// so a future table addition gets a deliberate decision: do we back it
// up, or is it ephemeral state? Per-table filters (e.g. "only recent
// rate-limit hits") can go here too.
const TABLES: readonly string[] = [
  "applications",
  "application_documents",
  "profiles",
  "students",
  "parent_links",
  "terms",
  "courses",
  "course_sections",
  "enrollments",
  "assignment_categories",
  "assignments",
  "scores",
  "attendance_records",
  "student_post_enrollment_data",
  "student_documents",
  "teacher_qualifications",
  "teacher_availability",
  "teacher_workload_preferences",
  "graduation_requirements",
  "course_subject_assignments",
  "student_course_requests",
  "schedule_drafts",
  "schedule_draft_sections",
  "schedule_draft_assignments",
  "admin_audit_log",
  "calendar_events",
  "incidents",
  "student_health_records",
  "section_announcements",
  "conference_events",
  "conference_slots",
  "sent_mass_emails",
] as const

export type BackupResult = {
  ok: true
  path: string
  size_bytes: number
  table_counts: Record<string, number>
  retained: number
  deleted: number
}

export async function runDatabaseBackup(): Promise<BackupResult> {
  const supabase = getServiceSupabase()
  const now = new Date()
  const stamp = now.toISOString().replace(/[:.]/g, "-")
  const path = `snapshot-${stamp}.json`

  const tables: Record<string, unknown[]> = {}
  const tableCounts: Record<string, number> = {}

  // Sequential by design. Vercel cron has a comfortable timeout and we
  // don't need to hammer Supabase with 30 parallel selects on a tiny
  // school dataset.
  for (const name of TABLES) {
    const { data, error } = await supabase.from(name).select("*")
    if (error) {
      throw new Error(`Backup failed pulling ${name}: ${error.message}`)
    }
    tables[name] = data ?? []
    tableCounts[name] = data?.length ?? 0
  }

  const payload = {
    generated_at: now.toISOString(),
    table_counts: tableCounts,
    tables,
  }

  const json = JSON.stringify(payload)
  const buffer = Buffer.from(json, "utf-8")

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "application/json",
      upsert: false,
    })
  if (uploadError) {
    throw new Error(`Backup upload failed: ${uploadError.message}`)
  }

  // Prune old snapshots.
  let deleted = 0
  try {
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list("", { limit: 1000, sortBy: { column: "name", order: "desc" } })
    if (existing) {
      // The list is sorted name-desc; since our names start with an ISO
      // timestamp, name-desc = newest-first. Keep the first KEEP_LATEST,
      // delete the rest.
      const snapshots = existing
        .filter((f) => f.name.startsWith("snapshot-") && f.name.endsWith(".json"))
      const toDelete = snapshots.slice(KEEP_LATEST).map((f) => f.name)
      if (toDelete.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BUCKET)
          .remove(toDelete)
        if (removeError) {
          console.error("Backup retention cleanup failed:", removeError.message)
        } else {
          deleted = toDelete.length
        }
      }
    }
  } catch (err) {
    console.error("Backup retention cleanup threw:", err)
    // Non-fatal: the snapshot itself succeeded.
  }

  return {
    ok: true,
    path,
    size_bytes: buffer.byteLength,
    table_counts: tableCounts,
    retained: Math.min(KEEP_LATEST, Object.keys(tableCounts).length > 0 ? 1 + deleted : 0),
    deleted,
  }
}
