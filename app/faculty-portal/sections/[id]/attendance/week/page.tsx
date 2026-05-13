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

  const [enrollments, attendance] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDateRange(
      section.id,
      weekDates[0],
      weekDates[weekDates.length - 1]
    ),
  ])

  return (
    <AttendanceWeekGrid
      section={section}
      enrollments={enrollments}
      attendance={attendance}
      weekDates={weekDates}
      surface="faculty"
    />
  )
}
