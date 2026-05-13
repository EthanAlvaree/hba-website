import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getAssignmentWithCategory,
  listScoresForAssignment,
} from "@/lib/gradebook"
import { getCourseSectionById, listEnrollmentsForSection } from "@/lib/sis"
import AcademicsHeader from "../../../../../AcademicsHeader"
import { ScoreEntry } from "@/components/gradebook/ScoreEntry"

export const dynamic = "force-dynamic"

export default async function ScoreEntryPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id: sectionId, assignmentId } = await params

  const [section, assignment] = await Promise.all([
    getCourseSectionById(sectionId),
    getAssignmentWithCategory(assignmentId),
  ])

  if (!section || !assignment || assignment.section_id !== section.id) {
    notFound()
  }

  const [enrollments, scores] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listScoresForAssignment(assignment.id),
  ])

  return (
    <div className="space-y-6">
      <AcademicsHeader active="sections" />
      <ScoreEntry
        section={section}
        assignment={assignment}
        enrollments={enrollments}
        scores={scores}
        surface="admin"
      />
    </div>
  )
}
