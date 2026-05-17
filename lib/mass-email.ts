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

// Each Audience represents a discrete address book the office can
// target. Mass emails accept an *array* of these (multi-select on the
// composer) and union the resulting recipients. There used to be
// 'active_families' / 'all_school' convenience values; both are
// derivable from selecting multiple checkboxes now, so they're gone.
//
// students_hba   → student profile.email (the @hba M365 account).
// students_personal → student profile.personal_email (the alt the
//                    family supplied on the application; usually a
//                    Gmail/Outlook). Used during enrollment paperwork
//                    or whenever the @hba mailbox isn't checked.
// parents        → linked parent_links with comms enabled.
// faculty        → active profiles with the faculty or admin role.
export type Audience =
  | "parents"
  | "students_hba"
  | "students_personal"
  | "faculty"

export type CohortFilters = {
  audiences: Audience[]
  grade?: string | null
  section_id?: string | null
  /** Individual recipient emails — typed/pasted into the messaging
   *  composer's "Add individual recipients" textarea. Merged into the
   *  same dedup set as the audience-derived addresses. */
  extraEmails?: string[]
}

// Returns the deduplicated list of recipient emails for the given filters.
export async function resolveCohortEmails(
  filters: CohortFilters
): Promise<string[]> {
  const supabase = getSupabase()
  const emails = new Set<string>()
  const audiences = new Set(filters.audiences ?? [])

  // ---- Faculty (no student-side filtering) ----
  if (audiences.has("faculty")) {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, roles, active")
      .eq("active", true)
      .returns<Array<{ email: string; roles: string[]; active: boolean }>>()
    if (error) throw new Error(error.message)
    for (const p of data ?? []) {
      if (p.roles.includes("faculty") || p.roles.includes("admin")) emails.add(p.email)
    }
  }

  // ---- Student-side audiences: parents / students_hba / students_personal ----
  const needsStudents =
    audiences.has("parents") ||
    audiences.has("students_hba") ||
    audiences.has("students_personal")

  if (needsStudents) {
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

    if (studentIds.length > 0) {
      if (audiences.has("students_hba") || audiences.has("students_personal")) {
        const { data: studentProfiles } = await supabase
          .from("students")
          .select(
            "profile:profiles(email, personal_email, active)"
          )
          .in("id", studentIds)
          .returns<
            Array<{
              profile: {
                email: string
                personal_email: string | null
                active: boolean
              } | null
            }>
          >()
        for (const row of studentProfiles ?? []) {
          if (!row.profile?.active) continue
          if (audiences.has("students_hba") && row.profile.email) {
            emails.add(row.profile.email)
          }
          if (audiences.has("students_personal") && row.profile.personal_email) {
            emails.add(row.profile.personal_email)
          }
        }
      }

      if (audiences.has("parents")) {
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
    }
  }

  // ---- Individual extra recipients (admin-curated) ----
  for (const raw of filters.extraEmails ?? []) {
    const trimmed = raw.trim().toLowerCase()
    if (trimmed.length > 0 && trimmed.includes("@")) emails.add(trimmed)
  }

  return [...emails]
}

// ============================================================================
// Dispatch (used by both the send-now action and the scheduled-send cron)
// ============================================================================

export type DispatchMassEmailInput = {
  audiences: Audience[]
  grade: string | null
  section_id: string | null
  extra_emails: string[]
  subject: string
  /** Full rendered HTML, footer + body, ready to send. The caller is
   *  responsible for composition (so preview = send byte-for-byte). */
  html_body: string
  /** Optional admin signature appended to every send — the office's
   *  "this came from a real person" affordance even though the From:
   *  line is the shared mailbox. Null skips the append. */
  signature_html?: string | null
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
      audiences: input.audiences,
      grade: input.grade,
      section_id: input.section_id,
      extraEmails: input.extra_emails,
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
        signatureHtml: input.signature_html,
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
        // Existing column is a single text. Store the audience list as
        // a comma-separated value so we don't need a schema change just
        // for the multi-select UI. + an "extras" marker when individual
        // recipients were also tacked on, so logs show that nuance.
        cohort_audience: [
          ...input.audiences,
          ...(input.extra_emails.length > 0 ? ["extras"] : []),
        ].join(","),
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
