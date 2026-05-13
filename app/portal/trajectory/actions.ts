"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  sectionPeriodSchema,
} from "@/lib/sis"
import {
  saveStudentAvailability,
  studentAvailabilityBatchSchema,
} from "@/lib/scheduler"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

// Permits either:
//   - the signed-in student saving their own availability
//   - an admin saving on behalf of any student (form posts admin=1)
async function assertCanEditStudentAvailability(
  targetStudentId: string,
  fromAdmin: boolean
): Promise<void> {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  if (fromAdmin) {
    if (!session.isAdmin) redirect("/admin/sign-in")
    return
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  if (!profile.roles.includes("student")) redirect("/admin/sign-in")
  const student = await getStudentByProfileId(profile.id)
  if (!student || student.id !== targetStudentId) redirect("/portal")
}

export async function saveStudentAvailabilityAction(formData: FormData) {
  const targetStudentId = formData.get("student_id")
  if (typeof targetStudentId !== "string") {
    throw new Error("Missing student_id.")
  }
  const fromAdmin = formData.get("admin") === "1"
  await assertCanEditStudentAvailability(targetStudentId, fromAdmin)

  const entries = sectionPeriodSchema.options.map((period) => ({
    period,
    available: formData.get(`available_${period}`) === "on",
  }))

  const parsed = studentAvailabilityBatchSchema.safeParse({
    student_id: targetStudentId,
    entries,
    notes: formData.get("availability_notes") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await saveStudentAvailability(parsed.data)

  revalidatePath("/portal/trajectory")
  revalidatePath(`/admin/students/${targetStudentId}`)
  revalidatePath(`/admin/academics/scheduler/course-requests`)

  if (fromAdmin) {
    await logAdminAuditEvent({
      action: ADMIN_AUDIT_ACTIONS.student_availability_admin_edit,
      target_kind: "student",
      target_id: targetStudentId,
      details: {
        unavailable_periods: entries
          .filter((e) => !e.available)
          .map((e) => e.period),
      },
    })
    redirect(`/admin/students/${targetStudentId}?saved=availability`)
  }

  redirect("/portal/trajectory?saved=availability")
}
