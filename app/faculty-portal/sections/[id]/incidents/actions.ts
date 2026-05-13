"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import { getProfileByEmail } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  createIncident,
  createIncidentInputSchema,
  deleteIncident,
  incidentKindSchema,
} from "@/lib/incidents"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

export async function createIncidentAction(formData: FormData) {
  const sectionId = formData.get("section_id")
  if (typeof sectionId !== "string" || sectionId.length === 0) {
    redirect("/admin/sign-in")
  }
  await assertCanEditSection(sectionId)
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")
  const reporter = await getProfileByEmail(session.user.email)

  const occurredRaw = formData.get("occurred_at")
  const occurred =
    typeof occurredRaw === "string" && occurredRaw.length > 0
      ? new Date(occurredRaw).toISOString()
      : undefined

  const parsed = createIncidentInputSchema.safeParse({
    student_id: formData.get("student_id"),
    section_id: sectionId,
    enrollment_id: formData.get("enrollment_id") || null,
    kind: formData.get("kind"),
    occurred_at: occurred,
    summary: formData.get("summary"),
    details: formData.get("details") ?? "",
    reported_by_email: session.user.email,
    reported_by_profile_id: reporter?.id ?? null,
    parent_notified: formData.get("parent_notified") === "on",
    parent_notified_method:
      formData.get("parent_notified") === "on" ? "email" : null,
    visible_to_parent: formData.get("visible_to_parent") !== "off",
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request."
    redirect(
      `/faculty-portal/sections/${sectionId}?incident_error=${encodeURIComponent(message)}`
    )
  }

  const created = await createIncident(parsed.data)

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.incident_create,
    target_kind: "incident",
    target_id: created.id,
    details: {
      student_id: created.student_id,
      kind: created.kind,
      section_id: created.section_id,
    },
  })

  revalidatePath(`/faculty-portal/sections/${sectionId}`)
  redirect(`/faculty-portal/sections/${sectionId}?incident_saved=1`)
}

const deleteSchema = z.object({
  id: z.uuid(),
  section_id: z.uuid(),
})

export async function deleteIncidentAction(formData: FormData) {
  const parsed = deleteSchema.safeParse({
    id: formData.get("id"),
    section_id: formData.get("section_id"),
  })
  if (!parsed.success) {
    throw new Error("Invalid request.")
  }
  await assertCanEditSection(parsed.data.section_id)
  await deleteIncident(parsed.data.id)
  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.incident_delete,
    target_kind: "incident",
    target_id: parsed.data.id,
  })
  revalidatePath(`/faculty-portal/sections/${parsed.data.section_id}`)
  redirect(`/faculty-portal/sections/${parsed.data.section_id}?incident_saved=1`)
}
