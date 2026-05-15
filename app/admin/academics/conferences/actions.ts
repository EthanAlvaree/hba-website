"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import {
  conferenceEventInsertSchema,
  createConferenceEvent,
  deleteConferenceEvent,
  generateSlotsForEvent,
} from "@/lib/conferences"
import { logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
}

function revalidateAll() {
  revalidatePath("/admin/academics/conferences")
  revalidatePath("/parent", "layout")
  revalidatePath("/faculty-portal", "layout")
}

export async function createConferenceEventAction(formData: FormData) {
  await assertAdmin()
  const startAtLocal = String(formData.get("start_at") ?? "")
  const endAtLocal = String(formData.get("end_at") ?? "")
  const parsed = conferenceEventInsertSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    start_at: startAtLocal ? new Date(startAtLocal).toISOString() : "",
    end_at: endAtLocal ? new Date(endAtLocal).toISOString() : "",
    slot_minutes: formData.get("slot_minutes") ?? 15,
    active: formData.get("active") === "on",
  })
  if (!parsed.success) {
    redirect(
      `/admin/academics/conferences?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid event.")}`
    )
  }
  let created
  try {
    created = await createConferenceEvent(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed."
    redirect(`/admin/academics/conferences?error=${encodeURIComponent(message)}`)
  }
  await logAdminAuditEvent({
    action: "conference_event.create",
    target_kind: "conference_event",
    target_id: created.id,
    details: { slug: created.slug, name: created.name },
  })
  revalidateAll()
  redirect(`/admin/academics/conferences?saved=1`)
}

const generateSchema = z.object({ event_id: z.uuid() })
export async function generateSlotsAction(formData: FormData) {
  await assertAdmin()
  const parsed = generateSchema.safeParse({ event_id: formData.get("event_id") })
  if (!parsed.success) {
    redirect(`/admin/academics/conferences?error=${encodeURIComponent("Invalid request.")}`)
  }
  let result
  try {
    result = await generateSlotsForEvent(parsed.data.event_id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generate failed."
    redirect(`/admin/academics/conferences?error=${encodeURIComponent(message)}`)
  }
  await logAdminAuditEvent({
    action: "conference_event.generate_slots",
    target_kind: "conference_event",
    target_id: parsed.data.event_id,
    details: result,
  })
  revalidateAll()
  redirect(
    `/admin/academics/conferences?generated=${result.slots_created}_${result.teachers_with_slots}`
  )
}

export async function deleteConferenceEventAction(formData: FormData) {
  await assertAdmin()
  const parsed = generateSchema.safeParse({ event_id: formData.get("event_id") })
  if (!parsed.success) redirect("/admin/academics/conferences")
  await deleteConferenceEvent(parsed.data.event_id)
  await logAdminAuditEvent({
    action: "conference_event.delete",
    target_kind: "conference_event",
    target_id: parsed.data.event_id,
  })
  revalidateAll()
  redirect(`/admin/academics/conferences?deleted=1`)
}
