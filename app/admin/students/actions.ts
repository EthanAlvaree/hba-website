"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import {
  createParentLinkForStudent,
  createParentLinkSchema,
  deleteProfile,
  deleteStudent,
  parentLinkUpdateSchema,
  profileContactUpdateSchema,
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
import {
  academicHistoryCreateSchema,
  academicHistoryUpdateSchema,
  createAcademicHistoryEntry,
  deleteAcademicHistoryEntry,
  getAcademicHistoryStudentId,
  updateAcademicHistoryEntry,
} from "@/lib/academic-history"
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
    redirect(`/admin/students/${studentId}?profile_saved=1`)
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

// Manually attach a parent/guardian to an existing student. Used for
// the bulk of HBA's roster — students who enrolled years ago with no
// application on file, so the Enroll workflow never built their
// parent_links. Find-or-creates the parent profile by email.
export async function addParentLinkAction(formData: FormData) {
  await assertAdmin()

  const parsed = createParentLinkSchema.safeParse({
    student_id: formData.get("student_id"),
    parent_email: formData.get("parent_email"),
    parent_first_name: formData.get("parent_first_name") ?? "",
    parent_last_name: formData.get("parent_last_name") ?? "",
    parent_mobile_phone: formData.get("parent_mobile_phone") ?? "",
    relationship: formData.get("relationship") ?? "",
    is_primary: formData.get("is_primary") === "on",
    is_homestay: formData.get("is_homestay") === "on",
    is_emergency_contact: formData.get("is_emergency_contact") === "on",
    can_view_grades: formData.get("can_view_grades") === "on",
    can_view_attendance: formData.get("can_view_attendance") === "on",
    can_receive_communications:
      formData.get("can_receive_communications") === "on",
  })
  if (!parsed.success) {
    redirect(
      `/admin/students/${formData.get("student_id") ?? ""}?parent_link_error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Invalid request."
      )}`
    )
  }

  try {
    const link = await createParentLinkForStudent(parsed.data)
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.parent_link_create_manual,
      target_kind: "student",
      target_id: parsed.data.student_id,
      details: {
        parent_link_id: link.id,
        parent_email: parsed.data.parent_email,
        relationship: parsed.data.relationship,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't add the parent link."
    redirect(
      `/admin/students/${parsed.data.student_id}?parent_link_error=${encodeURIComponent(message)}`
    )
  }

  revalidateStudent(parsed.data.student_id)
  revalidatePath("/admin/students")
  redirect(`/admin/students/${parsed.data.student_id}?parent_link_added=1`)
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

const deleteStudentSchema = z.object({
  id: z.uuid(),
  delete_m365: z.coerce.boolean().default(false),
  delete_profile: z.coerce.boolean().default(false),
  delete_orphan_parents: z.coerce.boolean().default(false),
})

// Hard delete a withdrawn student. Optional M365 + profile cleanup —
// admin opts in via checkboxes so the destructive parts are explicit.
export async function deleteStudentAction(formData: FormData) {
  await assertAdmin()
  const parsed = deleteStudentSchema.safeParse({
    id: formData.get("id"),
    delete_m365: formData.get("delete_m365") === "on",
    delete_profile: formData.get("delete_profile") === "on",
    delete_orphan_parents: formData.get("delete_orphan_parents") === "on",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid delete.")
  }

  const supabase = getServiceSupabase()

  // Snapshot the parent profile ids BEFORE deleting the student.
  // parent_links cascades on student delete, so by the time deleteStudent
  // returns these would be gone and we couldn't tell which parents had
  // been linked. We re-check "is this parent orphan now?" after the
  // student delete by calling deleteProfile, which itself refuses to
  // remove a profile that still has student records or parent_links.
  let parentProfileIdsToTry: string[] = []
  if (parsed.data.delete_orphan_parents) {
    const { data: links } = await supabase
      .from("parent_links")
      .select("parent_profile_id")
      .eq("student_id", parsed.data.id)
      .returns<Array<{ parent_profile_id: string }>>()
    parentProfileIdsToTry = (links ?? []).map((l) => l.parent_profile_id)
  }

  // Try the M365 delete BEFORE the DB delete so we can read the UPN
  // off the profile row. Best-effort: a Graph failure logs but does
  // not block the DB cleanup — admin can finish removing the M365
  // user manually from Entra if Graph hiccups.
  let m365Deleted = false
  let m365Error: string | null = null
  let upnForLog: string | null = null
  if (parsed.data.delete_m365) {
    try {
      const { data: row } = await supabase
        .from("students")
        .select("profile_id, profile:profiles(email)")
        .eq("id", parsed.data.id)
        .maybeSingle<{
          profile_id: string
          profile: { email: string } | null
        }>()
      const upn = row?.profile?.email
      if (upn) {
        upnForLog = upn
        const { deleteM365User } = await import("@/lib/graph")
        m365Deleted = await deleteM365User(upn)
      }
    } catch (err) {
      m365Error = err instanceof Error ? err.message : String(err)
      console.error("deleteStudent: M365 delete failed:", m365Error)
    }
  }

  const result = await deleteStudent({
    id: parsed.data.id,
    deleteProfile: parsed.data.delete_profile,
  })

  // Cascade-delete parent profiles that were ONLY linked to this student.
  // deleteProfile internally refuses if any other student record or
  // parent_link still references the profile (and refuses for the last
  // admin), so a parent with a sibling still enrolled is safely skipped.
  const parentProfileDeleteOutcomes: Array<{
    profile_id: string
    deleted: boolean
    skipped_reason?: string
  }> = []
  for (const parentId of parentProfileIdsToTry) {
    try {
      await deleteProfile(parentId)
      parentProfileDeleteOutcomes.push({ profile_id: parentId, deleted: true })
    } catch (err) {
      parentProfileDeleteOutcomes.push({
        profile_id: parentId,
        deleted: false,
        skipped_reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.student_delete,
    target_kind: "student",
    target_id: parsed.data.id,
    details: {
      profile_deleted: result.profile_deleted,
      profile_email: result.profile_email,
      m365_deleted_attempted: parsed.data.delete_m365,
      m365_deleted: m365Deleted,
      m365_error: m365Error,
      upn: upnForLog,
      orphan_parent_cleanup_attempted: parsed.data.delete_orphan_parents,
      orphan_parent_outcomes: parentProfileDeleteOutcomes,
    },
  })

  revalidatePath("/admin/students")
  revalidatePath("/admin/profiles")
  redirect("/admin/students?deleted=1")
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

// ============================================================================
// Academic history — transfer / external coursework. Mutates the
// cumulative transcript + graduation trajectory, so every change is
// audit-logged and the transcript/trajectory pages are revalidated.
// ============================================================================

// The shared form-field shape for add + update. Checkboxes are absent
// from FormData when unchecked, so `=== "on"` is the read.
function readAcademicHistoryFields(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    school_name: formData.get("school_name") ?? "",
    academic_year: formData.get("academic_year") ?? "",
    term_label: formData.get("term_label") ?? "",
    grade_letter: formData.get("grade_letter") ?? "",
    credits: formData.get("credits") ?? "1",
    subject_area: formData.get("subject_area") ?? "",
    course_id: formData.get("course_id") ?? "",
    source: formData.get("source") ?? "transfer",
    is_ap: formData.get("is_ap") === "on",
    is_honors: formData.get("is_honors") === "on",
    counts_toward_gpa: formData.get("counts_toward_gpa") === "on",
    superseded: formData.get("superseded") === "on",
    notes: formData.get("notes") ?? "",
  }
}

function revalidateStudentTranscript(studentId: string) {
  revalidateStudent(studentId)
  revalidatePath(`/admin/students/${studentId}/transcript`)
  revalidatePath(`/portal/transcript`)
  revalidatePath(`/portal/trajectory`)
}

export async function addAcademicHistoryAction(formData: FormData) {
  await assertAdmin()
  const studentId = String(formData.get("student_id") ?? "").trim()

  const parsed = academicHistoryCreateSchema.safeParse({
    student_id: studentId,
    ...readAcademicHistoryFields(formData),
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Couldn't add the entry."
    redirect(
      `/admin/students/${studentId}?ah_error=${encodeURIComponent(message)}#academic-history`
    )
  }

  const entry = await createAcademicHistoryEntry(parsed.data)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.academic_history_create,
    target_kind: "academic_history",
    target_id: entry.id,
    details: {
      student_id: entry.student_id,
      title: entry.title,
      school_name: entry.school_name,
    },
  })
  revalidateStudentTranscript(parsed.data.student_id)
  redirect(`/admin/students/${parsed.data.student_id}#academic-history`)
}

export async function updateAcademicHistoryAction(formData: FormData) {
  await assertAdmin()
  const studentId = String(formData.get("student_id") ?? "").trim()

  const parsed = academicHistoryUpdateSchema.safeParse({
    id: formData.get("id"),
    ...readAcademicHistoryFields(formData),
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Couldn't save the entry."
    redirect(
      `/admin/students/${studentId}?ah_error=${encodeURIComponent(message)}#academic-history`
    )
  }

  const entry = await updateAcademicHistoryEntry(parsed.data)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.academic_history_update,
    target_kind: "academic_history",
    target_id: entry.id,
    details: {
      student_id: entry.student_id,
      title: entry.title,
      superseded: entry.superseded,
    },
  })
  revalidateStudentTranscript(entry.student_id)
  redirect(`/admin/students/${entry.student_id}#academic-history`)
}

export async function deleteAcademicHistoryAction(formData: FormData) {
  await assertAdmin()
  const id = String(formData.get("id") ?? "").trim()
  const studentId =
    String(formData.get("student_id") ?? "").trim() ||
    (await getAcademicHistoryStudentId(id)) ||
    ""
  if (!id) {
    redirect(`/admin/students/${studentId}#academic-history`)
  }

  await deleteAcademicHistoryEntry(id)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.academic_history_delete,
    target_kind: "academic_history",
    target_id: id,
    details: { student_id: studentId },
  })
  if (studentId) revalidateStudentTranscript(studentId)
  redirect(`/admin/students/${studentId}#academic-history`)
}
