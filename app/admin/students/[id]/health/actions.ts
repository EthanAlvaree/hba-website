"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"
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
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.health_record_upsert,
    target_kind: "student",
    target_id: parsed.data.student_id,
    // Deliberately log only the fact-of-change and which sections were
    // present, not the medical content itself — the audit log doesn't need
    // a PHI copy, just "who changed what, when."
    details: {
      immunizations_on_file: parsed.data.immunizations_on_file ?? null,
      has_allergies: Boolean(parsed.data.allergies),
      has_conditions: Boolean(parsed.data.conditions),
      has_medications: Boolean(parsed.data.medications),
    },
  })
  revalidatePath(`/admin/students/${parsed.data.student_id}/health`)
  revalidatePath(`/admin/students/${parsed.data.student_id}`)
  redirect(`/admin/students/${parsed.data.student_id}/health?saved=1`)
}
