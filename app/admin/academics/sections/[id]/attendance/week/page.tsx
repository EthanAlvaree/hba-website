import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listAttendanceForSectionAndDateRange,
  mondayOfWeekFor,
  todayInPacific,
  weekdayDatesStartingMonday,
} from "@/lib/attendance"
import { getCourseSectionById, listEnrollmentsForSection } from "@/lib/sis"
import AcademicsHeader from "../../../../AcademicsHeader"
import { AttendanceWeekGrid } from "@/components/attendance/AttendanceWeekGrid"
import { listCalendarEvents } from "@/lib/calendar-events"
import { categories } from "@/lib/categories"

export const dynamic = "force-dynamic"

export default async function AdminAttendanceWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week_of?: string; saved?: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id: sectionId } = await params
  const { week_of: weekOfParam } = await searchParams

  const section = await getCourseSectionById(sectionId)
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
    <div className="space-y-6">
      <AcademicsHeader active="sections" />
      <AttendanceWeekGrid
        section={section}
        enrollments={enrollments}
        attendance={attendance}
        weekDates={weekDates}
        surface="admin"
        weekNonSchoolDays={weekNonSchoolDays}
      />
    </div>
  )
}
