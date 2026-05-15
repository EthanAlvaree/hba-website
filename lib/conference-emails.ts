// lib/conference-emails.ts
//
// Email helpers for parent-teacher conferences. Two surfaces:
//
//   1. sendConferenceBookingConfirmation — fires immediately when a
//      parent books a slot. Both parents on file (booker + any
//      co-parent linked to the same student with
//      can_receive_communications=true) get the email and the ICS
//      attachment, so the conference lands in everyone's calendar.
//
//   2. buildConferenceReminderEmail — pure builder; used by the
//      conference-reminders cron to render the same email shape with
//      slightly different copy ("tomorrow" vs "you just booked").
//
// Both call into the same ICS builder so calendar invites are
// consistent between booking-time and reminder-time.

import "server-only"
import { buildIcs } from "@/lib/ics"
import { sendCustomEmail } from "@/lib/graph"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"

const pacific = "America/Los_Angeles"

function escHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatHumanWhen(startIso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: pacific,
  }).format(new Date(startIso))
}

export type ConferenceSlotForEmail = {
  id: string
  start_at: string
  end_at: string
  parent_notes: string | null
  booked_by_parent_email: string
  booked_for_student_id: string | null
  teacher: {
    first_name: string | null
    last_name: string | null
    display_name: string | null
    email: string
  } | null
  student: {
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
  } | null
  event: { name: string; slot_minutes: number } | null
}

/** Find every other parent linked to the given student who should
 *  also receive conference communications. Excludes the original
 *  booker and any parent_link with can_receive_communications=false. */
export async function findCoParentEmails(
  studentId: string,
  excludeEmail: string
): Promise<string[]> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("parent_links")
    .select(
      "can_receive_communications, parent:profiles(email, active)"
    )
    .eq("student_id", studentId)
    .eq("can_receive_communications", true)
    .returns<
      Array<{
        can_receive_communications: boolean
        parent: { email: string; active: boolean } | null
      }>
    >()

  const excludeLower = excludeEmail.toLowerCase()
  const out = new Set<string>()
  for (const row of data ?? []) {
    const email = row.parent?.email?.toLowerCase()
    if (!email) continue
    if (!row.parent?.active) continue
    if (email === excludeLower) continue
    out.add(email)
  }
  return Array.from(out)
}

type BuildBodyOptions = {
  slot: ConferenceSlotForEmail
  /** Heading + intro phrasing differ by use case. */
  variant: "booking_confirmation" | "reminder"
}

function buildBody({ slot, variant }: BuildBodyOptions): {
  subject: string
  htmlBody: string
} {
  const teacherName = slot.teacher
    ? `${slot.teacher.first_name ?? ""} ${slot.teacher.last_name ?? ""}`.trim() ||
      slot.teacher.display_name ||
      slot.teacher.email
    : "your teacher"
  const studentName = slot.student
    ? slot.student.preferred_name?.trim() ||
      `${slot.student.legal_first_name} ${slot.student.legal_last_name}`
    : "your student"
  const eventName = slot.event?.name ?? "the conference"
  const minutes = slot.event?.slot_minutes ?? 15
  const when = formatHumanWhen(slot.start_at)

  const subject =
    variant === "booking_confirmation"
      ? `Booked: ${teacherName} conference for ${studentName}`
      : `Reminder: your ${teacherName} conference is tomorrow`
  const leadingP =
    variant === "booking_confirmation"
      ? `<p>Your parent-teacher conference is booked. Calendar invite attached — open it on your phone or in Outlook and it'll land in your calendar.</p>`
      : `<p>This is a reminder of your parent-teacher conference for <strong>${escHtml(studentName)}</strong>, scheduled for tomorrow:</p>`

  const portalUrl = `${siteConfig.url}/parent/conferences`

  const htmlBody = [
    `<p>Hi,</p>`,
    leadingP,
    `<ul>`,
    `<li><strong>Student:</strong> ${escHtml(studentName)}</li>`,
    `<li><strong>Teacher:</strong> ${escHtml(teacherName)}</li>`,
    `<li><strong>When:</strong> ${escHtml(when)} (${minutes} minutes, Pacific time)</li>`,
    `<li><strong>Event:</strong> ${escHtml(eventName)}</li>`,
    `</ul>`,
    slot.parent_notes
      ? `<p><strong>Topic / notes you left when booking:</strong><br />${escHtml(slot.parent_notes).replace(/\n/g, "<br />")}</p>`
      : "",
    `<p>Need to cancel or reschedule? Sign in to the family portal at <a href="${portalUrl}">${siteConfig.domain}/parent/conferences</a>.</p>`,
    `<p>— ${escHtml(siteConfig.name)}</p>`,
  ].join("")

  return { subject, htmlBody }
}

/** Build the ICS calendar invite as a Buffer suitable for attaching
 *  to a Graph email. */
export function buildConferenceIcs(slot: ConferenceSlotForEmail): {
  filename: string
  content: string
} {
  const teacherName = slot.teacher
    ? `${slot.teacher.first_name ?? ""} ${slot.teacher.last_name ?? ""}`.trim() ||
      slot.teacher.display_name ||
      slot.teacher.email
    : "Teacher"
  const studentName = slot.student
    ? slot.student.preferred_name?.trim() ||
      `${slot.student.legal_first_name} ${slot.student.legal_last_name}`
    : "Student"
  const eventName = slot.event?.name ?? "Conference"

  const ics = buildIcs({
    uid: `conference-${slot.id}@${siteConfig.domain}`,
    start: new Date(slot.start_at),
    end: new Date(slot.end_at),
    summary: `${teacherName} ↔ ${studentName} — ${eventName}`,
    description:
      `Parent-teacher conference for ${studentName} with ${teacherName}.` +
      (slot.parent_notes ? `\n\nNotes:\n${slot.parent_notes}` : "") +
      `\n\nManage at ${siteConfig.url}/parent/conferences`,
    location: siteConfig.name,
    url: `${siteConfig.url}/parent/conferences`,
    attendees: slot.teacher
      ? [
          {
            email: slot.teacher.email,
            name: teacherName,
          },
        ]
      : [],
  })

  return { filename: "conference.ics", content: ics }
}

/** Send the booking confirmation email + ICS attachment to the
 *  booker and every co-parent on file. */
export async function sendConferenceBookingConfirmation(
  slot: ConferenceSlotForEmail
): Promise<{ to: string[]; cc: string[] }> {
  const { subject, htmlBody } = buildBody({ slot, variant: "booking_confirmation" })
  const ics = buildConferenceIcs(slot)
  const cc = slot.booked_for_student_id
    ? await findCoParentEmails(slot.booked_for_student_id, slot.booked_by_parent_email)
    : []

  await sendCustomEmail({
    subject,
    htmlBody,
    toRecipients: [slot.booked_by_parent_email],
    ccRecipients: cc,
    attachments: [
      {
        name: ics.filename,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
        content: ics.content,
      },
    ],
  })

  return { to: [slot.booked_by_parent_email], cc }
}

/** Shared builder for the reminder cron (next-day reminder). */
export function buildConferenceReminderEmail(slot: ConferenceSlotForEmail): {
  subject: string
  htmlBody: string
  icsFilename: string
  icsContent: string
} {
  const { subject, htmlBody } = buildBody({ slot, variant: "reminder" })
  const ics = buildConferenceIcs(slot)
  return {
    subject,
    htmlBody,
    icsFilename: ics.filename,
    icsContent: ics.content,
  }
}
