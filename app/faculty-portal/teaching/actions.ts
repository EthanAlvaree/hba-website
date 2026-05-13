"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import {
  deleteTeacherQualification,
  saveTeacherAvailability,
  setTeacherQualificationOrder,
  teacherAvailabilityBatchSchema,
  teacherQualificationUpsertSchema,
  teacherWorkloadUpsertSchema,
  upsertTeacherQualification,
  upsertTeacherWorkload,
} from "@/lib/scheduler"
import { sectionPeriodSchema } from "@/lib/sis"
import { upsertFacultyBioOverride } from "@/lib/faculty"

// Faculty edit their OWN teaching profile. Admins may also edit anyone's
// via an admin path later; for now we keep it scoped to self.
//
// The form encodes the target profile_id in a hidden field, but we always
// validate that against the signed-in user's profile_id — so a faculty
// member can't tamper with someone else's record.
async function assertCanEditTeachingProfile(targetProfileId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  // Admins can edit anyone (future: separate admin page). Otherwise the
  // target profile must match the signed-in user.
  if (profile.id !== targetProfileId && !profile.roles.includes("admin")) {
    redirect("/faculty-portal")
  }

  if (!profile.roles.includes("faculty") && !profile.roles.includes("admin")) {
    redirect("/admin/sign-in")
  }

  return profile.id
}

function revalidateTeaching(profileId: string) {
  revalidatePath("/faculty-portal/teaching")
  revalidatePath("/faculty-portal")
  // If we add /admin/profiles/[id]/teaching later, revalidate that too.
  revalidatePath(`/admin/profiles/${profileId}/teaching`)
}

// ============================================================================
// Qualifications
// ============================================================================

export async function saveQualificationAction(formData: FormData) {
  const targetProfileId = formData.get("profile_id")
  if (typeof targetProfileId !== "string") throw new Error("Missing profile_id.")
  await assertCanEditTeachingProfile(targetProfileId)

  const parsed = teacherQualificationUpsertSchema.safeParse({
    profile_id: targetProfileId,
    course_id: formData.get("course_id"),
    preference_rank: formData.get("preference_rank") ?? 1,
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertTeacherQualification(parsed.data)
  revalidateTeaching(targetProfileId)
  redirect("/faculty-portal/teaching?saved=qualification")
}

// Bulk-update preference_rank for a teacher's qualifications. The form
// posts an `ordered_course_ids` repeated field, in the desired new order
// (index 0 = rank 1, etc). Used by the drag-to-rearrange UI.
export async function saveQualificationOrderAction(formData: FormData) {
  const targetProfileId = formData.get("profile_id")
  if (typeof targetProfileId !== "string") throw new Error("Missing profile_id.")
  await assertCanEditTeachingProfile(targetProfileId)

  const orderedCourseIds = formData
    .getAll("ordered_course_ids")
    .map((v) => (typeof v === "string" ? v : ""))
    .filter((v) => v.length > 0)

  await setTeacherQualificationOrder({
    profile_id: targetProfileId,
    ordered_course_ids: orderedCourseIds,
  })
  revalidateTeaching(targetProfileId)
  redirect("/faculty-portal/teaching?saved=qualification")
}

const qualificationDeleteSchema = z.object({
  profile_id: z.uuid(),
  course_id: z.uuid(),
})

export async function deleteQualificationAction(formData: FormData) {
  const parsed = qualificationDeleteSchema.safeParse({
    profile_id: formData.get("profile_id"),
    course_id: formData.get("course_id"),
  })
  if (!parsed.success) throw new Error("Invalid request.")
  await assertCanEditTeachingProfile(parsed.data.profile_id)

  await deleteTeacherQualification(parsed.data)
  revalidateTeaching(parsed.data.profile_id)
  redirect("/faculty-portal/teaching?saved=qualification")
}

// ============================================================================
// Availability
// ============================================================================

export async function saveAvailabilityAction(formData: FormData) {
  const targetProfileId = formData.get("profile_id")
  if (typeof targetProfileId !== "string") throw new Error("Missing profile_id.")
  await assertCanEditTeachingProfile(targetProfileId)

  // For each period in the schema, look for an 'available_<period>' field.
  // Unchecked checkboxes don't appear in form data, so absence == false.
  const entries = sectionPeriodSchema.options.map((period) => ({
    period,
    available: formData.get(`available_${period}`) === "on",
  }))

  const parsed = teacherAvailabilityBatchSchema.safeParse({
    profile_id: targetProfileId,
    entries,
    notes: formData.get("availability_notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await saveTeacherAvailability(parsed.data)
  revalidateTeaching(targetProfileId)
  redirect("/faculty-portal/teaching?saved=availability")
}

// ============================================================================
// Workload preferences
// ============================================================================

export async function saveWorkloadAction(formData: FormData) {
  const targetProfileId = formData.get("profile_id")
  if (typeof targetProfileId !== "string") throw new Error("Missing profile_id.")
  await assertCanEditTeachingProfile(targetProfileId)

  const parsed = teacherWorkloadUpsertSchema.safeParse({
    profile_id: targetProfileId,
    min_periods_per_week: formData.get("min_periods_per_week") ?? "",
    max_periods_per_week: formData.get("max_periods_per_week") ?? "",
    max_consecutive_periods: formData.get("max_consecutive_periods") ?? "",
    notes: formData.get("workload_notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertTeacherWorkload(parsed.data)
  revalidateTeaching(targetProfileId)
  redirect("/faculty-portal/teaching?saved=workload")
}

// ============================================================================
// Bio overrides — faculty self-edit their public-page paragraphs
// ============================================================================

const bioSchema = z.object({
  profile_id: z.uuid(),
  title: z.string().trim().max(200).optional().nullable(),
  area: z.string().trim().max(200).optional().nullable(),
  hba_start: z.string().trim().max(80).optional().nullable(),
  career_start: z.string().trim().max(200).optional().nullable(),
  courses_taught: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable(),
  short_bio: z.string().trim().max(800).optional().nullable(),
  full_bio: z.string().trim().max(12000).optional().nullable(),
})

function emptyToNull(s: string | null | undefined): string | null {
  if (s === undefined || s === null) return null
  const trimmed = s.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function saveBioAction(formData: FormData) {
  const targetProfileId = formData.get("profile_id")
  if (typeof targetProfileId !== "string") throw new Error("Missing profile_id.")
  await assertCanEditTeachingProfile(targetProfileId)

  const parsed = bioSchema.safeParse({
    profile_id: targetProfileId,
    title: formData.get("title") ?? "",
    area: formData.get("area") ?? "",
    hba_start: formData.get("hba_start") ?? "",
    career_start: formData.get("career_start") ?? "",
    courses_taught: formData.get("courses_taught") ?? "",
    short_bio: formData.get("short_bio") ?? "",
    full_bio: formData.get("full_bio") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  // courses_taught arrives as a newline-separated textarea. Split,
  // trim, drop blanks. Null when empty.
  const coursesText = emptyToNull(parsed.data.courses_taught ?? null)
  const coursesTaught = coursesText
    ? coursesText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : null

  await upsertFacultyBioOverride({
    profile_id: targetProfileId,
    title: emptyToNull(parsed.data.title ?? null),
    area: emptyToNull(parsed.data.area ?? null),
    hba_start: emptyToNull(parsed.data.hba_start ?? null),
    career_start: emptyToNull(parsed.data.career_start ?? null),
    courses_taught: coursesTaught,
    short_bio: emptyToNull(parsed.data.short_bio ?? null),
    full_bio: emptyToNull(parsed.data.full_bio ?? null),
  })
  revalidateTeaching(targetProfileId)
  // Also revalidate the public faculty pages — they read the override.
  revalidatePath("/faculty")
  redirect("/faculty-portal/teaching?saved=bio")
}
