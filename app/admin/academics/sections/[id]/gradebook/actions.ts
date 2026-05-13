"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  assignmentCategoryCreateSchema,
  assignmentCategoryDeleteSchema,
  assignmentCategoryUpdateSchema,
  assignmentCreateSchema,
  assignmentDeleteSchema,
  assignmentUpdateSchema,
  createAssignment,
  createAssignmentCategory,
  defaultCategoryTemplate,
  deleteAssignment,
  deleteAssignmentCategory,
  listAssignmentCategories,
  saveScoresForAssignment,
  saveScoresInputSchema,
  scoreKindSchema,
  updateAssignment,
  updateAssignmentCategory,
} from "@/lib/gradebook"

// `surface` selects which path tree we revalidate + redirect into. Same UI
// works under /admin/* (admin viewing any section) and /faculty-portal/*
// (a teacher viewing one of their own sections).
type Surface = "admin" | "faculty"

function surfaceFromFormData(formData: FormData): Surface {
  const raw = formData.get("surface")
  return raw === "faculty" ? "faculty" : "admin"
}

function sectionBasePath(surface: Surface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

function revalidateGradebook(surface: Surface, sectionId: string) {
  const base = sectionBasePath(surface, sectionId)
  revalidatePath(base)
  revalidatePath(`${base}/gradebook`)
}

function backToGradebook(surface: Surface, sectionId: string) {
  redirect(`${sectionBasePath(surface, sectionId)}/gradebook`)
}

// ============================================================================
// Assignment categories
// ============================================================================

function parseCategoryFormData(formData: FormData) {
  const dropLowest = formData.get("drop_lowest_count")
  return {
    section_id: formData.get("section_id"),
    name: formData.get("name"),
    weight: formData.get("weight"),
    drop_lowest_count:
      typeof dropLowest === "string" && dropLowest.trim().length > 0
        ? Number(dropLowest)
        : null,
    sort_order: formData.get("sort_order") ?? 0,
  }
}

export async function createAssignmentCategoryAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentCategoryCreateSchema.safeParse(parseCategoryFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Category create failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await createAssignmentCategory(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

export async function updateAssignmentCategoryAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentCategoryUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseCategoryFormData(formData),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Category update failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await updateAssignmentCategory(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

export async function deleteAssignmentCategoryAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentCategoryDeleteSchema.safeParse({
    id: formData.get("id"),
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Category delete failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await deleteAssignmentCategory(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

// Idempotent: if the section already has any categories, this is a no-op.
// Use only on a freshly created section to bootstrap a default scheme.
export async function seedDefaultCategoriesAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const sectionId = formData.get("section_id")
  if (typeof sectionId !== "string" || sectionId.length === 0) {
    throw new Error("Missing section_id.")
  }

  await assertCanEditSection(sectionId)

  const existing = await listAssignmentCategories(sectionId)
  if (existing.length > 0) {
    backToGradebook(surface, sectionId)
    return
  }

  for (const template of defaultCategoryTemplate()) {
    await createAssignmentCategory({
      section_id: sectionId,
      name: template.name,
      weight: template.weight,
      drop_lowest_count: null,
      sort_order: template.sort_order,
    })
  }

  revalidateGradebook(surface, sectionId)
  backToGradebook(surface, sectionId)
}

// ============================================================================
// Assignments
// ============================================================================

function parseAssignmentFormData(formData: FormData) {
  const trim = (value: FormDataEntryValue | null) =>
    typeof value === "string" ? value.trim() : ""

  const categoryId = trim(formData.get("category_id"))
  const description = trim(formData.get("description"))
  const assignedDate = trim(formData.get("assigned_date"))
  const dueDate = trim(formData.get("due_date"))

  return {
    section_id: formData.get("section_id"),
    category_id: categoryId.length > 0 ? categoryId : null,
    title: formData.get("title"),
    description: description.length > 0 ? description : null,
    assigned_date: assignedDate.length > 0 ? assignedDate : null,
    due_date: dueDate.length > 0 ? dueDate : null,
    points_possible: formData.get("points_possible") ?? 0,
    is_published: formData.get("is_published") === "on",
    is_extra_credit: formData.get("is_extra_credit") === "on",
  }
}

export async function createAssignmentAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentCreateSchema.safeParse(parseAssignmentFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Assignment create failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await createAssignment(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

export async function updateAssignmentAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseAssignmentFormData(formData),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Assignment update failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await updateAssignment(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

export async function deleteAssignmentAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const parsed = assignmentDeleteSchema.safeParse({
    id: formData.get("id"),
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Assignment delete failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await deleteAssignment(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  backToGradebook(surface, parsed.data.section_id)
}

// ============================================================================
// Scores
// ============================================================================

export async function saveScoresAction(formData: FormData) {
  const surface = surfaceFromFormData(formData)
  const sectionId = formData.get("section_id")
  const assignmentId = formData.get("assignment_id")

  const enrollmentIds = formData.getAll("enrollment_id").map(String)
  const kinds = formData.getAll("kind").map(String)
  const points = formData.getAll("points_earned").map((v) => (typeof v === "string" ? v : ""))
  const feedbacks = formData.getAll("feedback").map((v) => (typeof v === "string" ? v : ""))

  if (kinds.length !== enrollmentIds.length || points.length !== enrollmentIds.length) {
    throw new Error("Form data is misaligned. Refresh the page and try again.")
  }

  const rows = enrollmentIds.map((id, idx) => {
    const kindResult = scoreKindSchema.safeParse(kinds[idx])
    if (!kindResult.success) {
      throw new Error(`Invalid score kind for row ${idx + 1}.`)
    }
    const pointsTrimmed = points[idx]?.trim() ?? ""
    return {
      enrollment_id: id,
      kind: kindResult.data,
      points_earned: pointsTrimmed.length > 0 ? Number(pointsTrimmed) : null,
      feedback: feedbacks[idx] ?? null,
    }
  })

  const parsed = saveScoresInputSchema.safeParse({
    assignment_id: assignmentId,
    section_id: sectionId,
    rows,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Score save failed.")
  }

  await assertCanEditSection(parsed.data.section_id)

  await saveScoresForAssignment(parsed.data)
  revalidateGradebook(surface, parsed.data.section_id)
  redirect(
    `${sectionBasePath(surface, parsed.data.section_id)}/gradebook/grade/${parsed.data.assignment_id}`
  )
}

export async function signOutGradebookAdminAction() {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  await signOut({ redirectTo: "/admin/sign-in" })
}
