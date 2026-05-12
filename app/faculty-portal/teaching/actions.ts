"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import {
  deleteTeacherQualification,
  saveTeacherAvailability,
  teacherAvailabilityBatchSchema,
  teacherQualificationUpsertSchema,
  teacherWorkloadUpsertSchema,
  upsertTeacherQualification,
  upsertTeacherWorkload,
} from "@/lib/scheduler"
import { sectionPeriodSchema } from "@/lib/sis"

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
