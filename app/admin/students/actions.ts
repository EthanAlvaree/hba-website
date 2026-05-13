"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import {
  parentLinkUpdateSchema,
  profileContactUpdateSchema,
  studentAdminUpdateSchema,
  studentDemographicsUpdateSchema,
  updateParentLink,
  updateProfileContact,
  updateStudentAdmin,
  updateStudentDemographics,
} from "@/lib/sis"
import { z } from "zod"
import {
  clearProfilePhoto,
  setProfilePhotoFromBuffer,
} from "@/lib/profile-photos"
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

export async function signOutStudentsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}

// ---- Profile photos ----

const profilePhotoFormSchema = z.object({
  profile_id: z.uuid(),
  student_id: z.uuid(),
})

export type ProfilePhotoResult = { ok: true } | { ok: false; error: string }

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

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await setProfilePhotoFromBuffer(
    parsed.data.profile_id,
    buffer,
    file.type
  )
  if (!result.ok) return result

  revalidateStudent(parsed.data.student_id)
  return { ok: true }
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
  revalidateStudent(parsed.data.student_id)
  redirect(`/admin/students/${parsed.data.student_id}`)
}
