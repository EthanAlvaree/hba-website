import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { listAssignmentCategories, listAssignments } from "@/lib/gradebook"
import { getCourseSectionById } from "@/lib/sis"
import AcademicsHeader from "../../../AcademicsHeader"
import { GradebookSetup } from "@/components/gradebook/GradebookSetup"

export const dynamic = "force-dynamic"

export default async function GradebookSetupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params

  const section = await getCourseSectionById(id)
  if (!section) {
    notFound()
  }

  const [categories, assignments] = await Promise.all([
    listAssignmentCategories(section.id),
    listAssignments(section.id),
  ])

  return (
    <div className="space-y-6">
      <AcademicsHeader active="sections" />
      <GradebookSetup
        section={section}
        categories={categories}
        assignments={assignments}
        surface="admin"
      />
    </div>
  )
}
