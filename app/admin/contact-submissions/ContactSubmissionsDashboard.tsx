import Link from "next/link"
import {
  ContactSubmissionRecord,
  ContactSubmissionSummary,
  ContactSubmissionWorkflowStatus,
  normalizeContactSubmissionStatus,
} from "@/lib/contact-submissions"
import {
  deleteArchivedContactSubmissionAction,
  replyContactSubmissionAction,
  updateContactSubmissionAction,
} from "./actions"
import { siteConfig } from "@/lib/site"

export const submissionSortOptions = ["oldest", "newest", "tour", "name"] as const

export type SubmissionSortOption = (typeof submissionSortOptions)[number]

type DashboardMode = "active" | "archived"

type DashboardFilters = {
  status: ContactSubmissionWorkflowStatus | "all"
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

function formatStatusLabel(status: ContactSubmissionWorkflowStatus) {
  if (status === "new") {
    return "Needs response"
  }

  if (status === "follow_up") {
    return "In follow-up"
  }

  if (status === "tour_scheduled") {
    return "Tour scheduled"
  }

  if (status === "tour_completed") {
    return "Awaiting decision"
  }

  return "Archived"
}

function getStatusBadgeClassName(status: ContactSubmissionWorkflowStatus) {
  if (status === "new") {
    return "border border-amber-200 bg-amber-50 text-amber-700"
  }

  if (status === "follow_up") {
    return "border border-sky-200 bg-sky-50 text-sky-700"
  }

  if (status === "tour_scheduled") {
    return "border border-brand-orange/20 bg-brand-orange/10 text-brand-orange"
  }

  if (status === "tour_completed") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  return "border border-slate-200 bg-slate-100 text-slate-600"
}

function getPriorityBadge(submission: ContactSubmissionRecord) {
  if (normalizeContactSubmissionStatus(submission.status) !== "new") {
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

  const defaultSort = "newest"

  if (nextFilters.sort !== defaultSort) {
    params.set("sort", nextFilters.sort)
  }

  const query = params.toString()

  return query ? `${basePath}?${query}` : basePath
}

function getQueueTabs(mode: DashboardMode, filters: DashboardFilters, summary: ContactSubmissionSummary) {
  return [
    {
      label: "Active queue",
      count: summary.activeCount,
      href: buildDashboardHref("active", filters, { status: "all", tour: "all" }),
      active: mode === "active" && filters.status === "all" && filters.tour === "all",
    },
    {
      label: "Needs response",
      count: summary.needsResponseCount,
      href: buildDashboardHref("active", filters, { status: "new", tour: "all" }),
      active: mode === "active" && filters.status === "new" && filters.tour === "all",
    },
    {
      label: "In follow-up",
      count: summary.followUpCount,
      href: buildDashboardHref("active", filters, { status: "follow_up", tour: "all" }),
      active: mode === "active" && filters.status === "follow_up" && filters.tour === "all",
    },
    {
      label: "Tour scheduled",
      count: summary.tourScheduledCount,
      href: buildDashboardHref("active", filters, { status: "tour_scheduled", tour: "all" }),
      active: mode === "active" && filters.status === "tour_scheduled" && filters.tour === "all",
    },
    {
      label: "Awaiting decision",
      count: summary.tourCompletedCount,
      href: buildDashboardHref("active", filters, { status: "tour_completed", tour: "all" }),
      active: mode === "active" && filters.status === "tour_completed" && filters.tour === "all",
    },
    {
      label: "Archived",
      count: summary.archivedCount,
      href: buildDashboardHref("archived", filters, { tour: "all" }),
      active: mode === "archived",
    },
  ]
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
  const queueTabs = getQueueTabs(mode, filters, summary)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {isArchivedView ? "Archived submissions" : "Contact submissions"}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          {isArchivedView
            ? "Keep archived conversations out of the main queue, but restore them anytime if the office team needs them again."
            : "Work the active queue first. Keep each row compact, use notes for handoff context, and move finished conversations into the archive once the front desk is done with them."}
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {queueTabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              tab.active
                ? "bg-brand-navy text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                tab.active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </nav>

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
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="tour">Tour requests first</option>
                <option value="name">Parent name A-Z</option>
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
              const normalizedStatus = normalizeContactSubmissionStatus(submission.status)
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
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(normalizedStatus)}`}>
                            {formatStatusLabel(normalizedStatus)}
                          </span>
                          {submission.schedule_tour &&
                            normalizedStatus !== "tour_scheduled" &&
                            normalizedStatus !== "tour_completed" && (
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
                            Parent/guardian
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{submission.name}</p>
                        </div>
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
                            Student name
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{submission.student_name}</p>
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
                      <form
                        action={replyContactSubmissionAction}
                        className="space-y-3 rounded-3xl border border-brand-navy/15 bg-white p-5"
                      >
                        <input type="hidden" name="id" value={submission.id} />
                        <input type="hidden" name="redirectTo" value={currentPath} />

                        <div>
                          <p className="text-sm font-semibold text-brand-navy">
                            Reply to {submission.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Sends from{" "}
                            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">
                              {siteConfig.contact.infoEmail}
                            </code>{" "}
                            (the office shared mailbox — replies land there, not in
                            your personal inbox). Your faculty-bio signature is
                            appended automatically so the family sees who wrote.
                          </p>
                        </div>

                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">Subject</span>
                          <input
                            name="subject"
                            required
                            maxLength={200}
                            defaultValue={`Re: your ${siteConfig.shortName} inquiry`}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>

                        <label className="space-y-1 text-xs font-medium text-slate-700">
                          <span className="block">Message</span>
                          <textarea
                            name="body"
                            required
                            rows={6}
                            placeholder={`Hi ${submission.name.split(" ")[0]},\n\nThanks for reaching out about HBA…`}
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          />
                        </label>

                        <label className="flex items-start gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            name="advance_status"
                            defaultChecked
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                          />
                          <span>
                            Also move this submission to <em>In follow-up</em>{" "}
                            (only applies when status is currently{" "}
                            <em>Needs response</em>).
                          </span>
                        </label>

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                        >
                          Send reply
                        </button>
                      </form>

                      <form action={updateContactSubmissionAction} className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                        <input type="hidden" name="id" value={submission.id} />
                        <input type="hidden" name="redirectTo" value={currentPath} />

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          <span className="block">Status</span>
                          <select
                            name="status"
                            defaultValue={normalizedStatus}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="new">Needs response</option>
                            <option value="follow_up">In follow-up</option>
                            <option value="tour_scheduled">Tour scheduled</option>
                            <option value="tour_completed">Tour happened / awaiting decision</option>
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
  )
}