"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import {
  addCourseToSubjectArea,
  graduationRequirementUpsertSchema,
  removeCourseFromSubjectArea,
  subjectAreas,
  upsertGraduationRequirement,
} from "@/lib/scheduler"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateAll() {
  revalidatePath("/admin/academics/requirements")
  revalidatePath("/admin/academics/courses")
  // Course→subject membership drives the scheduler's Friday-only logic
  // and the student trajectory, so refresh those too.
  revalidatePath("/admin/academics/scheduler")
  revalidatePath("/portal/trajectory")
  revalidatePath("/programs/graduation-requirements")
}

// Save the credit requirements + notes for one subject area. The page
// is a card per subject; this upserts that subject's single row
// (keyed on subject_area).
export async function saveRequirementAction(formData: FormData) {
  await assertAdmin()

  const gradeLevels = formData.getAll("applies_to_grade_levels").map(String)

  const parsed = graduationRequirementUpsertSchema.safeParse({
    subject_area: formData.get("subject_area"),
    required_credits_basic: formData.get("required_credits_basic") ?? 0,
    required_credits_college_bound:
      formData.get("required_credits_college_bound") ?? 0,
    applies_to_grade_levels: gradeLevels,
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertGraduationRequirement(parsed.data)
  revalidateAll()
  redirect("/admin/academics/requirements?saved=1")
}

// Add a course to a subject area's course list (many-to-many).
const courseSubjectSchema = z.object({
  course_id: z.uuid(),
  subject_area: z.enum(subjectAreas),
})

export async function addCourseToSubjectAction(formData: FormData) {
  await assertAdmin()
  const parsed = courseSubjectSchema.safeParse({
    course_id: formData.get("course_id"),
    subject_area: formData.get("subject_area"),
  })
  if (!parsed.success) throw new Error("Invalid request.")

  await addCourseToSubjectArea(parsed.data)
  revalidateAll()
  redirect(
    `/admin/academics/requirements?saved=1#subject-${parsed.data.subject_area}`
  )
}

export async function removeCourseFromSubjectAction(formData: FormData) {
  await assertAdmin()
  const parsed = courseSubjectSchema.safeParse({
    course_id: formData.get("course_id"),
    subject_area: formData.get("subject_area"),
  })
  if (!parsed.success) throw new Error("Invalid request.")

  await removeCourseFromSubjectArea(parsed.data)
  revalidateAll()
  redirect(
    `/admin/academics/requirements?saved=1#subject-${parsed.data.subject_area}`
  )
}

export async function signOutRequirementsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
