import { notFound } from "next/navigation"
import { listAssignmentCategories, listAssignments } from "@/lib/gradebook"
import { assertCanEditSection } from "@/lib/section-auth"
import { GradebookSetup } from "@/components/gradebook/GradebookSetup"

export const dynamic = "force-dynamic"

export default async function FacultyGradebookSetupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { section } = await assertCanEditSection(id)
  if (!section) notFound()

  const [categories, assignments] = await Promise.all([
    listAssignmentCategories(section.id),
    listAssignments(section.id),
  ])

  return (
    <GradebookSetup
      section={section}
      categories={categories}
      assignments={assignments}
      surface="faculty"
    />
  )
}
