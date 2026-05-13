// Per-parent calendar subscription feed. URL:
//
//   /api/calendar/parent/<profileId>?token=<hmac>
//
// Returns an .ics feed containing:
//   1. The school-wide academic calendar (events from calendar_events).
//   2. The parent's booked parent-teacher conferences for any of
//      their linked students.
//   3. Each linked student's class schedule for the current term, as
//      weekly recurring events keyed off the bell schedule.
//
// The token is an HMAC of the profileId (see lib/calendar-tokens.ts),
// so the URL is unguessable but stateless — no per-parent secret to
// store. Each parent grabs their personal URL from /parent and
// subscribes in Outlook / Google Calendar / Apple Calendar.

import { NextResponse } from "next/server"
import ical, {
  ICalCalendarMethod,
  ICalEventRepeatingFreq,
  ICalWeekday,
} from "ical-generator"
import { effectiveEnd } from "@/lib/events"
import { getAllEvents } from "@/lib/events-server"
import { categories } from "@/lib/categories"
import { verifyCalendarToken } from "@/lib/calendar-tokens"
import { periodMeetings, type Weekday } from "@/lib/scheduler"
import { siteConfig } from "@/lib/site"
import type { SectionPeriod } from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"

const WEEKDAY_TO_ICAL: Record<Weekday, ICalWeekday> = {
  mon: ICalWeekday.MO,
  tue: ICalWeekday.TU,
  wed: ICalWeekday.WE,
  thu: ICalWeekday.TH,
  fri: ICalWeekday.FR,
}

const WEEKDAY_TO_INDEX: Record<Weekday, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
}

// Returns the first date >= `from` whose weekday matches the given key.
function firstWeekdayOnOrAfter(from: Date, day: Weekday): Date {
  const target = WEEKDAY_TO_INDEX[day]
  const d = new Date(from)
  // getDay(): Sunday=0, Monday=1, ..., Saturday=6.
  const diff = (target - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  return d
}

// Combine a YYYY-MM-DD date + HH:MM time as Pacific local, return UTC Date.
// Approximation: treat all times as PST (UTC-8). Drift around DST is
// ≤1 hour per semester, acceptable for a personal calendar feed.
function pacificDateTimeToUtc(dateOnly: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number)
  const y = dateOnly.getFullYear()
  const mo = dateOnly.getMonth()
  const d = dateOnly.getDate()
  return new Date(Date.UTC(y, mo, d, (h ?? 0) + 8, m ?? 0))
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await context.params
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""

  if (!verifyCalendarToken(profileId, token)) {
    return new NextResponse("Forbidden — bad or missing token.", {
      status: 403,
    })
  }

  const supabase = getServiceSupabase()

  // Verify the profile actually exists and is a parent. If they
  // were demoted we still serve the feed since their subscription
  // already exists, but a missing profile means the URL is bogus.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, roles, active")
    .eq("id", profileId)
    .maybeSingle<{ id: string; email: string; roles: string[]; active: boolean }>()
  if (!profile) {
    return new NextResponse("Profile not found.", { status: 404 })
  }

  const cal = ical({
    name: `${siteConfig.name} — ${profile.email}`,
    description: `Personal school calendar for ${profile.email}.`,
    timezone: "America/Los_Angeles",
    prodId: { company: siteConfig.name, product: "Parent calendar feed" },
    method: ICalCalendarMethod.PUBLISH,
  })

  // ---- 1. School-wide events ----
  for (const ev of await getAllEvents()) {
    const start = new Date(ev.start + "T00:00:00")
    const end = new Date(effectiveEnd(ev) + "T00:00:00")
    cal.createEvent({
      id: `school-${ev.id}`,
      start,
      end,
      allDay: ev.allDay ?? true,
      summary: ev.title,
      description: ev.description,
      location: ev.location,
      categories: [{ name: categories[ev.category].label }],
    })
  }

  // ---- 2. Conferences this parent has booked ----
  // We include slots booked under the parent's email OR slots booked
  // for any student this parent is linked to. The latter covers the
  // case where the co-parent did the booking — both parents still see
  // the conference in their personal feeds.
  const { data: linkedStudents } = await supabase
    .from("parent_links")
    .select("student_id")
    .eq("parent_profile_id", profileId)
    .returns<Array<{ student_id: string }>>()
  const studentIds = (linkedStudents ?? []).map((l) => l.student_id)

  const { data: slots } = studentIds.length > 0
    ? await supabase
        .from("conference_slots")
        .select(
          `id, start_at, end_at, parent_notes,
           teacher:profiles!conference_slots_teacher_profile_id_fkey(first_name, last_name, display_name, email),
           student:students(legal_first_name, legal_last_name, preferred_name),
           event:conference_events(name, slot_minutes)`
        )
        .in("booked_for_student_id", studentIds)
        .is("cancelled_at", null)
        .returns<
          Array<{
            id: string
            start_at: string
            end_at: string
            parent_notes: string | null
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
          }>
        >()
    : { data: [] }

  for (const slot of slots ?? []) {
    const teacherName = slot.teacher
      ? `${slot.teacher.first_name ?? ""} ${slot.teacher.last_name ?? ""}`.trim() ||
        slot.teacher.display_name ||
        slot.teacher.email
      : "Teacher"
    const studentName = slot.student
      ? slot.student.preferred_name?.trim() ||
        `${slot.student.legal_first_name} ${slot.student.legal_last_name}`
      : "Student"
    cal.createEvent({
      id: `conference-${slot.id}`,
      start: new Date(slot.start_at),
      end: new Date(slot.end_at),
      summary: `${teacherName} ↔ ${studentName} — ${slot.event?.name ?? "Conference"}`,
      description:
        `Parent-teacher conference for ${studentName} with ${teacherName}.` +
        (slot.parent_notes ? `\n\nNotes:\n${slot.parent_notes}` : "") +
        `\n\nManage at ${siteConfig.url}/parent/conferences`,
      location: siteConfig.name,
      categories: [{ name: "Conferences" }],
    })
  }

  // ---- 3. Class schedule for the current term ----
  // Each enrollment in an enrolled/audit section in the current term
  // generates a weekly-recurring VEVENT per period meeting in the bell
  // schedule. RRULE caps at term.end_date so the recurrence doesn't
  // run forever.
  if (studentIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `id, status,
         student:students(legal_first_name, legal_last_name, preferred_name),
         section:course_sections(
           id, section_code, period, room, modality,
           course:courses(code, name),
           term:terms!inner(id, name, start_date, end_date, is_current),
           teacher:profiles(first_name, last_name, display_name, email)
         )`
      )
      .in("student_id", studentIds)
      .in("status", ["enrolled", "audit"])
      .eq("section.term.is_current", true)
      .returns<
        Array<{
          id: string
          status: string
          student: {
            legal_first_name: string
            legal_last_name: string
            preferred_name: string | null
          } | null
          section: {
            id: string
            section_code: string | null
            period: SectionPeriod | null
            room: string | null
            modality: string
            course: { code: string; name: string } | null
            term: {
              id: string
              name: string
              start_date: string
              end_date: string
              is_current: boolean
            } | null
            teacher: {
              first_name: string | null
              last_name: string | null
              display_name: string | null
              email: string
            } | null
          } | null
        }>
      >()

    for (const e of enrollments ?? []) {
      if (!e.section || !e.section.term || !e.section.period) continue
      if (e.section.period === "async") continue
      const meetings = periodMeetings[e.section.period]
      if (meetings.length === 0) continue

      const termStart = new Date(e.section.term.start_date + "T00:00:00")
      const termEnd = new Date(e.section.term.end_date + "T00:00:00")
      const studentName = e.student
        ? e.student.preferred_name?.trim() ||
          `${e.student.legal_first_name} ${e.student.legal_last_name}`
        : "Student"
      const teacherName = e.section.teacher
        ? `${e.section.teacher.first_name ?? ""} ${e.section.teacher.last_name ?? ""}`.trim() ||
          e.section.teacher.display_name ||
          e.section.teacher.email
        : null
      const courseName = e.section.course?.name ?? "Class"

      for (const meeting of meetings) {
        const firstDay = firstWeekdayOnOrAfter(termStart, meeting.day)
        // If the first occurrence is past the term end (e.g. an odd
        // term-start day combined with this period's weekdays), skip.
        if (firstDay > termEnd) continue

        cal.createEvent({
          id: `class-${e.id}-${meeting.day}-${meeting.start}`,
          start: pacificDateTimeToUtc(firstDay, meeting.start),
          end: pacificDateTimeToUtc(firstDay, meeting.end),
          summary: `${studentName} — ${courseName}`,
          description:
            teacherName
              ? `${courseName} with ${teacherName}${e.section.room ? ` · Room ${e.section.room}` : ""}`
              : courseName,
          location: e.section.room ?? siteConfig.name,
          categories: [{ name: "Classes" }],
          repeating: {
            freq: ICalEventRepeatingFreq.WEEKLY,
            byDay: [WEEKDAY_TO_ICAL[meeting.day]],
            // RRULE UNTIL takes a UTC datetime per spec; ical-generator
            // handles the format. Bump to end-of-day Pacific so the
            // last week's classes are included.
            until: pacificDateTimeToUtc(termEnd, "23:59"),
          },
        })
      }
    }
  }

  return new Response(cal.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${siteConfig.shortName.toLowerCase()}-parent.ics"`,
      // Tight cache so a newly-booked conference shows up within ~5 min.
      "Cache-Control": "private, max-age=300",
    },
  })
}
