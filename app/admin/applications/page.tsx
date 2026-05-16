import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  applicationEnrollmentTypeSchema,
  applicationStatusSchema,
  getApplicationSummary,
  listApplications,
  type ApplicationEnrollmentType,
  type ApplicationStatus,
} from "@/lib/applications"
import { listApplicationDocumentsByIds } from "@/lib/application-storage"
import ApplicationsDashboard, {
  applicationSortOptions,
  sortApplications,
  type ApplicationSortOption,
} from "./ApplicationsDashboard"

type PaidFilter = "all" | "paid" | "unpaid"
const paidFilterValues: readonly PaidFilter[] = ["all", "paid", "unpaid"]

type ApplicationsPageProps = {
  searchParams: Promise<{
    status?: string
    enrollment_type?: string
    sort?: string
    paid?: string
  }>
}

function buildPath(search: {
  status: ApplicationStatus | "all"
  enrollmentType: ApplicationEnrollmentType | "all"
  sort: ApplicationSortOption
  paid: PaidFilter
}) {
  const params = new URLSearchParams()
  if (search.status !== "all") params.set("status", search.status)
  if (search.enrollmentType !== "all") params.set("enrollment_type", search.enrollmentType)
  if (search.sort !== "newest") params.set("sort", search.sort)
  if (search.paid !== "all") params.set("paid", search.paid)
  const query = params.toString()
  return query ? `/admin/applications?${query}` : "/admin/applications"
}

export const dynamic = "force-dynamic"

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const session = await auth()

  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const adminEmail = session?.user?.email ?? ""
  const params = await searchParams

  const parsedStatus = applicationStatusSchema.safeParse(params.status)
  const status: ApplicationStatus | "all" =
    parsedStatus.success && parsedStatus.data !== "archived" ? parsedStatus.data : "all"

  const parsedEnrollment = applicationEnrollmentTypeSchema.safeParse(params.enrollment_type)
  const enrollmentType: ApplicationEnrollmentType | "all" = parsedEnrollment.success
    ? parsedEnrollment.data
    : "all"

  const sort = applicationSortOptions.includes(params.sort as ApplicationSortOption)
    ? (params.sort as ApplicationSortOption)
    : "newest"

  const paid: PaidFilter = paidFilterValues.includes(params.paid as PaidFilter)
    ? (params.paid as PaidFilter)
    : "all"

  const [applications, summary] = await Promise.all([
    listApplications({
      view: "active",
      status,
      enrollmentType,
      paid,
    }),
    getApplicationSummary(),
  ])

  const documentsByApp = await listApplicationDocumentsByIds(
    applications.map((application) => application.id)
  )

  return (
    <ApplicationsDashboard
      adminEmail={adminEmail}
      currentPath={buildPath({ status, enrollmentType, sort, paid })}
      filters={{ status, enrollmentType, sort, paid }}
      mode="active"
      applications={sortApplications(applications, sort)}
      summary={summary}
      documentsByApp={documentsByApp}
    />
  )
}
