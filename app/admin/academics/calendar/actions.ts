"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "@/auth"
import {
  calendarEventInsertSchema,
  calendarEventUpdateSchema,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/calendar-events"
import { logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

// Public-facing routes that read calendar data, so admin edits surface
// immediately. (The Next.js public /calendar + print routes are
// force-dynamic, but revalidatePath is a belt-and-suspenders.)
function revalidateCalendar() {
  revalidatePath("/admin/academics/calendar")
  revalidatePath("/calendar")
  revalidatePath("/calendar.ics")
  revalidatePath("/calendar/print/2025")
  revalidatePath("/calendar/print/2026")
}

function parseBody(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date") ?? "",
    all_day: formData.get("all_day") === "on",
    start_time: formData.get("start_time") ?? "",
    end_time: formData.get("end_time") ?? "",
    category: formData.get("category"),
    location: formData.get("location") ?? "",
    description: formData.get("description") ?? "",
  }
}

export async function createCalendarEventAction(formData: FormData) {
  const session = await assertAdmin()
  const parsed = calendarEventInsertSchema.safeParse(parseBody(formData))
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid event."
    redirect(`/admin/academics/calendar?error=${encodeURIComponent(message)}`)
  }
  let created
  try {
    created = await createCalendarEvent(parsed.data, session.user?.email ?? null)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed."
    redirect(`/admin/academics/calendar?error=${encodeURIComponent(message)}`)
  }
  await logAdminAuditEvent({
    action: "calendar_event.create",
    target_kind: "calendar_event",
    target_id: created.id,
    details: { slug: created.slug, title: created.title, start: created.start_date },
  })
  revalidateCalendar()
  redirect("/admin/academics/calendar?saved=1")
}

export async function updateCalendarEventAction(formData: FormData) {
  await assertAdmin()
  const parsed = calendarEventUpdateSchema.safeParse({
    id: formData.get("id"),
    ...parseBody(formData),
  })
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid event."
    redirect(`/admin/academics/calendar?error=${encodeURIComponent(message)}`)
  }
  let updated
  try {
    updated = await updateCalendarEvent(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed."
    redirect(`/admin/academics/calendar?error=${encodeURIComponent(message)}`)
  }
  await logAdminAuditEvent({
    action: "calendar_event.update",
    target_kind: "calendar_event",
    target_id: updated.id,
    details: { slug: updated.slug, title: updated.title, start: updated.start_date },
  })
  revalidateCalendar()
  redirect("/admin/academics/calendar?saved=1")
}

const deleteSchema = z.object({ id: z.uuid() })
export async function deleteCalendarEventAction(formData: FormData) {
  await assertAdmin()
  const parsed = deleteSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) {
    redirect(`/admin/academics/calendar?error=${encodeURIComponent("Invalid request.")}`)
  }
  try {
    await deleteCalendarEvent(parsed.data.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed."
    redirect(`/admin/academics/calendar?error=${encodeURIComponent(message)}`)
  }
  await logAdminAuditEvent({
    action: "calendar_event.delete",
    target_kind: "calendar_event",
    target_id: parsed.data.id,
  })
  revalidateCalendar()
  redirect("/admin/academics/calendar?deleted=1")
}
