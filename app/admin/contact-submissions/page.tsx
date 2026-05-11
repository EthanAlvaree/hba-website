import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  contactSubmissionStatusSchema,
  getContactSubmissionSummary,
  listContactSubmissions,
  normalizeContactSubmissionStatus,
  ContactSubmissionWorkflowStatus,
} from "@/lib/contact-submissions"
import ContactSubmissionsDashboard, {
  submissionSortOptions,
  SubmissionSortOption,
  sortContactSubmissions,
} from "./ContactSubmissionsDashboard"

type ContactSubmissionsPageProps = {
  searchParams: Promise<{
    status?: string
    tour?: string
    sort?: string
  }>
}

function buildPath(search: {
  status: ContactSubmissionWorkflowStatus | "all"
  tour: string
  sort: SubmissionSortOption
}) {
  const params = new URLSearchParams()

  if (search.status !== "all") {
    params.set("status", search.status)
  }

  if (search.tour !== "all") {
    params.set("tour", search.tour)
  }

  if (search.sort !== "newest") {
    params.set("sort", search.sort)
  }

  const query = params.toString()

  return query ? `/admin/contact-submissions?${query}` : "/admin/contact-submissions"
}

export const dynamic = "force-dynamic"

export default async function ContactSubmissionsPage({ searchParams }: ContactSubmissionsPageProps) {
  const session = await auth()

  if (!isAllowedAdminEmail(session?.user?.email)) {
    redirect("/admin/sign-in")
  }

  const adminEmail = session?.user?.email ?? ""

  const params = await searchParams
  const parsedStatus = contactSubmissionStatusSchema.safeParse(params.status)
  const status =
    parsedStatus.success && normalizeContactSubmissionStatus(parsedStatus.data) !== "archived"
      ? normalizeContactSubmissionStatus(parsedStatus.data)
      : "all"
  const tour = params.tour === "yes" || params.tour === "no" ? params.tour : "all"
  const sort = submissionSortOptions.includes(params.sort as SubmissionSortOption)
    ? (params.sort as SubmissionSortOption)
    : "newest"

  const [submissions, summary] = await Promise.all([
    listContactSubmissions({ view: "active", status, tour }),
    getContactSubmissionSummary(),
  ])

  return (
    <ContactSubmissionsDashboard
      adminEmail={adminEmail}
      currentPath={buildPath({ status, tour, sort })}
      filters={{ status, tour, sort }}
      mode="active"
      submissions={sortContactSubmissions(submissions, sort)}
      summary={summary}
    />
  )
}