// app/calendar.ics/route.ts

import ical, { ICalCalendarMethod } from "ical-generator"
import { getAllEvents } from "@/lib/events-server"
import { effectiveEnd } from "@/lib/events"
import { categories } from "@/lib/categories"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-static"
export const revalidate = 3600

export async function GET() {
  const cal = ical({
    name: siteConfig.name,
    description: `Academic calendar for ${siteConfig.name}.`,
    timezone: "America/Los_Angeles",
    prodId: { company: siteConfig.name, product: "Academic Calendar" },
    method: ICalCalendarMethod.PUBLISH,
  })

  for (const ev of getAllEvents()) {
    const start = new Date(ev.start + "T00:00:00")
    const end = new Date(effectiveEnd(ev) + "T00:00:00")
    cal.createEvent({
      id: ev.id,
      start,
      end,
      allDay: ev.allDay ?? true,
      summary: ev.title,
      description: ev.description,
      location: ev.location,
      categories: [{ name: categories[ev.category].label }],
    })
  }

  return new Response(cal.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="hba-calendar.ics"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
