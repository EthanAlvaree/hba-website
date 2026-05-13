"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import {
  addStudentTag,
  parentLinkUpdateSchema,
  profileContactUpdateSchema,
  removeStudentTag,
  studentAdminUpdateSchema,
  studentDemographicsUpdateSchema,
  updateParentLink,
  updateProfileContact,
  updateStudentAdmin,
  updateStudentDemographics,
  withdrawStudent,
  withdrawStudentInputSchema,
} from "@/lib/sis"
import { z } from "zod"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"
import {
  clearProfilePhoto,
  resyncProfilePhotoFromM365,
  setProfilePhotoFromBuffer,
} from "@/lib/profile-photos"
import {
  grantStudentPrereqOverride,
  revokeStudentPrereqOverride,
} from "@/lib/scheduler"
import { getServiceSupabase } from "@/lib/supabase-server"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateStudent(studentId: string) {
  revalidatePath("/admin/students")
  revalidatePath(`/admin/students/${studentId}`)
}

export async function updateStudentAdminAction(formData: FormData) {
  await assertAdmin()

  const parsed = studentAdminUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    current_grade: formData.get("current_grade") ?? "",
    registered_at_hba: formData.get("registered_at_hba") ?? "",
    internal_notes: formData.get("internal_notes") ?? "",
    assigned_to: formData.get("assigned_to") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Student update failed.")
  }

  await updateStudentAdmin(parsed.data)
  revalidateStudent(parsed.data.id)
  redirect(`/admin/students/${parsed.data.id}`)
}

export async function updateStudentDemographicsAction(formData: FormData) {
  await assertAdmin()

  const parsed = studentDemographicsUpdateSchema.safeParse({
    id: formData.get("id"),
    legal_first_name: formData.get("legal_first_name"),
    legal_middle_name: formData.get("legal_middle_name") ?? "",
    legal_last_name: formData.get("legal_last_name"),
    suffix: formData.get("suffix") ?? "",
    preferred_name: formData.get("preferred_name") ?? "",
    dob: formData.get("dob") ?? "",
    gender: formData.get("gender") ?? "",
    pronouns: formData.get("pronouns") ?? "",
    birthplace: formData.get("birthplace") ?? "",
    primary_language: formData.get("primary_language") ?? "",
    secondary_language: formData.get("secondary_language") ?? "",
    english_proficiency: formData.get("english_proficiency") ?? "",
    enrollment_type: formData.get("enrollment_type") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    address_city: formData.get("address_city") ?? "",
    address_region: formData.get("address_region") ?? "",
    address_postal_code: formData.get("address_postal_code") ?? "",
    address_country: formData.get("address_country") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Demographics update failed.")
  }

  await updateStudentDemographics(parsed.data)
  revalidateStudent(parsed.data.id)
  redirect(`/admin/students/${parsed.data.id}`)
}

// Parent contact edit from the student detail family card. The student_id
// hidden field tells us where to redirect back to.
export async function updateProfileContactAction(formData: FormData) {
  await assertAdmin()

  const parsed = profileContactUpdateSchema.safeParse({
    id: formData.get("id"),
    first_name: formData.get("first_name") ?? "",
    last_name: formData.get("last_name") ?? "",
    display_name: formData.get("display_name") ?? "",
    personal_email: formData.get("personal_email") ?? "",
    mobile_phone: formData.get("mobile_phone") ?? "",
    work_phone: formData.get("work_phone") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Contact update failed.")
  }

  await updateProfileContact(parsed.data)

  const studentId = formData.get("student_id")
  if (typeof studentId === "string" && studentId.length > 0) {
    revalidateStudent(studentId)
    redirect(`/admin/students/${studentId}`)
  }
  revalidatePath("/admin/profiles")
  redirect("/admin/profiles")
}

export async function updateParentLinkAction(formData: FormData) {
  await assertAdmin()

  const parsed = parentLinkUpdateSchema.safeParse({
    id: formData.get("id"),
    relationship: formData.get("relationship") ?? "",
    is_primary: formData.get("is_primary") === "on",
    is_homestay: formData.get("is_homestay") === "on",
    is_emergency_contact: formData.get("is_emergency_contact") === "on",
    can_view_grades: formData.get("can_view_grades") === "on",
    can_view_attendance: formData.get("can_view_attendance") === "on",
    can_receive_communications: formData.get("can_receive_communications") === "on",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Parent link update failed.")
  }

  await updateParentLink(parsed.data)

  const studentId = formData.get("student_id")
  if (typeof studentId === "string" && studentId.length > 0) {
    revalidateStudent(studentId)
    redirect(`/admin/students/${studentId}`)
  }
  redirect("/admin/students")
}

// Marks a student's post-enrollment file verified (or un-verified). Hits the
// table directly via the service-role client to avoid pulling in the bigger
// post-enrollment lib just for two-field updates.
const fileVerifySchema = z.object({
  student_id: z.uuid(),
  verified: z.coerce.boolean(),
})

export async function setPostEnrollmentVerifiedAction(formData: FormData) {
  const session = await assertAdmin()

  const parsed = fileVerifySchema.safeParse({
    student_id: formData.get("student_id"),
    verified: formData.get("verified") === "1",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Verify update failed.")
  }

  const supabase = getServiceSupabase()

  const patch = parsed.data.verified
    ? {
        admin_verified_at: new Date().toISOString(),
        admin_verified_by: session?.user?.email ?? null,
      }
    : { admin_verified_at: null, admin_verified_by: null }

  const { error } = await supabase
    .from("student_post_enrollment_data")
    .update(patch)
    .eq("student_id", parsed.data.student_id)

  if (error) {
    throw new Error(`Failed to update verification: ${error.message}`)
  }

  revalidateStudent(parsed.data.student_id)
  redirect(`/admin/students/${parsed.data.student_id}`)
}

export async function withdrawStudentAction(formData: FormData) {
  await assertAdmin()
  const parsed = withdrawStudentInputSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason") ?? "",
    withdraw_enrollments: formData.get("withdraw_enrollments") === "on",
  })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid withdrawal."
    throw new Error(msg)
  }
  const notifyFamily = formData.get("notify_family") === "on"

  const result = await withdrawStudent(parsed.data)

  // Optional family notification email. Best-effort: if Graph fails
  // the withdrawal is still recorded; admin can re-trigger from
  // /admin/messaging or just contact the family directly.
  let familyEmailSent = false
  let familyEmailRecipients: string[] = []
  if (notifyFamily) {
    try {
      const supabase = getServiceSupabase()
      const { data: contacts } = await supabase
        .from("parent_links")
        .select(
          `can_receive_communications,
           parent:profiles!parent_links_parent_profile_id_fkey(email, active)`
        )
        .eq("student_id", parsed.data.id)
        .eq("can_receive_communications", true)
        .returns<
          Array<{
            can_receive_communications: boolean
            parent: { email: string; active: boolean } | null
          }>
        >()
      const parentEmails = Array.from(
        new Set(
          (contacts ?? [])
            .filter((c) => c.parent && c.parent.active)
            .map((c) => c.parent!.email)
        )
      )
      if (parentEmails.length > 0) {
        const { sendWithdrawalNotificationToFamily } = await import("@/lib/graph")
        const studentName =
          [result.student.preferred_name, result.student.legal_last_name]
            .filter(Boolean)
            .join(" ") ||
          `${result.student.legal_first_name} ${result.student.legal_last_name}`
        await sendWithdrawalNotificationToFamily({
          studentName,
          withdrawnAt: result.student.withdrawn_at ?? new Date().toISOString().slice(0, 10),
          reason: parsed.data.reason,
          parentEmails,
        })
        familyEmailSent = true
        familyEmailRecipients = parentEmails
      }
    } catch (err) {
      console.error("Withdrawal family-notify email failed:", err)
    }
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.student_withdraw,
    target_kind: "student",
    target_id: parsed.data.id,
    details: {
      reason: parsed.data.reason,
      enrollments_withdrawn: result.enrollments_withdrawn,
      family_notified: familyEmailSent,
      family_email_recipients: familyEmailRecipients,
    },
  })

  revalidateStudent(parsed.data.id)
  redirect(
    `/admin/students/${parsed.data.id}?withdrawn=1${familyEmailSent ? "&family_notified=1" : ""}`
  )
}

export async function addStudentTagAction(formData: FormData) {
  const session = await assertAdmin()
  const studentId = String(formData.get("student_id") ?? "").trim()
  const tag = String(formData.get("tag") ?? "").trim()
  if (!studentId || !tag) {
    redirect(`/admin/students/${studentId || ""}`)
  }
  await addStudentTag(studentId, tag, session.user?.email ?? null)
  revalidateStudent(studentId)
  redirect(`/admin/students/${studentId}`)
}

export async function removeStudentTagAction(formData: FormData) {
  await assertAdmin()
  const studentId = String(formData.get("student_id") ?? "").trim()
  const tag = String(formData.get("tag") ?? "").trim()
  if (!studentId || !tag) {
    redirect(`/admin/students/${studentId || ""}`)
  }
  await removeStudentTag(studentId, tag)
  revalidateStudent(studentId)
  redirect(`/admin/students/${studentId}`)
}

export async function signOutStudentsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}

// ---- Profile photos ----

const profilePhotoFormSchema = z.object({
  profile_id: z.uuid(),
  student_id: z.uuid(),
})

export type ProfilePhotoResult =
  | {
      ok: true
      /** Optional note about the M365 two-way sync attempt — surfaced
       *  in the UI so the admin sees whether it propagated. */
      m365_sync?: "synced" | "skipped_permission" | "skipped_not_found" | "error"
      m365_message?: string
    }
  | { ok: false; error: string }

export async function uploadProfilePhotoAction(
  _prev: ProfilePhotoResult | null,
  formData: FormData
): Promise<ProfilePhotoResult> {
  await assertAdmin()

  const parsed = profilePhotoFormSchema.safeParse({
    profile_id: formData.get("profile_id"),
    student_id: formData.get("student_id"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Missing profile or student id." }
  }

  const file = formData.get("photo")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a photo to upload." }
  }

  // Look up the profile's email so we can ask setProfilePhotoFromBuffer
  // to also PUT the photo to M365. We use the same getServiceSupabase
  // pattern as the rest of this file.
  const { data: profile } = await getServiceSupabase()
    .from("profiles")
    .select("email")
    .eq("id", parsed.data.profile_id)
    .maybeSingle<{ email: string }>()

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await setProfilePhotoFromBuffer(
    parsed.data.profile_id,
    buffer,
    file.type,
    {
      email: profile?.email,
      pushToM365: true,
    }
  )
  if (!result.ok) return result

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.profile_photo_upload,
    target_kind: "profile",
    target_id: parsed.data.profile_id,
    details: {
      student_id: parsed.data.student_id,
      email: profile?.email ?? null,
      bytes: buffer.byteLength,
      mime: file.type,
      m365_sync: result.m365Push?.status ?? "not_attempted",
      m365_message: result.m365Push?.message ?? null,
    },
  })

  revalidateStudent(parsed.data.student_id)
  return {
    ok: true,
    m365_sync: result.m365Push?.status,
    m365_message: result.m365Push?.message,
  }
}

export type ResyncM365PhotoResult =
  | { ok: true; outcome: "synced" | "no_m365_photo" }
  | { ok: false; error: string }

export async function resyncM365PhotoAction(
  _prev: ResyncM365PhotoResult | null,
  formData: FormData
): Promise<ResyncM365PhotoResult> {
  await assertAdmin()
  const parsed = profilePhotoFormSchema.safeParse({
    profile_id: formData.get("profile_id"),
    student_id: formData.get("student_id"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Missing profile or student id." }
  }
  const result = await resyncProfilePhotoFromM365(parsed.data.profile_id)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.profile_photo_m365_resync,
    target_kind: "profile",
    target_id: parsed.data.profile_id,
    details: result.ok
      ? { outcome: result.outcome }
      : { ok: false, error: result.error },
  })
  if (result.ok) {
    revalidateStudent(parsed.data.student_id)
  }
  return result
}

export async function clearProfilePhotoAction(formData: FormData) {
  await assertAdmin()
  const parsed = profilePhotoFormSchema.safeParse({
    profile_id: formData.get("profile_id"),
    student_id: formData.get("student_id"),
  })
  if (!parsed.success) {
    throw new Error("Missing profile or student id.")
  }
  await clearProfilePhoto(parsed.data.profile_id)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.profile_photo_clear,
    target_kind: "profile",
    target_id: parsed.data.profile_id,
    details: { student_id: parsed.data.student_id },
  })
  revalidateStudent(parsed.data.student_id)
  redirect(`/admin/students/${parsed.data.student_id}`)
}

// ============================================================================
// Prereq overrides — let admins clear a specific course's prereqs
// for a single student. Used when a kid is ready to skip a level
// (e.g. transferred in mid-sequence, already taken at a prior school).
// ============================================================================

const grantPrereqOverrideSchema = z.object({
  student_id: z.uuid(),
  course_id: z.uuid(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

export async function grantStudentPrereqOverrideAction(formData: FormData) {
  const session = await assertAdmin()
  const parsed = grantPrereqOverrideSchema.safeParse({
    student_id: formData.get("student_id"),
    course_id: formData.get("course_id"),
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.")
  }

  const grantedBy = session.user?.email ?? "unknown"
  await grantStudentPrereqOverride({
    student_id: parsed.data.student_id,
    course_id: parsed.data.course_id,
    granted_by_email: grantedBy,
    notes: parsed.data.notes,
  })
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.student_prereq_override_grant,
    target_kind: "student",
    target_id: parsed.data.student_id,
    details: { course_id: parsed.data.course_id, notes: parsed.data.notes },
  })
  revalidateStudent(parsed.data.student_id)
  revalidatePath(`/portal/trajectory`)
  redirect(`/admin/students/${parsed.data.student_id}#prereq-overrides`)
}

const revokePrereqOverrideSchema = z.object({
  student_id: z.uuid(),
  course_id: z.uuid(),
})

export async function revokeStudentPrereqOverrideAction(formData: FormData) {
  await assertAdmin()
  const parsed = revokePrereqOverrideSchema.safeParse({
    student_id: formData.get("student_id"),
    course_id: formData.get("course_id"),
  })
  if (!parsed.success) {
    throw new Error("Invalid request.")
  }

  await revokeStudentPrereqOverride({
    student_id: parsed.data.student_id,
    course_id: parsed.data.course_id,
  })
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.student_prereq_override_revoke,
    target_kind: "student",
    target_id: parsed.data.student_id,
    details: { course_id: parsed.data.course_id },
  })
  revalidateStudent(parsed.data.student_id)
  revalidatePath(`/portal/trajectory`)
  redirect(`/admin/students/${parsed.data.student_id}#prereq-overrides`)
}
