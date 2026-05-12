import Link from "next/link"
import {
  ApplicationEnrollmentType,
  ApplicationRecord,
  ApplicationStatus,
  ApplicationSummary,
} from "@/lib/applications"
import type { ApplicationDocumentRecord } from "@/lib/application-storage"
import {
  deleteApplicationAction,
  enrollApplicationAction,
  signOutApplicationsAdminAction,
  updateApplicationAction,
} from "./actions"

export const applicationSortOptions = ["newest", "oldest", "name"] as const

export type ApplicationSortOption = (typeof applicationSortOptions)[number]

type DashboardMode = "active" | "archived"

type DashboardFilters = {
  status: ApplicationStatus | "all"
  enrollmentType: ApplicationEnrollmentType | "all"
  sort: ApplicationSortOption
}

type ApplicationsDashboardProps = {
  adminEmail: string
  currentPath: string
  filters: DashboardFilters
  mode: DashboardMode
  applications: ApplicationRecord[]
  summary: ApplicationSummary
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

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: pacificTimeZone,
  }).format(new Date(`${value}T00:00:00`))
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
    case "draft":
      return "Draft"
    case "submitted":
      return "New submission"
    case "in_review":
      return "In review"
    case "info_requested":
      return "Info requested"
    case "admit_offered":
      return "Admit offered"
    case "accepted":
      return "Accepted"
    case "declined":
      return "Declined"
    case "withdrawn":
      return "Withdrawn"
    case "enrolled":
      return "Enrolled"
    case "archived":
      return "Archived"
  }
}

function getStatusBadgeClassName(status: ApplicationStatus) {
  switch (status) {
    case "draft":
      return "border border-slate-200 bg-slate-100 text-slate-600"
    case "submitted":
      return "border border-amber-200 bg-amber-50 text-amber-700"
    case "in_review":
      return "border border-sky-200 bg-sky-50 text-sky-700"
    case "info_requested":
      return "border border-violet-200 bg-violet-50 text-violet-700"
    case "admit_offered":
      return "border border-brand-orange/30 bg-brand-orange/10 text-brand-orange"
    case "accepted":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "enrolled":
      return "border border-emerald-300 bg-emerald-100 text-emerald-800"
    case "declined":
    case "withdrawn":
      return "border border-rose-200 bg-rose-50 text-rose-700"
    case "archived":
      return "border border-slate-200 bg-slate-100 text-slate-600"
  }
}

function formatEnrollmentType(type: ApplicationEnrollmentType | null): string {
  if (type === "summer") return "Summer"
  if (type === "part_time") return "Part-time"
  if (type === "full_time") return "Full-time"
  return "Not selected"
}

function getEnrollmentBadgeClassName(type: ApplicationEnrollmentType | null) {
  if (type === "summer") return "border border-amber-200 bg-amber-50 text-amber-700"
  if (type === "part_time") return "border border-sky-200 bg-sky-50 text-sky-700"
  if (type === "full_time") return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  return "border border-slate-200 bg-slate-100 text-slate-500"
}

function getStudentName(application: ApplicationRecord) {
  const name = [application.student_first_name, application.student_last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return name || "(no student name yet)"
}

function getStudentFullName(application: ApplicationRecord) {
  const name = [
    application.student_first_name,
    application.student_middle_name,
    application.student_last_name,
    application.student_suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
  return name || "—"
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
      const ln = getGuardianName(left)
      const rn = getGuardianName(right)
      return ln.localeCompare(rn)
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

  if (mode === "active" && next.status !== "all") {
    params.set("status", next.status)
  }
  if (next.enrollmentType !== "all") {
    params.set("enrollment_type", next.enrollmentType)
  }
  if (next.sort !== "newest") {
    params.set("sort", next.sort)
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

function getQueueTabs(
  mode: DashboardMode,
  filters: DashboardFilters,
  summary: ApplicationSummary
) {
  return [
    {
      label: "Active queue",
      count: summary.activeCount,
      href: buildDashboardHref("active", filters, {
        status: "all",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "all",
    },
    {
      label: "New submissions",
      count: summary.submittedCount,
      href: buildDashboardHref("active", filters, {
        status: "submitted",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "submitted",
    },
    {
      label: "In review",
      count: summary.inReviewCount,
      href: buildDashboardHref("active", filters, {
        status: "in_review",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "in_review",
    },
    {
      label: "Info requested",
      count: summary.infoRequestedCount,
      href: buildDashboardHref("active", filters, {
        status: "info_requested",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "info_requested",
    },
    {
      label: "Admit offered",
      count: summary.admitOfferedCount,
      href: buildDashboardHref("active", filters, {
        status: "admit_offered",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "admit_offered",
    },
    {
      label: "Accepted",
      count: summary.acceptedCount,
      href: buildDashboardHref("active", filters, {
        status: "accepted",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "accepted",
    },
    {
      label: "Enrolled",
      count: summary.enrolledCount,
      href: buildDashboardHref("active", filters, {
        status: "enrolled",
        enrollmentType: "all",
      }),
      active: mode === "active" && filters.status === "enrolled",
    },
    {
      label: "Archived",
      count: summary.archivedCount,
      href: buildDashboardHref("archived", filters, { enrollmentType: "all" }),
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-slate-800">{value || "—"}</p>
    </div>
  )
}

function formatAddress(parts: Array<string | null>) {
  const cleaned = parts.map((part) => part?.trim() ?? "").filter(Boolean)
  return cleaned.length > 0 ? cleaned.join(", ") : ""
}

function StudentCard({ application }: { application: ApplicationRecord }) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Student
      </p>
      <DetailRow label="Legal name" value={getStudentFullName(application)} />
      {application.student_preferred_name && (
        <DetailRow label="Preferred name" value={application.student_preferred_name} />
      )}
      <DetailRow label="Date of birth" value={formatDate(application.student_dob)} />
      <DetailRow
        label="Gender / pronouns"
        value={[application.student_gender, application.student_pronouns]
          .filter(Boolean)
          .join(" · ")}
      />
      <DetailRow label="Birthplace" value={application.student_birthplace ?? ""} />
      <DetailRow
        label="Languages"
        value={[
          application.student_primary_language,
          application.student_secondary_language,
        ]
          .filter(Boolean)
          .join(", ")}
      />
      <DetailRow
        label="English proficiency"
        value={application.student_english_proficiency ?? ""}
      />
      <DetailRow
        label="Grade (current → desired)"
        value={
          application.student_current_grade && application.student_desired_grade
            ? `${application.student_current_grade} → ${application.student_desired_grade}`
            : ""
        }
      />
      <DetailRow
        label="Student email"
        value={application.student_personal_email ?? ""}
      />
      <DetailRow label="Student phone" value={application.student_phone ?? ""} />
      <DetailRow
        label="Residence"
        value={formatAddress([
          application.student_address_line1,
          application.student_address_line2,
          application.student_address_city,
          application.student_address_region,
          application.student_address_postal_code,
          application.student_address_country,
        ])}
      />
    </div>
  )
}

function GuardianCard({
  title,
  name,
  relationship,
  mobile,
  workPhone,
  email,
  sameAsStudent,
  address,
}: {
  title: string
  name: string | null
  relationship: string | null
  mobile: string | null
  workPhone: string | null
  email: string | null
  sameAsStudent?: boolean
  address: string
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <DetailRow label="Name" value={name ?? ""} />
      <DetailRow label="Relationship" value={relationship ?? ""} />
      <DetailRow label="Mobile" value={mobile ?? ""} />
      <DetailRow label="Work phone" value={workPhone ?? ""} />
      <DetailRow label="Email" value={email ?? ""} />
      <DetailRow
        label="Address"
        value={sameAsStudent ? "Same as student" : address}
      />
    </div>
  )
}

export default function ApplicationsDashboard({
  adminEmail,
  currentPath,
  filters,
  mode,
  applications,
  summary,
  documentsByApp,
}: ApplicationsDashboardProps) {
  const isArchivedView = mode === "archived"
  const queueTabs = getQueueTabs(mode, filters, summary)

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
                  {isArchivedView ? "Archived applications" : "Applications"}
                </h1>
                <p className="max-w-3xl text-sm leading-relaxed text-white/80">
                  {isArchivedView
                    ? "Past applications archived from the active queue. Restore them anytime, or permanently delete obvious junk."
                    : "Triage incoming applications, move them through admit decisions, and hand off to the office team. Use notes to keep context with the record."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/85">
                  Signed in as {adminEmail}
                </div>
                <Link
                  href="/admin/academics"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                >
                  Academics
                </Link>
                <Link
                  href="/admin/students"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                >
                  Students
                </Link>
                <Link
                  href="/admin/profiles"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                >
                  Profiles
                </Link>
                <Link
                  href="/admin/contact-submissions"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-brand-navy"
                >
                  Contact submissions
                </Link>
                <form action={signOutApplicationsAdminAction}>
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
              {queueTabs.map((tab) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    tab.active
                      ? "border-white bg-white text-brand-navy"
                      : "border-white/20 bg-transparent text-white hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      tab.active
                        ? "bg-slate-100 text-brand-navy"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {tab.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto] md:items-end">
            {!isArchivedView && (
              <input type="hidden" name="status" value={filters.status} />
            )}

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

        <section className="space-y-4">
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
                <details
                  key={application.id}
                  className="group rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
                >
                  <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)_auto] lg:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-extrabold text-brand-navy">
                            {guardianName}
                          </h2>
                          <span className="text-sm text-slate-600">
                            for <span className="font-semibold">{studentName}</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClassName(
                              application.status
                            )}`}
                          >
                            {formatStatusLabel(application.status)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getEnrollmentBadgeClassName(
                              application.enrollment_type
                            )}`}
                          >
                            {enrollmentTypeLabel}
                          </span>
                          {application.internal_notes && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                              Has notes
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 space-y-1 text-sm text-slate-600">
                        <p>{application.guardian1_email ?? ""}</p>
                        <p>{application.guardian1_mobile ?? ""}</p>
                        {application.assigned_to && (
                          <p className="text-xs text-slate-500">
                            Assigned to: {application.assigned_to}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row items-center justify-between gap-4 lg:flex-col lg:items-end">
                        <div className="text-right text-xs text-slate-500">
                          <p className="font-semibold text-slate-700">
                            {formatRelative(application.created_at)}
                          </p>
                          <p>{formatTimestamp(application.created_at)}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition group-open:border-brand-navy/20 group-open:text-brand-navy">
                          Open details
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="space-y-6 border-t border-slate-200 px-5 py-5 sm:px-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <StudentCard application={application} />

                      <GuardianCard
                        title="Guardian 1"
                        name={application.guardian1_name}
                        relationship={application.guardian1_relationship}
                        mobile={application.guardian1_mobile}
                        workPhone={application.guardian1_work_phone}
                        email={application.guardian1_email}
                        sameAsStudent={application.guardian1_address_same_as_student}
                        address={formatAddress([
                          application.guardian1_address_line1,
                          application.guardian1_address_line2,
                          application.guardian1_address_city,
                          application.guardian1_address_region,
                          application.guardian1_address_postal_code,
                          application.guardian1_address_country,
                        ])}
                      />

                      {application.guardian2_name && (
                        <GuardianCard
                          title="Guardian 2"
                          name={application.guardian2_name}
                          relationship={application.guardian2_relationship}
                          mobile={application.guardian2_mobile}
                          workPhone={application.guardian2_work_phone}
                          email={application.guardian2_email}
                          sameAsStudent={application.guardian2_address_same_as_student}
                          address={formatAddress([
                            application.guardian2_address_line1,
                            application.guardian2_address_line2,
                            application.guardian2_address_city,
                            application.guardian2_address_region,
                            application.guardian2_address_postal_code,
                            application.guardian2_address_country,
                          ])}
                        />
                      )}

                      {application.has_homestay && (
                        <GuardianCard
                          title="Homestay"
                          name={application.homestay_name}
                          relationship={application.homestay_relationship}
                          mobile={application.homestay_mobile}
                          workPhone={application.homestay_work_phone}
                          email={application.homestay_email}
                          address={formatAddress([
                            application.homestay_address_line1,
                            application.homestay_address_line2,
                            application.homestay_address_city,
                            application.homestay_address_region,
                            application.homestay_address_postal_code,
                            application.homestay_address_country,
                          ])}
                        />
                      )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Prior schools
                        </p>
                        {application.prior_schools.length === 0 ? (
                          <p className="text-sm text-slate-600">No schools listed.</p>
                        ) : (
                          <ul className="space-y-3 text-sm text-slate-800">
                            {application.prior_schools.map((school, index) => {
                              const schoolDocs = (
                                documentsByApp.get(application.id) ?? []
                              ).filter(
                                (doc) =>
                                  (doc.prior_school_name ?? "").trim() === school.name.trim()
                              )
                              return (
                                <li key={`${school.name}-${index}`}>
                                  <p className="font-semibold">{school.name}</p>
                                  {school.note && (
                                    <p className="whitespace-pre-wrap text-slate-600">
                                      {school.note}
                                    </p>
                                  )}
                                  {schoolDocs.length > 0 && (
                                    <ul className="mt-1 space-y-1">
                                      {schoolDocs.map((doc) => (
                                        <li key={doc.id}>
                                          <a
                                            href={`/api/admin/applications/documents/${doc.id}`}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy underline-offset-4 hover:underline"
                                            target="_blank"
                                            rel="noopener"
                                          >
                                            📎 {doc.filename}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                        {(() => {
                          const allDocs = documentsByApp.get(application.id) ?? []
                          const schoolNameSet = new Set(
                            application.prior_schools.map((s) => s.name.trim())
                          )
                          const unmatchedDocs = allDocs.filter(
                            (doc) => !schoolNameSet.has((doc.prior_school_name ?? "").trim())
                          )
                          if (unmatchedDocs.length === 0) return null
                          return (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Other transcripts
                              </p>
                              <ul className="mt-2 space-y-1">
                                {unmatchedDocs.map((doc) => (
                                  <li key={doc.id} className="text-sm">
                                    <a
                                      href={`/api/admin/applications/documents/${doc.id}`}
                                      className="inline-flex items-center gap-1 font-semibold text-brand-navy underline-offset-4 hover:underline"
                                      target="_blank"
                                      rel="noopener"
                                    >
                                      📎 {doc.filename}
                                    </a>
                                    {doc.prior_school_name && (
                                      <span className="ml-2 text-xs text-slate-500">
                                        ({doc.prior_school_name})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })()}
                      </div>

                      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Course interest
                        </p>
                        {application.course_interest.length === 0 ? (
                          <p className="text-sm text-slate-600">
                            {application.enrollment_type === "full_time"
                              ? "No course interest collected (full-time)."
                              : "None specified."}
                          </p>
                        ) : (
                          <ul className="list-inside list-disc space-y-1 text-sm text-slate-800">
                            {application.course_interest.map((course) => (
                              <li key={course}>{course}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          How they heard about HBA
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {application.how_did_you_hear || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Notes from family
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                          {application.notes_from_family || "—"}
                        </p>
                      </div>
                    </div>

                    <form
                      action={updateApplicationAction}
                      className="space-y-4 rounded-3xl border border-brand-navy/15 bg-white p-5"
                    >
                      <input type="hidden" name="id" value={application.id} />
                      <input type="hidden" name="redirectTo" value={currentPath} />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          <span className="block">Status</span>
                          <select
                            name="status"
                            defaultValue={application.status}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">New submission</option>
                            <option value="in_review">In review</option>
                            <option value="info_requested">Info requested</option>
                            <option value="admit_offered">Admit offered</option>
                            <option value="accepted">Accepted</option>
                            <option value="declined">Declined</option>
                            <option value="withdrawn">Withdrawn</option>
                            <option value="enrolled">Enrolled</option>
                            <option value="archived">Archived</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                          <span className="block">Enrollment type</span>
                          <select
                            name="enrollment_type"
                            defaultValue={application.enrollment_type ?? ""}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          >
                            <option value="">Not set</option>
                            <option value="summer">Summer</option>
                            <option value="part_time">Part-time</option>
                            <option value="full_time">Full-time</option>
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                          <span className="block">Assigned admin (optional)</span>
                          <input
                            name="assigned_to"
                            defaultValue={application.assigned_to ?? ""}
                            placeholder="Office staff name or email"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                          <span className="block">Internal notes</span>
                          <textarea
                            name="internal_notes"
                            rows={5}
                            defaultValue={application.internal_notes ?? ""}
                            placeholder="Office-only notes about this application: admit decisions, scholarship status, follow-up calls, etc."
                            className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                          />
                        </label>
                      </div>

                      {application.admit_decision_at && (
                        <p className="text-xs text-slate-500">
                          Admit decision recorded {formatTimestamp(application.admit_decision_at)}
                        </p>
                      )}
                      {application.archived_at && (
                        <p className="text-xs text-slate-500">
                          Archived on {formatTimestamp(application.archived_at)}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        Save triage
                      </button>
                    </form>

                    {application.status === "accepted" && (
                      <form
                        action={enrollApplicationAction}
                        className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5"
                      >
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <input type="hidden" name="redirectTo" value={currentPath} />

                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-emerald-900">
                            Enroll this student
                          </p>
                          <p className="text-sm text-emerald-800">
                            Creates the student record, the parent/guardian profiles,
                            and links them together. Run this once the family has
                            accepted and the student&rsquo;s HBA Microsoft 365 account
                            has been provisioned.
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span className="block">Student HBA email</span>
                            <input
                              name="student_hba_email"
                              type="email"
                              required
                              placeholder="firstname.lastname@highbluffacademy.com"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            />
                          </label>
                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span className="block">
                              Registered at HBA (optional)
                            </span>
                            <input
                              name="registered_at_hba"
                              type="date"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                            />
                          </label>
                        </div>

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                        >
                          Enroll student
                        </button>
                      </form>
                    )}

                    {application.status === "enrolled" && (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-900">
                        <p className="font-semibold">Enrolled.</p>
                        <p className="mt-1 text-emerald-800">
                          A student record, profile, and parent links have been
                          created from this application.
                        </p>
                      </div>
                    )}

                    {isArchivedView && (
                      <form
                        action={deleteApplicationAction}
                        className="rounded-3xl border border-rose-200 bg-rose-50/70 p-5"
                      >
                        <input type="hidden" name="id" value={application.id} />
                        <input type="hidden" name="redirectTo" value={currentPath} />

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-rose-800">
                              Permanent delete
                            </p>
                            <p className="text-sm text-rose-700">
                              Use this only for spam, test entries, or obvious junk.
                              This removes the application from the archive for good.
                            </p>
                          </div>
                          <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                            aria-label={`Delete ${guardianName} permanently`}
                            title="Delete permanently"
                          >
                            <TrashIcon />
                            Delete forever
                          </button>
                        </div>
                      </form>
                    )}
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
