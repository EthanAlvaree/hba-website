import { notFound } from "next/navigation"
import {
  getAssignmentWithCategory,
  isSectionTermLocked,
  listScoresForAssignment,
} from "@/lib/gradebook"
import { listEnrollmentsForSection } from "@/lib/sis"
import { assertCanEditSection } from "@/lib/section-auth"
import { ScoreEntry } from "@/components/gradebook/ScoreEntry"

export const dynamic = "force-dynamic"

export default async function FacultyScoreEntryPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>
}) {
  const { id: sectionId, assignmentId } = await params
  const { section } = await assertCanEditSection(sectionId)
  if (!section) notFound()

  const assignment = await getAssignmentWithCategory(assignmentId)
  if (!assignment || assignment.section_id !== section.id) {
    notFound()
  }

  const [enrollments, scores, termLocked] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listScoresForAssignment(assignment.id),
    isSectionTermLocked(section.id),
  ])

  return (
    <ScoreEntry
      section={section}
      assignment={assignment}
      enrollments={enrollments}
      scores={scores}
      surface="faculty"
      termLocked={termLocked}
    />
  )
}
