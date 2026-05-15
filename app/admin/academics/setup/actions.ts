"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { z } from "zod"
import {
  createTerm,
  termCreateSchema,
} from "@/lib/sis"
import {
  calendarEventInsertSchema,
  createCalendarEvent,
} from "@/lib/calendar-events"
import { logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
  return session
}

// The wizard collects the term plus an array of calendar events the admin
// confirmed. Events are submitted as parallel arrays in form data — each
// row has event_title[], event_start_date[], event_end_date[],
// event_category[].
export async function runTermSetupAction(formData: FormData) {
  const session = await assertAdmin()

  const parsedTerm = termCreateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    kind: formData.get("kind"),
    academic_year: formData.get("academic_year"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    is_current: formData.get("is_current") === "on",
    is_grades_locked: false,
  })
  if (!parsedTerm.success) {
    const message = parsedTerm.error.issues[0]?.message ?? "Invalid term."
    redirect(`/admin/academics/setup?error=${encodeURIComponent(message)}`)
  }

  let term
  try {
    term = await createTerm(parsedTerm.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create term."
    redirect(`/admin/academics/setup?error=${encodeURIComponent(message)}`)
  }

  await logAdminAuditEvent({
    action: "term.create",
    target_kind: "term",
    target_id: term.id,
    details: { slug: term.slug, academic_year: term.academic_year },
  })

  // Create the calendar events the admin checked.
  const titles = formData.getAll("event_title").map(String)
  const starts = formData.getAll("event_start_date").map(String)
  const ends = formData.getAll("event_end_date").map(String)
  const categories = formData.getAll("event_category").map(String)
  const enabled = formData.getAll("event_enabled").map(String)
  // Cull non-checked rows. `event_enabled` carries the row's index when
  // checked; rows whose index isn't in `enabled` are skipped.
  const enabledSet = new Set(enabled)

  let eventsCreated = 0
  const eventErrors: string[] = []
  for (let i = 0; i < titles.length; i += 1) {
    if (!enabledSet.has(String(i))) continue
    const slug = `${term.slug}-${slugify(titles[i])}`
    const parsed = calendarEventInsertSchema.safeParse({
      slug,
      title: titles[i],
      start_date: starts[i],
      end_date: ends[i] && ends[i] !== starts[i] ? addOneDay(ends[i]) : null,
      all_day: true,
      category: categories[i] || "academics",
      location: null,
      description: null,
    })
    if (!parsed.success) {
      eventErrors.push(`${titles[i]}: ${parsed.error.issues[0]?.message ?? "invalid"}`)
      continue
    }
    try {
      await createCalendarEvent(parsed.data, session.user?.email ?? null)
      eventsCreated += 1
    } catch (error) {
      eventErrors.push(
        `${titles[i]}: ${error instanceof Error ? error.message : "save failed"}`
      )
    }
  }

  revalidatePath("/admin/academics/terms")
  revalidatePath("/admin/academics/calendar")
  revalidatePath("/calendar")

  redirect(
    `/admin/academics/setup?completed=${term.id}&events_created=${eventsCreated}${
      eventErrors.length > 0
        ? `&event_errors=${encodeURIComponent(eventErrors.slice(0, 5).join(" | "))}`
        : ""
    }`
  )
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

function addOneDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
}
