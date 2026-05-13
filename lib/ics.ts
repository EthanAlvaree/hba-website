// lib/ics.ts
//
// Tiny iCalendar (RFC 5545) builder. Just enough to attach a single
// VEVENT to an email — no recurrence, no timezones (we emit UTC), no
// alarms. Outlook, Gmail/Calendar, and Apple Calendar all consume it.
//
// Why hand-roll instead of pulling in `ical-generator` or similar:
// the spec is small and we only need the happy path. One small file
// here is easier to audit than a 200-KB dependency tree.

import { siteConfig } from "@/lib/site"

export type IcsEvent = {
  /** Stable identifier (UUID-ish). Re-using the same UID across edits
   *  lets calendar clients update the existing event instead of
   *  creating duplicates. */
  uid: string
  /** Event start in UTC. */
  start: Date
  /** Event end in UTC. */
  end: Date
  /** Short title shown on the calendar. */
  summary: string
  /** Longer body. Newlines are preserved (RFC 5545 escapes them as \\n). */
  description?: string
  /** Physical / virtual location. */
  location?: string
  /** Organizer's email + display name. Defaults to the school's info
   *  mailbox + name. */
  organizer?: { email: string; name?: string }
  /** Attendees who should show up in the invite's recipient list. */
  attendees?: Array<{ email: string; name?: string }>
  /** Optional URL (e.g. the cancel/reschedule link in the parent portal). */
  url?: string
}

function formatIcsDate(d: Date): string {
  // RFC 5545 form: YYYYMMDDTHHMMSSZ (UTC, no separators).
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeIcs(value: string): string {
  // RFC 5545 §3.3.11. Order matters: backslash first.
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;")
}

/** Fold a single long content line to <=75 chars per RFC 5545 §3.1.
 *  Continuation lines start with a single space. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    const len = i === 0 ? 75 : 74 // continuation lines lose 1 char to the leading space
    chunks.push(line.slice(i, i + len))
    i += len
  }
  return chunks.join("\r\n ")
}

export function buildIcs(event: IcsEvent): string {
  const now = new Date()
  const organizer = event.organizer ?? {
    email: siteConfig.contact.infoEmail,
    name: siteConfig.name,
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcs(siteConfig.name)}//SIS//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcs(event.summary)}`,
  ]
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`)
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`)
  }
  if (event.url) {
    lines.push(`URL:${event.url}`)
  }
  lines.push(
    `ORGANIZER;CN=${escapeIcs(organizer.name ?? organizer.email)}:mailto:${organizer.email}`
  )
  for (const attendee of event.attendees ?? []) {
    lines.push(
      `ATTENDEE;CN=${escapeIcs(attendee.name ?? attendee.email)};RSVP=TRUE:mailto:${attendee.email}`
    )
  }
  lines.push("STATUS:CONFIRMED", "SEQUENCE:0", "END:VEVENT", "END:VCALENDAR")

  // Fold to 75-char content lines and join with CRLF (RFC 5545).
  return lines.map(fold).join("\r\n") + "\r\n"
}
