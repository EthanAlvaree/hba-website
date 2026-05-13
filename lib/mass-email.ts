// lib/mass-email.ts
//
// Office-side mass email: build a recipient list from cohort filters, then
// fire a Graph email through the existing sendCustomEmail helper. Used by
// /admin/messaging.
//
// Cohort filters (start simple, expand later):
//   - audience: "parents" | "students" | "faculty" | "active_families"
//   - grade: optional ("9", "10", "11", "12")
//   - section_id: optional (sent to parents OR students linked to this section)
//
// Active filter: only parents with can_receive_communications = true; only
// active profiles; only active students; only currently-enrolled students.

import "server-only"
import { sendCustomEmail } from "@/lib/graph"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

export type Audience =
  | "parents"
  | "students"
  | "faculty"
  | "active_families"
  | "all_school"

export type CohortFilters = {
  audience: Audience
  grade?: string | null
  section_id?: string | null
}

// Returns the deduplicated list of recipient emails for the given filters.
export async function resolveCohortEmails(
  filters: CohortFilters
): Promise<string[]> {
  const supabase = getSupabase()
  const emails = new Set<string>()

  if (filters.audience === "faculty") {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, roles, active")
      .eq("active", true)
      .returns<Array<{ email: string; roles: string[]; active: boolean }>>()
    if (error) throw new Error(error.message)
    for (const p of data ?? []) {
      if (p.roles.includes("faculty") || p.roles.includes("admin")) emails.add(p.email)
    }
    return [...emails]
  }

  if (filters.audience === "all_school") {
    // Everyone: faculty + admins + every active student + every parent_link
    // with comms enabled. Grade / section filters DO still apply to the
    // student + parent sides for things like "all-school but only the
    // upper school" — though typically all_school is used unscoped.
    const { data: profileRows, error: profileErr } = await supabase
      .from("profiles")
      .select("email, roles, active")
      .eq("active", true)
      .returns<Array<{ email: string; roles: string[]; active: boolean }>>()
    if (profileErr) throw new Error(profileErr.message)
    for (const p of profileRows ?? []) {
      if (p.roles.includes("faculty") || p.roles.includes("admin")) emails.add(p.email)
    }
    // Fall through to the student + parent collection logic below so the
    // grade / section filters still get applied if set.
  }

  // Parents / students / active_families: walk parent_links + students with
  // appropriate filters joined.
  let studentsQuery = supabase
    .from("students")
    .select("id, current_grade, status")
    .eq("status", "active")
  if (filters.grade) studentsQuery = studentsQuery.eq("current_grade", filters.grade)

  const { data: students, error: studentsError } = await studentsQuery.returns<
    Array<{ id: string; current_grade: string | null; status: string }>
  >()
  if (studentsError) throw new Error(studentsError.message)

  let studentIds = (students ?? []).map((s) => s.id)
  if (filters.section_id) {
    const { data: enrolledIds, error: enrolledError } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("section_id", filters.section_id)
      .in("status", ["enrolled", "audit"])
      .returns<Array<{ student_id: string }>>()
    if (enrolledError) throw new Error(enrolledError.message)
    const allowed = new Set((enrolledIds ?? []).map((e) => e.student_id))
    studentIds = studentIds.filter((id) => allowed.has(id))
  }
  if (studentIds.length === 0) return []

  if (
    filters.audience === "students" ||
    filters.audience === "active_families" ||
    filters.audience === "all_school"
  ) {
    const { data: studentProfiles } = await supabase
      .from("students")
      .select("profile:profiles(email, active)")
      .in("id", studentIds)
      .returns<Array<{ profile: { email: string; active: boolean } | null }>>()
    for (const row of studentProfiles ?? []) {
      if (row.profile?.active && row.profile.email) emails.add(row.profile.email)
    }
  }

  if (
    filters.audience === "parents" ||
    filters.audience === "active_families" ||
    filters.audience === "all_school"
  ) {
    const { data: links } = await supabase
      .from("parent_links")
      .select(
        `can_receive_communications,
         parent:profiles!parent_links_parent_profile_id_fkey(email, active)`
      )
      .in("student_id", studentIds)
      .eq("can_receive_communications", true)
      .returns<
        Array<{
          can_receive_communications: boolean
          parent: { email: string; active: boolean } | null
        }>
      >()
    for (const link of links ?? []) {
      if (link.parent?.active && link.parent.email) emails.add(link.parent.email)
    }
  }

  return [...emails]
}

// ============================================================================
// Dispatch (used by both the send-now action and the scheduled-send cron)
// ============================================================================

export type DispatchMassEmailInput = {
  audience: Audience
  grade: string | null
  section_id: string | null
  subject: string
  /** Full rendered HTML, footer + body, ready to send. The caller is
   *  responsible for composition (so preview = send byte-for-byte). */
  html_body: string
  /** Mailbox the email is sent AS. */
  sender_email: string
  sender_label: string
  /** Identity of who triggered the dispatch (for the audit / log row).
   *  For cron-driven sends, pass the admin who *scheduled* it. */
  by_email: string
  by_profile_id: string | null
}

export type DispatchMassEmailResult = {
  ok: boolean
  sent: number
  failed: number
  recipients_total: number
  failed_recipients: string[]
  /** PK of the row written to sent_mass_emails. Useful for follow-up
   *  audit hooks (e.g. linking a scheduled-mass-email row to its log). */
  sent_mass_email_id: string | null
  error?: string
}

// Resolve cohort → send one Graph call per recipient → write to
// sent_mass_emails. Returns counts so the caller can render the result
// (or log it from the cron).
export async function dispatchMassEmail(
  input: DispatchMassEmailInput
): Promise<DispatchMassEmailResult> {
  let emails: string[]
  try {
    emails = await resolveCohortEmails({
      audience: input.audience,
      grade: input.grade,
      section_id: input.section_id,
    })
  } catch (error) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      recipients_total: 0,
      failed_recipients: [],
      sent_mass_email_id: null,
      error: error instanceof Error ? error.message : "Resolve failed.",
    }
  }
  if (emails.length === 0) {
    return {
      ok: false,
      sent: 0,
      failed: 0,
      recipients_total: 0,
      failed_recipients: [],
      sent_mass_email_id: null,
      error: "Cohort filter produced zero recipients.",
    }
  }

  let sent = 0
  let failed = 0
  const failedAddrs: string[] = []
  for (const email of emails) {
    try {
      await sendCustomEmail({
        subject: input.subject,
        htmlBody: input.html_body,
        toRecipients: [email],
        fromMailbox: input.sender_email,
      })
      sent += 1
    } catch (error) {
      failed += 1
      failedAddrs.push(email)
      console.error(`mass-email send to ${email} failed`, error)
    }
  }

  // Write to sent_mass_emails. Failure here is non-fatal — emails went
  // out, just no history row.
  let sentMassEmailId: string | null = null
  try {
    const { data } = await getSupabase()
      .from("sent_mass_emails")
      .insert({
        sender_email: input.sender_email,
        sender_label: input.sender_label,
        cohort_audience: input.audience,
        cohort_grade: input.grade,
        cohort_section_id: input.section_id,
        subject: input.subject,
        body_html: input.html_body,
        recipient_count: emails.length,
        recipients: emails,
        sent_count: sent,
        failed_count: failed,
        failed_recipients: failedAddrs,
        sent_by_email: input.by_email,
        sent_by_profile_id: input.by_profile_id,
      })
      .select("id")
      .single<{ id: string }>()
    sentMassEmailId = data?.id ?? null
  } catch (error) {
    console.error("Failed to log sent mass email:", error)
  }

  return {
    ok: true,
    sent,
    failed,
    recipients_total: emails.length,
    failed_recipients: failedAddrs,
    sent_mass_email_id: sentMassEmailId,
  }
}
