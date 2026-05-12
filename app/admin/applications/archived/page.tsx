import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  applicationEnrollmentTypeSchema,
  getApplicationSummary,
  listApplications,
  type ApplicationEnrollmentType,
} from "@/lib/applications"
import { listApplicationDocumentsByIds } from "@/lib/application-storage"
import ApplicationsDashboard, {
  applicationSortOptions,
  sortApplications,
  type ApplicationSortOption,
} from "../ApplicationsDashboard"

type ArchivedApplicationsPageProps = {
  searchParams: Promise<{
    enrollment_type?: string
    sort?: string
  }>
}

function buildPath(search: {
  enrollmentType: ApplicationEnrollmentType | "all"
  sort: ApplicationSortOption
}) {
  const params = new URLSearchParams()
  if (search.enrollmentType !== "all") params.set("enrollment_type", search.enrollmentType)
  if (search.sort !== "newest") params.set("sort", search.sort)
  const query = params.toString()
  return query
    ? `/admin/applications/archived?${query}`
    : "/admin/applications/archived"
}

export const dynamic = "force-dynamic"

export default async function ArchivedApplicationsPage({
  searchParams,
}: ArchivedApplicationsPageProps) {
  const session = await auth()

  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const adminEmail = session?.user?.email ?? ""
  const params = await searchParams

  const parsedEnrollment = applicationEnrollmentTypeSchema.safeParse(params.enrollment_type)
  const enrollmentType: ApplicationEnrollmentType | "all" = parsedEnrollment.success
    ? parsedEnrollment.data
    : "all"

  const sort = applicationSortOptions.includes(params.sort as ApplicationSortOption)
    ? (params.sort as ApplicationSortOption)
    : "newest"

  const [applications, summary] = await Promise.all([
    listApplications({
      view: "archived",
      enrollmentType,
    }),
    getApplicationSummary(),
  ])

  const documentsByApp = await listApplicationDocumentsByIds(
    applications.map((application) => application.id)
  )

  return (
    <ApplicationsDashboard
      adminEmail={adminEmail}
      currentPath={buildPath({ enrollmentType, sort })}
      filters={{ status: "archived", enrollmentType, sort }}
      mode="archived"
      applications={sortApplications(applications, sort)}
      summary={summary}
      documentsByApp={documentsByApp}
    />
  )
}
