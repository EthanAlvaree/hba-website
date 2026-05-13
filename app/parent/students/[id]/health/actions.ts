"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentLinkForStudent, getProfileByEmail } from "@/lib/sis"
import {
  getHealthRecord,
  healthRecordUpsertSchema,
  upsertHealthRecord,
} from "@/lib/health-records"

export async function saveParentHealthRecordAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const studentId = String(formData.get("student_id") ?? "")
  if (!studentId) redirect("/parent")

  const isAdmin = session.isAdmin === true
  if (!isAdmin) {
    if (!profile.roles.includes("parent")) redirect("/admin/sign-in")
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) {
      redirect(`/parent`)
    }
  }

  // Parents can't touch internal_notes. We preserve whatever's already there
  // by reading it before the upsert and feeding it back.
  const existing = await getHealthRecord(studentId)

  const raw: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) {
    raw[k] = typeof v === "string" ? v : null
  }
  raw.immunizations_on_file = formData.get("immunizations_on_file") === "on"
  raw.internal_notes = existing?.internal_notes ?? null

  const parsed = healthRecordUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Save failed."
    redirect(
      `/parent/students/${studentId}/health?error=${encodeURIComponent(message)}`
    )
  }

  await upsertHealthRecord(parsed.data)
  revalidatePath(`/parent/students/${studentId}/health`)
  revalidatePath(`/parent/students/${studentId}`)
  redirect(`/parent/students/${studentId}/health?saved=1`)
}
