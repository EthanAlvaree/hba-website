// Admin audit log.
//
// Centralized helper for "record what an admin just did." Used by every
// sensitive admin server action (promote/demote, delete profile, lock term,
// commit schedule draft, bulk parent-link import). The table is defined in
// migration 0010-admin-audit-log.sql.
//
// Design notes:
// - Logging is best-effort. We never throw if the audit insert fails —
//   that would block legitimate admin actions when the audit table is in
//   trouble, which is worse than a missing row. We do log to the server
//   console so the failure isn't silent.
// - Actor email is the canonical identity (resilient to profile deletion).
//   actor_profile_id is a convenience FK.
// - `action` is free-form text. Conventions: lowercase, dotted hierarchy
//   ("admin.promote", "term.lock", "schedule_draft.commit"). See
//   ADMIN_AUDIT_ACTIONS for the canonical list — extend as needed.

import { headers } from "next/headers"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

export const ADMIN_AUDIT_ACTIONS = {
  admin_promote: "admin.promote",
  admin_demote: "admin.demote",
  profile_delete: "profile.delete",
  profile_roles_update: "profile.roles_update",
  profile_active_update: "profile.active_update",
  term_lock: "term.lock",
  term_unlock: "term.unlock",
  section_grades_lock: "section.grades_lock",
  section_grades_unlock: "section.grades_unlock",
  schedule_draft_commit: "schedule_draft.commit",
  schedule_draft_discard: "schedule_draft.discard",
  parent_links_bulk_import: "parent_links.bulk_import",
  m365_sync_manual: "m365_sync.manual",
  incident_create: "incident.create",
  incident_delete: "incident.delete",
  calendar_event_create: "calendar_event.create",
  calendar_event_update: "calendar_event.update",
  calendar_event_delete: "calendar_event.delete",
  // Gradebook (teachers + admins). Sensitive enough to audit even on the
  // happy path — these mutate the academic record.
  gradebook_category_create: "gradebook.category_create",
  gradebook_category_update: "gradebook.category_update",
  gradebook_category_delete: "gradebook.category_delete",
  gradebook_categories_seed_defaults: "gradebook.categories_seed_defaults",
  gradebook_assignment_create: "gradebook.assignment_create",
  gradebook_assignment_update: "gradebook.assignment_update",
  gradebook_assignment_delete: "gradebook.assignment_delete",
  gradebook_scores_save: "gradebook.scores_save",
  // Attendance (teachers + admins).
  attendance_save_day: "attendance.save_day",
  attendance_save_week: "attendance.save_week",
  // Health (admin-only). Medical records — strong audit posture required.
  health_record_upsert: "health_record.upsert",
  // Profile photos.
  profile_photo_bulk_upload: "profile_photo.bulk_upload",
  profile_photo_upload: "profile_photo.upload",
  profile_photo_clear: "profile_photo.clear",
  profile_photo_m365_resync: "profile_photo.m365_resync",
  // Student lifecycle.
  student_enroll: "student.enroll",
  student_withdraw: "student.withdraw",
  student_record_create_manual: "student.record_create_manual",
  student_prereq_override_grant: "student.prereq_override_grant",
  student_prereq_override_revoke: "student.prereq_override_revoke",
  student_availability_admin_edit: "student.availability_admin_edit",
  parent_link_create_manual: "parent_link.create_manual",
  course_request_admin_edit: "course_request.admin_edit",
  // Transfer / external coursework — mutates the cumulative transcript.
  academic_history_create: "academic_history.create",
  academic_history_update: "academic_history.update",
  academic_history_delete: "academic_history.delete",
  // Faculty bios.
  faculty_bio_seed: "faculty_bio.seed",
  faculty_bio_bulk_seed: "faculty_bio.bulk_seed",
  faculty_bio_admin_edit: "faculty_bio.admin_edit",
  faculty_portrait_bulk_seed: "faculty_portrait.bulk_seed",
} as const
export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS]

export type AdminAuditEventInput = {
  action: AdminAuditAction | string
  target_kind?: string | null
  target_id?: string | null
  details?: Record<string, unknown> | null
  /** Override actor email when there is no admin session — e.g. the Stripe
   *  webhook auto-enrolling a student after payment. Conventional values:
   *  "system:stripe-webhook", "system:cron:<name>". When omitted, the
   *  current admin session supplies the actor. */
  actorEmail?: string
}

export type AdminAuditRecord = {
  id: string
  created_at: string
  actor_email: string
  actor_profile_id: string | null
  action: string
  target_kind: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
}

// Records one admin audit event. Best-effort: failures are logged to the
// server console but never thrown. Always call from inside a server action
// (we read the current session + request headers).
export async function logAdminAuditEvent(input: AdminAuditEventInput): Promise<void> {
  try {
    let actorEmail = input.actorEmail?.toLowerCase() ?? null
    if (!actorEmail) {
      const session = await auth()
      actorEmail = session?.user?.email?.toLowerCase() ?? null
    }
    if (!actorEmail) return

    let actorProfileId: string | null = null
    // Skip profile lookup for synthetic system actors (no profile row exists
    // for "system:stripe-webhook" etc.); the actor_email is the canonical id.
    if (!actorEmail.startsWith("system:")) {
      try {
        const profile = await getProfileByEmail(actorEmail)
        actorProfileId = profile?.id ?? null
      } catch {
        // Profile lookup is best-effort.
      }
    }

    let ip: string | null = null
    let userAgent: string | null = null
    try {
      const h = await headers()
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null
      userAgent = h.get("user-agent") ?? null
    } catch {
      // headers() is only available inside server actions / route handlers.
    }

    const { error } = await getSupabase().from("admin_audit_log").insert({
      actor_email: actorEmail,
      actor_profile_id: actorProfileId,
      action: input.action,
      target_kind: input.target_kind ?? null,
      target_id: input.target_id ?? null,
      details: input.details ?? null,
      ip,
      user_agent: userAgent,
    })

    if (error) {
      console.error("Audit log insert failed:", error.message, { input })
    }
  } catch (error) {
    console.error("Audit log helper threw:", error)
  }
}

// ============================================================================
// Reads (used by /admin/audit-log)
// ============================================================================

export type AdminAuditFilters = {
  action?: string
  actor_email?: string
  target_kind?: string
  target_id?: string
  /** ISO date (YYYY-MM-DD) — events with created_at >= this date (00:00 Pacific). */
  date_from?: string
  /** ISO date (YYYY-MM-DD) — events with created_at < this date + 1 day. */
  date_to?: string
  limit?: number
}

// Pacific midnight expressed as UTC. April-Nov is UTC-7 (PDT); Nov-Mar
// is UTC-8 (PST). Approximated to -08:00 since the filter is a coarse
// "events from this day" bound; a one-hour drift around DST boundaries
// is acceptable for audit-log search.
function pacificDayBoundToUtc(date: string, kind: "start" | "endExclusive"): string {
  // Build a UTC timestamp anchored at midnight Pacific on that calendar day.
  const offsetHours = 8 // treat as PST (winter); summer events get a 1h drift
  const [y, m, d] = date.split("-").map((s) => parseInt(s, 10))
  if (!y || !m || !d) return date
  const dt = new Date(Date.UTC(y, m - 1, d, offsetHours, 0, 0))
  if (kind === "endExclusive") {
    dt.setUTCDate(dt.getUTCDate() + 1)
  }
  return dt.toISOString()
}

export async function listAdminAuditEvents(
  filters: AdminAuditFilters = {}
): Promise<AdminAuditRecord[]> {
  let query = getSupabase()
    .from("admin_audit_log")
    .select(
      "id, created_at, actor_email, actor_profile_id, action, target_kind, target_id, details, ip, user_agent"
    )
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200)

  if (filters.action) {
    query = query.eq("action", filters.action)
  }
  if (filters.actor_email) {
    query = query.eq("actor_email", filters.actor_email.toLowerCase())
  }
  if (filters.target_kind) {
    query = query.eq("target_kind", filters.target_kind)
  }
  if (filters.target_id) {
    query = query.eq("target_id", filters.target_id)
  }
  if (filters.date_from) {
    query = query.gte("created_at", pacificDayBoundToUtc(filters.date_from, "start"))
  }
  if (filters.date_to) {
    query = query.lt("created_at", pacificDayBoundToUtc(filters.date_to, "endExclusive"))
  }

  const { data, error } = await query.returns<AdminAuditRecord[]>()
  if (error) {
    throw new Error(`Failed to list audit events: ${error.message}`)
  }
  return data
}

// Distinct list of action codes that have ever been recorded — used to
// populate the filter dropdown in the viewer.
export async function listAuditActionCodes(): Promise<string[]> {
  // Supabase doesn't have a distinct() on raw query, so pull the most recent
  // 1000 rows and de-dup in app code. The cardinality of action codes is
  // tiny (well under 30), so this is fine.
  const { data, error } = await getSupabase()
    .from("admin_audit_log")
    .select("action")
    .order("created_at", { ascending: false })
    .limit(1000)
    .returns<Array<{ action: string }>>()

  if (error) {
    throw new Error(`Failed to list audit action codes: ${error.message}`)
  }
  return Array.from(new Set((data ?? []).map((r) => r.action))).sort()
}
