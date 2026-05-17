"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  studentDemographicsUpdateSchema,
  updateStudentDemographics,
} from "@/lib/sis"

// Parent self-service edit of a student's demographic record. Mirrors
// the admin form (studentDemographicsUpdateSchema) but verifies the
// signed-in user is a parent linked to this student before letting the
// write through.
export async function updateStudentInfoAsParentAction(formData: FormData) {
  const studentId = formData.get("id")
  if (typeof studentId !== "string") throw new Error("Missing student id.")

  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  // Admins are allowed too (they can edit on behalf via the same UI).
  if (!session.isAdmin) {
    const profile = await getProfileByEmail(session.user.email)
    if (!profile || !profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) {
      // Redirecting (rather than 404) leaks less about which student
      // ids exist.
      redirect("/parent")
    }
  }

  const parsed = studentDemographicsUpdateSchema.safeParse({
    id: studentId,
    legal_first_name: formData.get("legal_first_name") ?? "",
    legal_middle_name: formData.get("legal_middle_name") ?? "",
    legal_last_name: formData.get("legal_last_name") ?? "",
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
    is_international: formData.get("is_international") ?? "",
    address_line1: formData.get("address_line1") ?? "",
    address_line2: formData.get("address_line2") ?? "",
    address_city: formData.get("address_city") ?? "",
    address_region: formData.get("address_region") ?? "",
    address_postal_code: formData.get("address_postal_code") ?? "",
    address_country: formData.get("address_country") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await updateStudentDemographics(parsed.data)
  revalidatePath(`/parent/students/${studentId}/edit-info`)
  revalidatePath(`/parent/students/${studentId}`)
  revalidatePath("/parent")
  redirect(`/parent/students/${studentId}/edit-info?saved=1`)
}
