import Link from "next/link"
import {
  ContactSubmissionRecord,
  ContactSubmissionStatus,
  ContactSubmissionSummary,
} from "@/lib/contact-submissions"
import {
  deleteArchivedContactSubmissionAction,
  signOutAdminAction,
  updateContactSubmissionAction,
} from "./actions"

export const submissionSortOptions = ["oldest", "newest", "tour", "name"] as const

export type SubmissionSortOption = (typeof submissionSortOptions)[number]

type DashboardMode = "active" | "archived"

type DashboardFilters = {
  status: ContactSubmissionStatus | "all"
  tour: "yes" | "no" | "all"
  sort: SubmissionSortOption
}

type ContactSubmissionsDashboardProps = {
  adminEmail: string
  currentPath: string
  filters: DashboardFilters
  mode: DashboardMode
  submissions: ContactSubmissionRecord[]
  summary: ContactSubmissionSummary
}

const pacificTimeZone = "America/Los_Angeles"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacificTimeZone,
  }).format(new Date(value))
}

function formatRelativeTimestamp(value: string) {
  const timestamp = new Date(value).getTime()
  const diffMs = Date.now() - timestamp

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return formatTimestamp(value)
  }

  const minutes = Math.floor(diffMs / (1000 * 60))

  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return formatTimestamp(value)
}

function formatStatusLabel(status: ContactSubmissionStatus) {
  if (status === "new") {
    return "Needs response"
  }

  if (status === "contacted") {
    return "In follow-up"
  }

  return "Archived"
}

function getStatusBadgeClassName(status: ContactSubmissionStatus) {
  if (status === "new") {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  if (status === "contacted") {
    return "border border-sky-200 bg-sky-50 text-sky-700"
  }

  return "border border-slate-200 bg-slate-100 text-slate-600"
}

function getPriorityBadge(submission: ContactSubmissionRecord) {
  if (submission.status !== "new") {
    return null
  }

  const ageHours = (Date.now() - new Date(submission.created_at).getTime()) / (1000 * 60 * 60)

  if (!Number.isFinite(ageHours) || ageHours < 24) {
    return null
  }

  if (ageHours >= 72) {
    return {
      label: "3+ days old",
      className: "border border-rose-200 bg-rose-50 text-rose-700",
    }
  }

  return {
    label: "24h+",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  }
}

function getMessagePreview(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim()

  if (normalized.length <= 140) {
    return normalized
  }

  return `${normalized.slice(0, 137)}...`
}

export function sortContactSubmissions(
  submissions: ContactSubmissionRecord[],
  sort: SubmissionSortOption
) {
  const sorted = [...submissions]

  sorted.sort((left, right) => {
    const leftTimestamp = new Date(left.created_at).getTime()
    const rightTimestamp = new Date(right.created_at).getTime()

    if (sort === "oldest") {
      return leftTimestamp - rightTimestamp
    }

    if (sort === "name") {
      return left.name.localeCompare(right.name)
    }

    if (sort === "tour") {
      if (left.schedule_tour !== right.schedule_tour) {
        return left.schedule_tour ? -1 : 1
      }

      return leftTimestamp - rightTimestamp
    }

    return rightTimestamp - leftTimestamp
  })

  return sorted
}

function buildDashboardHref(
  mode: DashboardMode,
  filters: DashboardFilters,
  overrides: Partial<DashboardFilters>
) {
  const nextFilters = { ...filters, ...overrides }
  const params = new URLSearchParams()
  const basePath =
    mode === "archived"
      ? "/admin/contact-submissions/archived"
      : "/admin/contact-submissions"

  if (mode === "active" && nextFilters.status !== "all") {
    params.set("status", nextFilters.status)
  }

  if (nextFilters.tour !== "all") {
    params.set("tour", nextFilters.tour)
  }

  const defaultSort = mode === "archived" ? "newest" : "oldest"

  if (nextFilters.sort !== defaultSort) {
    params.set("sort", nextFilters.sort)
  }

  const query = params.toString()

  return query ? `${basePath}?${query}` : basePath
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M7.5 3.75h5M2.5 5.417h15M8.333 9.167v4.166M11.667 9.167v4.166M4.167 5.417l.833 10c.067.8.735 1.416 1.538 1.416h6.924c.803 0 1.471-.616 1.538-1.416l.833-10M7.083 3.75l.278-.834a1.25 1.25 0 0 1 1.186-.853h2.906c.538 0 1.017.344 1.186.853l.278.834"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ContactSubmissionsDashboard({
  adminEmail,
  currentPath,
  filters,
  mode,
  submissions,
  summary,
}: ContactSubmissionsDashboardProps) {
  const isArchivedView = mode === "archived"
  const quickFilters = !isArchivedView
    ? [
        {
          label: "Active queue",
          count: summary.activeCount,
          href: buildDashboardHref(mode, filters, { status: "all", tour: "all" }),
          active: filters.status === "all" && filters.tour === "all",
          className: "text-brand-navy",
        },
        {
          label: "Needs response",
          count: summary.newCount,
          href: buildDashboardHref(mode, filters, { status: "new", tour: "all" }),
          active: filters.status === "new" && filters.tour === "all",
          className: "text-amber-700",
        },
        {
          label: "In follow-up",
          count: summary.contactedCount,
          href: buildDashboardHref(mode, filters, { status: "contacted", tour: "all" }),
          active: filters.status === "contacted" && filters.tour === "all",
          className: "text-sky-700",
        },
        {
          label: "Tour requests",
          count: summary.activeTourRequestedCount,
          href: buildDashboardHref(mode, filters, { status: "all", tour: "yes" }),
          active: filters.status === "all" && filters.tour === "yes",
          className: "text-brand-orange",
        },
      ]
    : []

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] bg-brand-navy px-8 py-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  Admin dashboard
                </p>
                <h1 className="text-4xl font-extrabold">
                  {isArchivedView ? "Archived submissions" : "Contact submissions"}
                </h1>
                <p className="max-w-3xl text-sm leading-relaxed text-white/80">
                  {isArchivedView
                    ? "Keep archived conversations out of the main queue, but restore them anytime if the office team needs them again."
                    : "Work the active queue first. Keep each row compact, use notes for handoff context, and move finished conversations into the archive once the front desk is done with them."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85">
                  Signed in as {adminEmail}
                </div>
                <form action={signOutAdminAction}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/contact-submissions"
                className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  !isArchivedView
                    ? "border-white bg-white text-brand-navy"
                    : "border-white/20 bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Active queue
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  !isArchivedView ? "bg-slate-100 text-brand-navy" : "bg-white/10 text-white"
                }`}>
                  {summary.activeCount}
                </span>
              </Link>

              <Link
                href="/admin/contact-submissions/archived"
                className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isArchivedView
                    ? "border-white bg-white text-brand-navy"
                    : "border-white/20 bg-transparent text-white hover:bg-white/10"
                }`}
              >
                Archived
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  isArchivedView ? "bg-slate-100 text-brand-navy" : "bg-white/10 text-white"
                }`}>
                  {summary.archivedCount}
                </span>
              </Link>
            </div>
          </div>
        </section>

        {!isArchivedView && (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickFilters.map((filter) => (
              <Link
                key={filter.label}
                href={filter.href}
                className={`rounded-[1.75rem] border px-5 py-5 shadow-sm transition ${
                  filter.active
                    ? "border-brand-navy/15 bg-brand-navy text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-brand-navy/20"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                    filter.active ? "text-white/70" : "text-slate-500"
                  }`}
                >
                  {filter.label}
                </p>
                <p className={`mt-3 text-3xl font-extrabold ${filter.active ? "text-white" : filter.className}`}>
                  {filter.count}
                </p>
              </Link>
            ))}
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <form
            className={`grid gap-4 ${
              isArchivedView
                ? "md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]"
                : "md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]"
            } md:items-end`}
          >
            {!isArchivedView && <input type="hidden" name="status" value={filters.status} />}

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Additional tour filter</span>
              <select
                name="tour"
                defaultValue={filters.tour}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">All inquiries</option>
                <option value="yes">Tour requested</option>
                <option value="no">No tour requested</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Sort order</span>
              <select
                name="sort"
                defaultValue={filters.sort}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
                <option value="tour">Tour requests first</option>
                <option value="name">Name A-Z</option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Apply advanced filters
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {submissions.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              {isArchivedView
                ? "No archived submissions matched the current filters."
                : "No active submissions matched the current filters."}
            </div>
          ) : (
            submissions.map((submission) => {
              const priorityBadge = getPriorityBadge(submission)

              return (
                <details
                  key={submission.id}
                  className="group rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
                >
                  <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.3fr)_auto] lg:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold text-brand-navy">
                            {submission.name}
                          </h2>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(submission.status)}`}>
                            {formatStatusLabel(submission.status)}
                          </span>
                          {submission.schedule_tour && (
                            <span className="rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
                              Tour requested
                            </span>
                          )}
                          {submission.notes && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              Has notes
                            </span>
                          )}
                          {priorityBadge && (
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${priorityBadge.className}`}>
                              {priorityBadge.label}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                          <span>{submission.email}</span>
                          <span>{submission.phone}</span>
                          <span>Student: {submission.student_name}</span>
                        </div>
                      </div>

                      <div className="min-w-0 space-y-2 text-sm text-slate-600">
                        <p className="font-medium text-slate-700">{getMessagePreview(submission.message)}</p>
                        <p className="text-xs text-slate-500">
                          Heard about HBA: {submission.how_did_you_hear ?? "Not provided"}
                        </p>
                      </div>

                      <div className="flex flex-row items-center justify-between gap-4 lg:flex-col lg:items-end">
                        <div className="text-right text-xs text-slate-500">
                          <p className="font-semibold text-slate-700">
                            {formatRelativeTimestamp(submission.created_at)}
                          </p>
                          <p>{formatTimestamp(submission.created_at)}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition group-open:border-brand-navy/20 group-open:text-brand-navy">
                          Open details
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="grid gap-6 border-t border-slate-200 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Email
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{submission.email}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Phone
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{submission.phone}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Student
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{submission.student_name}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Queue state
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatStatusLabel(submission.status)}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Tour interest
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {submission.schedule_tour ? "Requested" : "No tour requested"}
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Source
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {submission.how_did_you_hear ?? "Not provided"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl bg-slate-50 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Message
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {submission.message}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <form action={updateContactSubmissionAction} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                        <input type="hidden" name="id" value={submission.id} />
                        <input type="hidden" name="redirectTo" value={currentPath} />

                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900">Front desk triage</p>
                          <p className="text-sm text-slate-600">
                            Use <strong>Contacted</strong> after an email, call, or tour scheduling step. Use <strong>Archived</strong> once the conversation is complete.
                          </p>
                        </div>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          <span className="block">Status</span>
                          <select
                            name="status"
                            defaultValue={submission.status}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="new">Needs response</option>
                            <option value="contacted">Contacted / emailed / scheduled</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          <span className="block">Notes</span>
                          <textarea
                            name="notes"
                            rows={5}
                            defaultValue={submission.notes ?? ""}
                            placeholder="Add handoff notes, scheduled tour details, or next steps for the front desk team."
                            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          />
                        </label>

                        {submission.archived_at && (
                          <p className="text-xs text-slate-500">
                            Archived on {formatTimestamp(submission.archived_at)}
                          </p>
                        )}

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Save triage
                        </button>
                      </form>

                      {isArchivedView && (
                        <form action={deleteArchivedContactSubmissionAction} className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5">
                          <input type="hidden" name="id" value={submission.id} />
                          <input type="hidden" name="redirectTo" value={currentPath} />

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-rose-800">Permanent delete</p>
                              <p className="text-sm text-rose-700">
                                Use this only for spam, test entries, or obvious junk. This removes the submission from the archive for good.
                              </p>
                            </div>

                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              aria-label={`Delete ${submission.name} permanently`}
                              title="Delete permanently"
                            >
                              <TrashIcon />
                              Delete forever
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </details>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}