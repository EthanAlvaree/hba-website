// lib/events.ts
// Types and pure helpers — safe to import from client components.

import { CategoryKey } from "./categories"

export interface SchoolEvent {
  id: string
  title: string
  /** ISO date YYYY-MM-DD (all-day) or full ISO datetime. */
  start: string
  /** Exclusive end (FullCalendar / iCal convention). Day after the last day for all-day events. */
  end?: string
  allDay?: boolean
  category: CategoryKey
  location?: string
  description?: string
}

/** Day after the last day an event spans. For single-day events, start + 1. */
export function effectiveEnd(ev: SchoolEvent): string {
  if (ev.end) return ev.end
  const d = new Date(ev.start + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function getUpcomingEvents(
  events: SchoolEvent[],
  referenceDate: Date = new Date(),
  limit = 5,
): SchoolEvent[] {
  const today = referenceDate.toISOString().slice(0, 10)
  return events.filter((ev) => effectiveEnd(ev) > today).slice(0, limit)
}
