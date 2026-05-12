"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import {
  deleteGraduationRequirement,
  graduationRequirementUpsertSchema,
  setCourseSubjectArea,
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
}

export async function saveRequirementAction(formData: FormData) {
  await assertAdmin()

  const id = formData.get("id")
  const gradeLevels = formData.getAll("applies_to_grade_levels").map(String)

  const parsed = graduationRequirementUpsertSchema.safeParse({
    id: typeof id === "string" && id.length > 0 ? id : undefined,
    name: formData.get("name"),
    subject_area: formData.get("subject_area"),
    required_credits: formData.get("required_credits") ?? 0,
    applies_to_grade_levels: gradeLevels,
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertGraduationRequirement(parsed.data)
  revalidateAll()
  redirect("/admin/academics/requirements")
}

const deleteRequirementSchema = z.object({ id: z.uuid() })

export async function deleteRequirementAction(formData: FormData) {
  await assertAdmin()
  const parsed = deleteRequirementSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) throw new Error("Invalid request.")

  await deleteGraduationRequirement(parsed.data.id)
  revalidateAll()
  redirect("/admin/academics/requirements")
}

const courseSubjectSchema = z.object({
  course_id: z.uuid(),
  subject_area: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
})

export async function setCourseSubjectAction(formData: FormData) {
  await assertAdmin()
  const parsed = courseSubjectSchema.safeParse({
    course_id: formData.get("course_id"),
    subject_area: formData.get("subject_area") ?? "",
  })
  if (!parsed.success) throw new Error("Invalid request.")

  await setCourseSubjectArea(parsed.data)
  revalidateAll()
  redirect("/admin/academics/requirements")
}

export async function signOutRequirementsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
