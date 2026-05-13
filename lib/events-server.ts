// lib/events-server.ts
// Server-only event loader. Reads the DB-backed `calendar_events` table.
//
// As of migration 0012 the calendar lives in Postgres so non-technical
// admins can edit it from /admin/academics/calendar. The public /calendar
// page and the .ics feed both call getAllEvents() here; the DB row shape
// is translated into the same SchoolEvent type the client code already
// expects, so callers didn't have to change.

import "server-only"
import { SchoolEvent } from "./events"
import { listCalendarEvents, rowToSchoolEvent } from "./calendar-events"

export async function getAllEvents(): Promise<SchoolEvent[]> {
  const rows = await listCalendarEvents()
  return rows
    .map(rowToSchoolEvent)
    .sort((a, b) => a.start.localeCompare(b.start))
}
