"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import { z } from "zod"
import {
  courseCreateSchema,
  courseUpdateSchema,
  createCourse,
  createCourseSection,
  createTerm,
  enrollStudentInSection,
  enrollStudentSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  termCreateSchema,
  termUpdateSchema,
  updateCourse,
  updateCourseSection,
  updateEnrollmentStatus,
  updateEnrollmentStatusInputSchema,
  updateTerm,
} from "@/lib/sis"
import {
  lockSectionFinalGrades,
  lockTermFinalGrades,
  unlockSectionFinalGrades,
  unlockTermFinalGrades,
} from "@/lib/gradebook"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateAcademicsViews() {
  revalidatePath("/admin/academics/terms")
  revalidatePath("/admin/academics/courses")
  revalidatePath("/admin/academics/sections")
}

// Allow form submissions to specify where to return after a successful action,
// as long as the target stays inside /admin/academics. Falls back to the
// caller's default if the form didn't include a redirectTo or it points
// outside the namespace.
function redirectAfter(formData: FormData, fallback: string) {
  const value = formData.get("redirectTo")
  if (typeof value === "string" && value.startsWith("/admin/academics")) {
    redirect(value)
  }
  redirect(fallback)
}

// ============================================================================
// Terms
// ============================================================================

function parseTermFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    kind: formData.get("kind"),
    academic_year: formData.get("academic_year"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    is_current: formData.get("is_current") === "on",
    is_grades_locked: formData.get("is_grades_locked") === "on",
  }
}

export async function createTermAction(formData: FormData) {
  await assertAdmin()

  const parsed = termCreateSchema.safeParse(parseTermFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Term create failed.")
  }

  await createTerm(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/terms")
}

export async function updateTermAction(formData: FormData) {
  await assertAdmin()

  const parsed = termUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseTermFormData(formData),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Term update failed.")
  }

  await updateTerm(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/terms")
}

// ============================================================================
// Courses
// ============================================================================

function parseCourseFormData(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    subject: formData.get("subject") ?? null,
    department: formData.get("department") ?? null,
    description: formData.get("description") ?? null,
    grade_levels: formData.getAll("grade_levels").map((v) => String(v)),
    is_ap: formData.get("is_ap") === "on",
    is_honors: formData.get("is_honors") === "on",
    is_elective: formData.get("is_elective") === "on",
    credit_hours: formData.get("credit_hours"),
    active: formData.get("active") === "on",
  }
}

export async function createCourseAction(formData: FormData) {
  await assertAdmin()

  const parsed = courseCreateSchema.safeParse(parseCourseFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Course create failed.")
  }

  await createCourse(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/courses")
}

export async function updateCourseAction(formData: FormData) {
  await assertAdmin()

  const parsed = courseUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseCourseFormData(formData),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Course update failed.")
  }

  await updateCourse(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/courses")
}

// ============================================================================
// Course sections
// ============================================================================

function parseSectionFormData(formData: FormData) {
  const teacher = formData.get("teacher_profile_id")
  const period = formData.get("period")
  const sectionCode = formData.get("section_code")
  const room = formData.get("room")
  const maxEnrollment = formData.get("max_enrollment")
  const notes = formData.get("notes")
  const modality = formData.get("modality")

  const stringOrNull = (value: FormDataEntryValue | null): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null

  return {
    course_id: formData.get("course_id"),
    term_id: formData.get("term_id"),
    teacher_profile_id: stringOrNull(teacher),
    section_code: stringOrNull(sectionCode),
    period: stringOrNull(period),
    room: stringOrNull(room),
    max_enrollment: stringOrNull(maxEnrollment),
    modality: stringOrNull(modality) ?? "in_person",
    notes: stringOrNull(notes),
  }
}

export async function createSectionAction(formData: FormData) {
  await assertAdmin()

  const parsed = sectionCreateSchema.safeParse(parseSectionFormData(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Section create failed.")
  }

  await createCourseSection(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/sections")
}

export async function updateSectionAction(formData: FormData) {
  await assertAdmin()

  const parsed = sectionUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseSectionFormData(formData),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Section update failed.")
  }

  await updateCourseSection(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/sections")
}

// ============================================================================
// Enrollments
// ============================================================================

export async function enrollStudentInSectionAction(formData: FormData) {
  await assertAdmin()

  const parsed = enrollStudentSchema.safeParse({
    section_id: formData.get("section_id"),
    student_id: formData.get("student_id"),
    status: formData.get("status") ?? undefined,
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Enroll failed.")
  }

  await enrollStudentInSection(parsed.data)
  revalidateAcademicsViews()
  redirectAfter(formData, `/admin/academics/sections/${parsed.data.section_id}`)
}

export async function updateEnrollmentStatusAction(formData: FormData) {
  await assertAdmin()

  const parsed = updateEnrollmentStatusInputSchema.safeParse({
    enrollment_id: formData.get("enrollment_id"),
    status: formData.get("status"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Enrollment update failed.")
  }

  await updateEnrollmentStatus(parsed.data)
  revalidateAcademicsViews()

  const sectionId = formData.get("section_id")
  const fallback =
    typeof sectionId === "string" && sectionId.length > 0
      ? `/admin/academics/sections/${sectionId}`
      : "/admin/academics/sections"
  redirectAfter(formData, fallback)
}

// ============================================================================
// Lock / unlock final grades
// ============================================================================

const sectionGradeLockSchema = z.object({
  section_id: z.uuid(),
})

export async function lockSectionGradesAction(formData: FormData) {
  await assertAdmin()

  const parsed = sectionGradeLockSchema.safeParse({
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Lock failed.")
  }

  await lockSectionFinalGrades(parsed.data.section_id)
  revalidateAcademicsViews()
  revalidatePath(`/admin/academics/sections/${parsed.data.section_id}`)
  redirectAfter(formData, `/admin/academics/sections/${parsed.data.section_id}`)
}

export async function unlockSectionGradesAction(formData: FormData) {
  await assertAdmin()

  const parsed = sectionGradeLockSchema.safeParse({
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Unlock failed.")
  }

  await unlockSectionFinalGrades(parsed.data.section_id)
  revalidateAcademicsViews()
  revalidatePath(`/admin/academics/sections/${parsed.data.section_id}`)
  redirectAfter(formData, `/admin/academics/sections/${parsed.data.section_id}`)
}

const termGradeLockSchema = z.object({ term_id: z.uuid() })

export async function lockTermGradesAction(formData: FormData) {
  await assertAdmin()

  const parsed = termGradeLockSchema.safeParse({ term_id: formData.get("term_id") })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Term lock failed.")
  }

  await lockTermFinalGrades(parsed.data.term_id)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/terms")
}

export async function unlockTermGradesAction(formData: FormData) {
  await assertAdmin()

  const parsed = termGradeLockSchema.safeParse({ term_id: formData.get("term_id") })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Term unlock failed.")
  }

  await unlockTermFinalGrades(parsed.data.term_id)
  revalidateAcademicsViews()
  redirectAfter(formData, "/admin/academics/terms")
}

export async function signOutAcademicsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
