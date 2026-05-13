"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  healthRecordUpsertSchema,
  upsertHealthRecord,
} from "@/lib/health-records"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
}

export async function saveHealthRecordAction(formData: FormData) {
  await assertAdmin()

  const raw: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) {
    raw[k] = typeof v === "string" ? v : null
  }
  // Checkbox: present only when checked.
  raw.immunizations_on_file = formData.get("immunizations_on_file") === "on"

  const parsed = healthRecordUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Save failed."
    redirect(
      `/admin/students/${raw.student_id}/health?error=${encodeURIComponent(message)}`
    )
  }

  await upsertHealthRecord(parsed.data)
  revalidatePath(`/admin/students/${parsed.data.student_id}/health`)
  revalidatePath(`/admin/students/${parsed.data.student_id}`)
  redirect(`/admin/students/${parsed.data.student_id}/health?saved=1`)
}
