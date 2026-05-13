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

  const [enrollments, attendance] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDateRange(
      section.id,
      weekDates[0],
      weekDates[weekDates.length - 1]
    ),
  ])

  return (
    <div className="space-y-6">
      <AcademicsHeader active="sections" />
      <AttendanceWeekGrid
        section={section}
        enrollments={enrollments}
        attendance={attendance}
        weekDates={weekDates}
        surface="admin"
      />
    </div>
  )
}
