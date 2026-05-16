// lib/enrollment.ts
//
// End-to-end enrollment for an applied/paid student. Wraps the existing
// graph + sis primitives so:
//   - the Stripe webhook can auto-enroll on payment
//   - the /apply/success defensive page can do the same backup pass
//   - the admin Enroll form keeps the human-in-the-loop entry point
//
// Each underlying step is idempotent, so retries from any of these callers
// are safe.

import {
  getApplicationById,
  type ApplicationRecord,
} from "@/lib/applications"
import {
  provisionStudentM365Account,
  sendEnrollmentWelcomeToFamily,
  studentUpnFromApplication,
  type ProvisionResult,
} from "@/lib/graph"
import {
  enrollAcceptedApplication,
  getProfileByEmail,
  getStudentByApplicationId,
  getStudentByProfileId,
  type EnrollApplicationResult,
} from "@/lib/sis"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

export type ProvisionAndEnrollResult = {
  enrolled: EnrollApplicationResult
  provision: ProvisionResult
  welcomeEmailSent: boolean
  upn: string
}

/** Calendar year of the fall a current applicant enters HBA. Rolling
 *  admissions in spring (Jan-Jun) are for *that* fall (e.g. May 2026
 *  → fall 2026). Applications submitted in fall (Jul-Dec) are usually
 *  for the *next* fall (e.g. Oct 2026 → fall 2027). */
export function defaultEnrollmentYear(now = new Date()): number {
  const year = now.getFullYear()
  return now.getMonth() < 6 ? year : year + 1
}

// Picks the next available f.l.YY UPN by walking the Supabase profiles
// table. If the base UPN is unclaimed → use it. If claimed by an orphan
// profile or this same application's existing student → reuse. Otherwise
// try f.l.YY.2, .3, … up to 20 before giving up.
async function pickAvailableStudentUpn(
  application: Pick<
    ApplicationRecord,
    | "id"
    | "student_first_name"
    | "student_last_name"
    | "student_desired_grade"
    | "student_current_grade"
  >,
  enrollmentYear: number
): Promise<string> {
  const base = studentUpnFromApplication(application, enrollmentYear)
  const atIndex = base.indexOf("@")
  if (atIndex < 0) return base
  const local = base.slice(0, atIndex)
  const domain = base.slice(atIndex + 1)

  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = attempt === 1 ? base : `${local}.${attempt}@${domain}`
    const existingProfile = await getProfileByEmail(candidate)
    if (!existingProfile) return candidate
    const linkedStudent = await getStudentByProfileId(existingProfile.id)
    if (!linkedStudent || linkedStudent.application_id === application.id) {
      return candidate
    }
  }
  throw new Error(
    `Couldn't pick a unique HBA email for application ${application.id} ` +
      `after 20 attempts. Manual enrollment needed.`
  )
}

// Direct-write status flip used by the auto-enroll path. The full
// updateApplicationStatus helper would also reset internal_notes /
// assigned_to to null when those aren't passed; this preserves them.
async function markApplicationAcceptedPriorToEnroll(applicationId: string) {
  const { error } = await getSupabase()
    .from("applications")
    .update({
      status: "accepted",
      admit_decision_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
  if (error) {
    throw new Error(`Failed to mark application accepted: ${error.message}`)
  }
}

export async function provisionAndEnrollFromApplication(input: {
  application: ApplicationRecord
  /** Override the auto-generated UPN. Used by the admin Enroll form. */
  studentHbaEmail?: string
  /** ISO date for `students.registered_at_hba`. Defaults to today. */
  registeredAt?: string
  /** Actor email for the audit log. Pass "system:stripe-webhook" (or
   *  similar) when called outside an admin session. */
  actorEmail?: string
}): Promise<ProvisionAndEnrollResult> {
  const { registeredAt, actorEmail } = input
  let application = input.application

  // If somebody already enrolled this application (admin click), reuse the
  // existing student's UPN — no need to generate a new one or re-provision.
  const existingStudent = await getStudentByApplicationId(application.id)

  let upn: string
  if (input.studentHbaEmail) {
    upn = input.studentHbaEmail.trim().toLowerCase()
  } else if (existingStudent) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("email")
      .eq("id", existingStudent.profile_id)
      .single<{ email: string }>()
    if (error || !data?.email) {
      throw new Error(
        `Existing student profile has no email; rerun enrollment manually.`
      )
    }
    upn = data.email
  } else {
    upn = await pickAvailableStudentUpn(application, defaultEnrollmentYear())
  }

  if (application.status !== "accepted" && application.status !== "enrolled") {
    await markApplicationAcceptedPriorToEnroll(application.id)
    const refreshed = await getApplicationById(application.id)
    if (refreshed) application = refreshed
  }

  const displayName =
    [application.student_first_name, application.student_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || upn

  const provision = await provisionStudentM365Account({ upn, displayName })

  const enrolled = await enrollAcceptedApplication({
    application_id: application.id,
    student_hba_email: upn,
    registered_at_hba: registeredAt,
  })

  let welcomeEmailSent = false
  try {
    await sendEnrollmentWelcomeToFamily({
      application,
      studentHbaEmail: upn,
      tempPassword: provision.tempPassword,
    })
    welcomeEmailSent = true
  } catch (err) {
    console.error("[enrollment] welcome email failed", err)
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.student_enroll,
    target_kind: "student",
    target_id: enrolled.student.id,
    actorEmail,
    details: {
      application_id: application.id,
      student_hba_email: upn,
      m365_account_created: provision.created,
      welcome_email_sent: welcomeEmailSent,
      triggered_by: actorEmail ?? "admin-session",
    },
  })

  return { enrolled, provision, welcomeEmailSent, upn }
}
