import { notFound } from "next/navigation"
import {
  listAttendanceForSectionAndDate,
  todayInPacific,
} from "@/lib/attendance"
import { listEnrollmentsForSection } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import { AttendanceEntry } from "@/components/attendance/AttendanceEntry"
import {
  listParentContactsForStudent,
  type ParentContact,
} from "@/lib/parent-contact"
import {
  isNonSchoolDay,
  listCalendarEvents,
  type CalendarEventRow,
} from "@/lib/calendar-events"

export const dynamic = "force-dynamic"

export default async function FacultyAttendanceEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { id: sectionId } = await params
  const { date: dateParam } = await searchParams

  const { section } = await assertCanEditSection(sectionId)
  if (!section) notFound()

  const isoDateMatcher = /^\d{4}-\d{2}-\d{2}$/
  const date = dateParam && isoDateMatcher.test(dateParam) ? dateParam : todayInPacific()

  const [enrollments, attendance, calendarEvents] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDate(section.id, date),
    listCalendarEvents(),
  ])

  // Find any non-school event that covers this date.
  const nonSchoolEvent: CalendarEventRow | null = isNonSchoolDay(date, calendarEvents)
    ? calendarEvents.find((ev) => {
        if (ev.category !== "holiday" && ev.category !== "faculty") return false
        const endExclusive =
          ev.end_date ??
          (() => {
            const [y, m, d] = ev.start_date.split("-").map(Number)
            const dt = new Date(Date.UTC(y, m - 1, d, 12))
            dt.setUTCDate(dt.getUTCDate() + 1)
            return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
          })()
        return date >= ev.start_date && date < endExclusive
      }) ?? null
    : null

  // Pre-fetch parent contacts so each row gets a one-click mailto: with
  // the tardy template pre-filled. Skipped students with no parents on
  // file with comms enabled get no link (the component handles that).
  const parentContactsByStudent = new Map<string, ParentContact[]>()
  await Promise.all(
    enrollments
      .map((e) => e.student?.id)
      .filter((id): id is string => Boolean(id))
      .map(async (sid) => {
        parentContactsByStudent.set(sid, await listParentContactsForStudent(sid))
      })
  )

  const teacherDisplayName =
    section.teacher
      ? `${section.teacher.first_name ?? ""} ${section.teacher.last_name ?? ""}`.trim() ||
        section.teacher.display_name ||
        section.teacher.email
      : "Your teacher"

  return (
    <AttendanceEntry
      section={section}
      enrollments={enrollments}
      attendance={attendance}
      date={date}
      surface="faculty"
      parentContactsByStudent={parentContactsByStudent}
      teacherDisplayName={teacherDisplayName}
      nonSchoolEvent={nonSchoolEvent}
    />
  )
}
