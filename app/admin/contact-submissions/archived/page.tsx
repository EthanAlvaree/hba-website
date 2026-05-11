import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  getContactSubmissionSummary,
  listContactSubmissions,
} from "@/lib/contact-submissions"
import ContactSubmissionsDashboard, {
  submissionSortOptions,
  SubmissionSortOption,
  sortContactSubmissions,
} from "../ContactSubmissionsDashboard"

type ArchivedContactSubmissionsPageProps = {
  searchParams: Promise<{
    tour?: string
    sort?: string
  }>
}

function buildPath(search: {
  tour: string
  sort: SubmissionSortOption
}) {
  const params = new URLSearchParams()

  if (search.tour !== "all") {
    params.set("tour", search.tour)
  }

  if (search.sort !== "newest") {
    params.set("sort", search.sort)
  }

  const query = params.toString()

  return query
    ? `/admin/contact-submissions/archived?${query}`
    : "/admin/contact-submissions/archived"
}

export const dynamic = "force-dynamic"

export default async function ArchivedContactSubmissionsPage({
  searchParams,
}: ArchivedContactSubmissionsPageProps) {
  const session = await auth()

  if (!isAllowedAdminEmail(session?.user?.email)) {
    redirect("/admin/sign-in")
  }

  const adminEmail = session?.user?.email ?? ""

  const params = await searchParams
  const tour = params.tour === "yes" || params.tour === "no" ? params.tour : "all"
  const sort = submissionSortOptions.includes(params.sort as SubmissionSortOption)
    ? (params.sort as SubmissionSortOption)
    : "newest"

  const [submissions, summary] = await Promise.all([
    listContactSubmissions({ view: "archived", tour }),
    getContactSubmissionSummary(),
  ])

  return (
    <ContactSubmissionsDashboard
      adminEmail={adminEmail}
      currentPath={buildPath({ tour, sort })}
      filters={{ status: "archived", tour, sort }}
      mode="archived"
      submissions={sortContactSubmissions(submissions, sort)}
      summary={summary}
    />
  )
}