// app/admin/applications/ApplicationsDashboard.tsx
//
// Compact roster of applications. Each row links to
// /admin/applications/[id] for the full editing surface (the
// expandable inline card pattern got too heavy as the app grew —
// status form, all-fields edit form, document manager, enroll form,
// payment reminder, delete — and the user had to scroll past the
// read-only copy of every field to reach the editable copy below
// it). The roster preserves the filter / sort / queue-tab UX.

import Link from "next/link"
import {
  ApplicationEnrollmentType,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationSummary,
} from "@/lib/applications"
import type { ApplicationDocumentRecord } from "@/lib/application-storage"
import { siteConfig } from "@/lib/site"

export const applicationSortOptions = ["newest", "oldest", "name"] as const

export type ApplicationSortOption = (typeof applicationSortOptions)[number]

type DashboardMode = "active" | "archived"
type PaidFilter = "all" | "paid" | "unpaid"

type DashboardFilters = {
  status: ApplicationStatus | "all"
  enrollmentType: ApplicationEnrollmentType | "all"
  sort: ApplicationSortOption
  paid: PaidFilter
}

type ApplicationsDashboardProps = {
  adminEmail: string
  currentPath: string
  filters: DashboardFilters
  mode: DashboardMode
  applications: ApplicationRecord[]
  summary: ApplicationSummary
  /** Currently unused on the roster (the detail page shows docs) but
   *  kept in the prop shape so page.tsx doesn't need a parallel
   *  refactor right now. */
  documentsByApp: Map<string, ApplicationDocumentRecord[]>
}

const pacificTimeZone = "America/Los_Angeles"

function formatTimestamp(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacificTimeZone,
  }).format(new Date(value))
}

function formatRelative(value: string) {
  const ms = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(ms) || ms < 0) return formatTimestamp(value)
  const minutes = Math.floor(ms / (1000 * 60))
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatTimestamp(value)
}

function formatStatusLabel(status: ApplicationStatus): string {
  switch (status) {
    case "draft": return "Draft"
    case "submitted": return "New submission"
    case "in_review": return "In review"
    case "info_requested": return "Info requested"
    case "admit_offered": return "Admit offered"
    case "accepted": return "Accepted"
    case "declined": return "Declined"
    case "withdrawn": return "Withdrawn"
    case "enrolled": return "Enrolled"
    case "archived": return "Archived"
  }
}

function getStatusBadgeClassName(status: ApplicationStatus) {
  switch (status) {
    case "draft": return "border border-slate-200 bg-slate-100 text-slate-600"
    case "submitted": return "border border-amber-200 bg-amber-50 text-amber-700"
    case "in_review": return "border border-sky-200 bg-sky-50 text-sky-700"
    case "info_requested": return "border border-violet-200 bg-violet-50 text-violet-700"
    case "admit_offered": return "border border-brand-orange/30 bg-brand-orange/10 text-brand-orange"
    case "accepted": return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "enrolled": return "border border-emerald-300 bg-emerald-100 text-emerald-800"
    case "declined":
    case "withdrawn": return "border border-rose-200 bg-rose-50 text-rose-700"
    case "archived": return "border border-slate-200 bg-slate-100 text-slate-600"
  }
}

function formatEnrollmentType(type: ApplicationEnrollmentType | null): string {
  if (type === "summer") return "Summer"
  if (type === "part_time") return "Part-time"
  if (type === "full_time") return "Full-time"
  return "Not set"
}

function getEnrollmentBadgeClassName(type: ApplicationEnrollmentType | null) {
  if (type === "summer") return "border border-amber-200 bg-amber-50 text-amber-700"
  if (type === "part_time") return "border border-sky-200 bg-sky-50 text-sky-700"
  if (type === "full_time") return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  return "border border-slate-200 bg-slate-100 text-slate-500"
}

function getStudentName(application: ApplicationRecord) {
  const name = [application.student_first_name, application.student_last_name]
    .filter(Boolean).join(" ").trim()
  return name || "(no student name yet)"
}

function getGuardianName(application: ApplicationRecord) {
  return application.guardian1_name?.trim() || "(no guardian name yet)"
}

export function sortApplications(
  applications: ApplicationRecord[],
  sort: ApplicationSortOption
) {
  const sorted = [...applications]
  sorted.sort((left, right) => {
    const lt = new Date(left.created_at).getTime()
    const rt = new Date(right.created_at).getTime()
    if (sort === "oldest") return lt - rt
    if (sort === "name") {
      return getGuardianName(left).localeCompare(getGuardianName(right))
    }
    return rt - lt
  })
  return sorted
}

function buildDashboardHref(
  mode: DashboardMode,
  filters: DashboardFilters,
  overrides: Partial<DashboardFilters>
) {
  const next = { ...filters, ...overrides }
  const params = new URLSearchParams()
  const basePath =
    mode === "archived" ? "/admin/applications/archived" : "/admin/applications"

  if (mode === "active" && next.status !== "all") params.set("status", next.status)
  if (next.enrollmentType !== "all") params.set("enrollment_type", next.enrollmentType)
  if (next.sort !== "newest") params.set("sort", next.sort)
  if (mode === "active" && next.paid !== "all") params.set("paid", next.paid)
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

function getQueueTabs(
  mode: DashboardMode,
  filters: DashboardFilters,
  summary: ApplicationSummary
) {
  return [
    { label: "Active queue", count: summary.activeCount,
      href: buildDashboardHref("active", filters, { status: "all", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "all" },
    { label: "New submissions", count: summary.submittedCount,
      href: buildDashboardHref("active", filters, { status: "submitted", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "submitted" },
    { label: "In review", count: summary.inReviewCount,
      href: buildDashboardHref("active", filters, { status: "in_review", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "in_review" },
    { label: "Info requested", count: summary.infoRequestedCount,
      href: buildDashboardHref("active", filters, { status: "info_requested", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "info_requested" },
    { label: "Admit offered", count: summary.admitOfferedCount,
      href: buildDashboardHref("active", filters, { status: "admit_offered", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "admit_offered" },
    { label: "Accepted", count: summary.acceptedCount,
      href: buildDashboardHref("active", filters, { status: "accepted", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "accepted" },
    { label: "Enrolled", count: summary.enrolledCount,
      href: buildDashboardHref("active", filters, { status: "enrolled", enrollmentType: "all" }),
      active: mode === "active" && filters.status === "enrolled" },
    { label: "Archived", count: summary.archivedCount,
      href: buildDashboardHref("archived", filters, { enrollmentType: "all" }),
      active: mode === "archived" },
  ]
}

export default function ApplicationsDashboard({
  filters,
  mode,
  applications,
  summary,
}: ApplicationsDashboardProps) {
  const isArchivedView = mode === "archived"
  const queueTabs = getQueueTabs(mode, filters, summary)
  const hasStripeGate = Boolean(siteConfig.external.stripeRegistrationLink)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            {isArchivedView ? "Archived applications" : "Applications"}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            {isArchivedView
              ? "Past applications archived from the active queue. Click a row to restore or permanently delete."
              : "Triage incoming applications, move them through admit decisions, and hand off to the office team. Click a row to open the full application — every field is editable in place."}
          </p>
        </div>
        {!isArchivedView && (
          <Link
            href="/admin/applications/funnel"
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            Pipeline report →
          </Link>
        )}
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
          className={`grid gap-4 md:items-end ${
            hasStripeGate && !isArchivedView
              ? "md:grid-cols-[minmax(0,180px)_minmax(0,180px)_minmax(0,180px)_auto]"
              : "md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]"
          }`}
        >
          {!isArchivedView && <input type="hidden" name="status" value={filters.status} />}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span className="block">Enrollment type</span>
            <select
              name="enrollment_type"
              defaultValue={filters.enrollmentType}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            >
              <option value="all">All types</option>
              <option value="summer">Summer</option>
              <option value="part_time">Part-time</option>
              <option value="full_time">Full-time</option>
            </select>
          </label>

          {hasStripeGate && !isArchivedView && (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Payment</span>
              <select
                name="paid"
                defaultValue={filters.paid}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">All payments</option>
                <option value="paid">Paid only</option>
                <option value="unpaid">Unpaid only</option>
              </select>
            </label>
          )}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span className="block">Sort order</span>
            <select
              name="sort"
              defaultValue={filters.sort}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Guardian name A-Z</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Apply filters
          </button>
        </form>
      </section>

      <section className="space-y-2">
        {applications.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            {isArchivedView
              ? "No archived applications matched the current filters."
              : "No applications in this queue yet."}
          </div>
        ) : (
          applications.map((application) => {
            const studentName = getStudentName(application)
            const guardianName = getGuardianName(application)
            const enrollmentTypeLabel = formatEnrollmentType(application.enrollment_type)

            return (
              <Link
                key={application.id}
                href={`/admin/applications/${application.id}`}
                className="block rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)_auto] lg:items-center">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-brand-navy">
                        {guardianName}
                      </h2>
                      <span className="text-xs text-slate-600">
                        for <span className="font-semibold">{studentName}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusBadgeClassName(application.status)}`}
                      >
                        {formatStatusLabel(application.status)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${getEnrollmentBadgeClassName(application.enrollment_type)}`}
                      >
                        {enrollmentTypeLabel}
                      </span>
                      {hasStripeGate && (
                        application.fee_paid_at ? (
                          <span
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700"
                            title={`Registration fee paid on ${formatTimestamp(application.fee_paid_at)}`}
                          >
                            Paid
                          </span>
                        ) : (
                          <span
                            className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700"
                            title="Registration fee not yet paid"
                          >
                            Unpaid
                          </span>
                        )
                      )}
                      {application.student_is_international === true && (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                          International
                        </span>
                      )}
                      {application.internal_notes && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                          Has notes
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1 text-xs text-slate-600">
                    <p>{application.guardian1_email ?? ""}</p>
                    <p>{application.guardian1_mobile ?? ""}</p>
                    {application.assigned_to && (
                      <p className="text-xs text-slate-500">
                        Assigned to: {application.assigned_to}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 lg:flex-col lg:items-end">
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">
                        {formatRelative(application.created_at)}
                      </p>
                      <p>{formatTimestamp(application.created_at)}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-brand-navy px-4 py-1.5 text-xs font-semibold text-white">
                      Open application →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
