import { notFound } from "next/navigation"
import {
  listAttendanceForSectionAndDateRange,
  mondayOfWeekFor,
  todayInPacific,
  weekdayDatesStartingMonday,
} from "@/lib/attendance"
import { listEnrollmentsForSection } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import { AttendanceWeekGrid } from "@/components/attendance/AttendanceWeekGrid"
import { listCalendarEvents } from "@/lib/calendar-events"
import { categories } from "@/lib/categories"

export const dynamic = "force-dynamic"

export default async function FacultyAttendanceWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week_of?: string; saved?: string }>
}) {
  const { id: sectionId } = await params
  const { week_of: weekOfParam } = await searchParams

  const { section } = await assertCanEditSection(sectionId)
  if (!section) notFound()

  const isoDateMatcher = /^\d{4}-\d{2}-\d{2}$/
  const referenceDate =
    weekOfParam && isoDateMatcher.test(weekOfParam) ? weekOfParam : todayInPacific()
  const monday = mondayOfWeekFor(referenceDate)
  const weekDates = weekdayDatesStartingMonday(monday)

  const [enrollments, attendance, calendarEvents] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDateRange(
      section.id,
      weekDates[0],
      weekDates[weekDates.length - 1]
    ),
    listCalendarEvents(),
  ])

  // For each weekday in the range, figure out if it's a non-school day
  // (holiday or faculty in-service) and grab the matching event's label.
  const weekNonSchoolDays: Array<{ date: string; label: string }> = []
  for (const date of weekDates) {
    for (const ev of calendarEvents) {
      if (ev.category !== "holiday" && ev.category !== "faculty") continue
      const endExclusive =
        ev.end_date ??
        (() => {
          const [y, m, d] = ev.start_date.split("-").map(Number)
          const dt = new Date(Date.UTC(y, m - 1, d, 12))
          dt.setUTCDate(dt.getUTCDate() + 1)
          return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
        })()
      if (date >= ev.start_date && date < endExclusive) {
        weekNonSchoolDays.push({
          date,
          label: `${ev.title} (${categories[ev.category as keyof typeof categories]?.label ?? ev.category})`,
        })
        break
      }
    }
  }

  return (
    <AttendanceWeekGrid
      section={section}
      enrollments={enrollments}
      attendance={attendance}
      weekDates={weekDates}
      surface="faculty"
      weekNonSchoolDays={weekNonSchoolDays}
    />
  )
}
