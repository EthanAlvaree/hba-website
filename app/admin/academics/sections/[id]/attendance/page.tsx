import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listAttendanceForSectionAndDate,
  todayInPacific,
} from "@/lib/attendance"
import { getCourseSectionById, listEnrollmentsForSection } from "@/lib/sis"
import AcademicsHeader from "../../../AcademicsHeader"
import { AttendanceEntry } from "@/components/attendance/AttendanceEntry"
import {
  isNonSchoolDay,
  listCalendarEvents,
  type CalendarEventRow,
} from "@/lib/calendar-events"

export const dynamic = "force-dynamic"

export default async function AttendanceEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id: sectionId } = await params
  const { date: dateParam } = await searchParams

  const section = await getCourseSectionById(sectionId)
  if (!section) {
    notFound()
  }

  const isoDateMatcher = /^\d{4}-\d{2}-\d{2}$/
  const date = dateParam && isoDateMatcher.test(dateParam) ? dateParam : todayInPacific()

  const [enrollments, attendance, calendarEvents] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDate(section.id, date),
    listCalendarEvents(),
  ])

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

  return (
    <div className="space-y-6">
      <AcademicsHeader active="sections" />
      <AttendanceEntry
        section={section}
        enrollments={enrollments}
        attendance={attendance}
        date={date}
        surface="admin"
        nonSchoolEvent={nonSchoolEvent}
      />
    </div>
  )
}
