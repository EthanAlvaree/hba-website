import { notFound } from "next/navigation"
import {
  listAttendanceForSectionAndDate,
  todayInPacific,
} from "@/lib/attendance"
import { listEnrollmentsForSection } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import { AttendanceEntry } from "@/components/attendance/AttendanceEntry"

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

  const [enrollments, attendance] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAttendanceForSectionAndDate(section.id, date),
  ])

  return (
    <AttendanceEntry
      section={section}
      enrollments={enrollments}
      attendance={attendance}
      date={date}
      surface="faculty"
    />
  )
}
