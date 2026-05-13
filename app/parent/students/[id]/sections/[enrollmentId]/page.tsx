import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { listAttendanceForEnrollment } from "@/lib/attendance"
import {
  listAssignmentCategories,
  listPublishedAssignmentsForSection,
  listScoresForEnrollment,
} from "@/lib/gradebook"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentDetail,
} from "@/lib/sis"
import { StudentSectionDetail } from "@/components/portal/StudentSectionDetail"

export const dynamic = "force-dynamic"

export default async function ParentStudentSectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; enrollmentId: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) {
    redirect("/admin/sign-in")
  }

  const { id: studentId, enrollmentId } = await params

  const isAdmin = session.isAdmin === true
  let canViewGrades = true
  let canViewAttendance = true

  if (!isAdmin) {
    if (!profile.roles.includes("parent")) {
      redirect("/admin/sign-in")
    }
    const link = await getParentLinkForStudent(profile.id, studentId)
    if (!link) {
      notFound()
    }
    if (!link.can_view_grades) {
      // No grade visibility = no point showing the per-section drilldown
      // either, since the whole page is grade-shaped. Send them back.
      redirect(`/parent/students/${studentId}`)
    }
    canViewGrades = link.can_view_grades
    canViewAttendance = link.can_view_attendance
  }

  const student = await getStudentDetail(studentId)
  if (!student) {
    notFound()
  }

  const enrollment = student.enrollments.find((e) => e.id === enrollmentId)
  if (!enrollment || !enrollment.section) {
    notFound()
  }

  const [categories, publishedAssignments, scores, attendance] = await Promise.all([
    listAssignmentCategories(enrollment.section.id),
    listPublishedAssignmentsForSection(enrollment.section.id),
    listScoresForEnrollment(enrollment.id),
    canViewAttendance ? listAttendanceForEnrollment(enrollment.id) : Promise.resolve([]),
  ])

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
    : `${student.legal_first_name} ${student.legal_last_name}`

  return (
    <StudentSectionDetail
      enrollment={enrollment}
      categories={categories}
      publishedAssignments={publishedAssignments}
      scores={scores}
      attendance={attendance}
      backHref={`/parent/students/${studentId}`}
      backLabel={`Back to ${displayName}`}
      studentSubtitle={displayName}
      showAttendance={canViewAttendance}
    />
  )
}
