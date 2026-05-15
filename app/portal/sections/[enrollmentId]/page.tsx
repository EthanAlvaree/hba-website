import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { listAttendanceForEnrollment } from "@/lib/attendance"
import {
  listAssignmentCategories,
  listPublishedAssignmentsForSection,
  listScoresForEnrollment,
} from "@/lib/gradebook"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
} from "@/lib/sis"
import { StudentSectionDetail } from "@/components/portal/StudentSectionDetail"
import { listAnnouncementsForSection } from "@/lib/announcements"

export const dynamic = "force-dynamic"

export default async function StudentPortalSectionPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) {
    redirect("/portal")
  }

  const studentStub = await getStudentByProfileId(profile.id)
  if (!studentStub) {
    redirect("/")
  }

  const student = await getStudentDetail(studentStub.id)
  if (!student) {
    redirect("/")
  }

  const { enrollmentId } = await params

  const enrollment = student.enrollments.find((e) => e.id === enrollmentId)
  if (!enrollment || !enrollment.section) {
    notFound()
  }

  const [categories, publishedAssignments, scores, attendance, announcements] = await Promise.all([
    listAssignmentCategories(enrollment.section.id),
    listPublishedAssignmentsForSection(enrollment.section.id),
    listScoresForEnrollment(enrollment.id),
    listAttendanceForEnrollment(enrollment.id),
    listAnnouncementsForSection(enrollment.section.id),
  ])

  const studentDisplayName =
    student.preferred_name?.trim() ||
    `${student.legal_first_name} ${student.legal_last_name}`.trim() ||
    profile.email

  return (
    <StudentSectionDetail
      enrollment={enrollment}
      categories={categories}
      publishedAssignments={publishedAssignments}
      scores={scores}
      attendance={attendance}
      announcements={announcements}
      backHref="/portal"
      backLabel="Back to portal"
      contactAudience="student"
      fromName={studentDisplayName}
    />
  )
}
