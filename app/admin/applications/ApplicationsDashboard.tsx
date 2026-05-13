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
  deleteApplicationDocumentAdminAction,
  enrollApplicationAction,
  updateApplicationAction,
  updateApplicationDataAction,
  uploadApplicationDocumentAdminAction,
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            {isArchivedView ? "Archived applications" : "Applications"}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            {isArchivedView
              ? "Past applications archived from the active queue. Restore them anytime, or permanently delete obvious junk."
              : "Triage incoming applications, move them through admit decisions, and hand off to the office team. Use notes to keep context with the record."}
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
                tab.active
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        ))}
      </nav>

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

                    <AdminEditApplicationData
                      application={application}
                      redirectTo={currentPath}
                    />

                    <AdminManageDocuments
                      application={application}
                      documents={documentsByApp.get(application.id) ?? []}
                      redirectTo={currentPath}
                    />

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

                        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                          <span className="block">
                            Note to family (optional, included verbatim in the status email)
                          </span>
                          <textarea
                            name="note_to_family"
                            rows={3}
                            placeholder="A short, friendly note we'll quote in the email — e.g., 'Could you send a copy of last semester's transcript?'"
                            className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
                          />
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                          <input
                            type="checkbox"
                            name="suppress_family_email"
                            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                          />
                          <span>
                            Don&rsquo;t notify the family (internal change only). Emails are
                            sent automatically when status changes to{" "}
                            <em>info requested</em>, <em>admit offered</em>,{" "}
                            <em>accepted</em>, or <em>declined</em>.
                          </span>
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
  )
}

// ============================================================================
// Admin edit / docs subcomponents
// ============================================================================

function AdminEditApplicationData({
  application,
  redirectTo,
}: {
  application: ApplicationRecord
  redirectTo: string
}) {
  return (
    <details className="rounded-3xl border border-brand-navy/15 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-brand-navy">
        Edit application data (fix typos, fill omissions)
      </summary>

      <form
        action={updateApplicationDataAction}
        className="space-y-6 border-t border-slate-200 px-5 py-5"
      >
        <input type="hidden" name="id" value={application.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <FormSection title="Enrollment type">
          <SelectField
            name="enrollment_type"
            defaultValue={application.enrollment_type ?? ""}
            options={[
              { value: "", label: "Not set" },
              { value: "summer", label: "Summer" },
              { value: "part_time", label: "Part-time" },
              { value: "full_time", label: "Full-time" },
            ]}
            label="Enrollment type"
          />
        </FormSection>

        <FormSection title="Student">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="student_first_name" label="Legal first name" defaultValue={application.student_first_name} />
            <TextField name="student_middle_name" label="Legal middle name" defaultValue={application.student_middle_name} />
            <TextField name="student_last_name" label="Legal last name" defaultValue={application.student_last_name} />
            <TextField name="student_suffix" label="Suffix" defaultValue={application.student_suffix} />
            <TextField name="student_preferred_name" label="Preferred name" defaultValue={application.student_preferred_name} className="sm:col-span-2" />
            <TextField name="student_dob" label="Date of birth" type="date" defaultValue={application.student_dob} />
            <TextField name="student_gender" label="Gender" defaultValue={application.student_gender} />
            <TextField name="student_pronouns" label="Pronouns" defaultValue={application.student_pronouns} />
            <TextField name="student_birthplace" label="Birthplace" defaultValue={application.student_birthplace} />
            <TextField name="student_primary_language" label="Primary language" defaultValue={application.student_primary_language} />
            <TextField name="student_secondary_language" label="Secondary language" defaultValue={application.student_secondary_language} />
            <TextField name="student_english_proficiency" label="English proficiency" defaultValue={application.student_english_proficiency} />
            <TextField name="student_current_grade" label="Current grade" defaultValue={application.student_current_grade} />
            <TextField name="student_desired_grade" label="Desired entry grade" defaultValue={application.student_desired_grade} />
            <TextField name="student_personal_email" label="Student personal email" type="email" defaultValue={application.student_personal_email} />
            <TextField name="student_phone" label="Student phone" type="tel" defaultValue={application.student_phone} />
          </div>

          <AddressFields prefix="student" application={application} />
        </FormSection>

        <FormSection title="Guardian 1">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="guardian1_name" label="Full name" defaultValue={application.guardian1_name} />
            <TextField name="guardian1_relationship" label="Relationship" defaultValue={application.guardian1_relationship} />
            <TextField name="guardian1_mobile" label="Mobile phone" type="tel" defaultValue={application.guardian1_mobile} />
            <TextField name="guardian1_work_phone" label="Work phone" type="tel" defaultValue={application.guardian1_work_phone} />
            <TextField name="guardian1_email" label="Email" type="email" defaultValue={application.guardian1_email} className="sm:col-span-2" />
          </div>

          <CheckboxRow
            name="guardian1_address_same_as_student"
            label="Same address as student"
            defaultChecked={application.guardian1_address_same_as_student}
          />
          <AddressFields prefix="guardian1" application={application} />
        </FormSection>

        <FormSection title="Guardian 2 (optional)">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="guardian2_name" label="Full name" defaultValue={application.guardian2_name} />
            <TextField name="guardian2_relationship" label="Relationship" defaultValue={application.guardian2_relationship} />
            <TextField name="guardian2_mobile" label="Mobile phone" type="tel" defaultValue={application.guardian2_mobile} />
            <TextField name="guardian2_work_phone" label="Work phone" type="tel" defaultValue={application.guardian2_work_phone} />
            <TextField name="guardian2_email" label="Email" type="email" defaultValue={application.guardian2_email} className="sm:col-span-2" />
          </div>

          <CheckboxRow
            name="guardian2_address_same_as_student"
            label="Same address as student"
            defaultChecked={application.guardian2_address_same_as_student}
          />
          <AddressFields prefix="guardian2" application={application} />
        </FormSection>

        <FormSection title="Homestay (optional)">
          <CheckboxRow
            name="has_homestay"
            label="Has homestay family"
            defaultChecked={application.has_homestay}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="homestay_name" label="Contact name" defaultValue={application.homestay_name} />
            <TextField name="homestay_relationship" label="Relationship" defaultValue={application.homestay_relationship} />
            <TextField name="homestay_mobile" label="Mobile phone" type="tel" defaultValue={application.homestay_mobile} />
            <TextField name="homestay_work_phone" label="Work phone" type="tel" defaultValue={application.homestay_work_phone} />
            <TextField name="homestay_email" label="Email" type="email" defaultValue={application.homestay_email} className="sm:col-span-2" />
          </div>

          <AddressFields prefix="homestay" application={application} />
        </FormSection>

        <FormSection title="Source + notes">
          <div className="grid gap-3">
            <TextField name="how_did_you_hear" label="How they heard about HBA" defaultValue={application.how_did_you_hear} />
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Notes from family</span>
              <textarea
                name="notes_from_family"
                rows={4}
                defaultValue={application.notes_from_family ?? ""}
                maxLength={4000}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>
        </FormSection>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save application data
        </button>
      </form>
    </details>
  )
}

function AdminManageDocuments({
  application,
  documents,
  redirectTo,
}: {
  application: ApplicationRecord
  documents: ApplicationDocumentRecord[]
  redirectTo: string
}) {
  return (
    <details className="rounded-3xl border border-brand-navy/15 bg-white">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-brand-navy">
        Manage transcript PDFs ({documents.length})
      </summary>

      <div className="space-y-4 border-t border-slate-200 px-5 py-5">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-600">No documents on file yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/admin/applications/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener"
                    className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
                  >
                    📎 {doc.filename}
                  </a>
                  {doc.prior_school_name && (
                    <p className="text-xs text-slate-500">
                      For school: {doc.prior_school_name}
                    </p>
                  )}
                </div>
                <form action={deleteApplicationDocumentAdminAction}>
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={uploadApplicationDocumentAdminAction}
          encType="multipart/form-data"
          className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
        >
          <input type="hidden" name="application_id" value={application.id} />
          <input type="hidden" name="kind" value="transcript" />
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <p className="text-sm font-semibold text-brand-navy">
            Upload a replacement transcript
          </p>
          <p className="text-xs text-slate-500">
            Max 4 MB per file. For larger PDFs, ask the family to re-upload
            via their draft link.
          </p>

          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">For which prior school? (optional)</span>
            <input
              name="prior_school_name"
              maxLength={200}
              placeholder="e.g. La Jolla Country Day School"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">File</span>
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.gif,.heic,.doc,.docx"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
            />
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Upload
          </button>
        </form>
      </div>
    </details>
  )
}

// ============================================================================
// Tiny form primitives — keep the big edit form readable above
// ============================================================================

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function TextField({
  name,
  label,
  defaultValue,
  type = "text",
  className = "",
}: {
  name: string
  label: string
  defaultValue?: string | null
  type?: string
  className?: string
}) {
  return (
    <label className={`space-y-1 text-xs font-medium text-slate-700 ${className}`}>
      <span className="block">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      />
    </label>
  )
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string
  label: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function CheckboxRow({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
      />
      <span>{label}</span>
    </label>
  )
}

function AddressFields({
  prefix,
  application,
}: {
  prefix: "student" | "guardian1" | "guardian2" | "homestay"
  application: ApplicationRecord
}) {
  const v = (suffix: string) =>
    application[`${prefix}_${suffix}` as keyof ApplicationRecord] as string | null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField name={`${prefix}_address_line1`} label="Street address" defaultValue={v("address_line1")} className="sm:col-span-2" />
      <TextField name={`${prefix}_address_line2`} label="Address line 2" defaultValue={v("address_line2")} className="sm:col-span-2" />
      <TextField name={`${prefix}_address_city`} label="City" defaultValue={v("address_city")} />
      <TextField name={`${prefix}_address_region`} label="State / region" defaultValue={v("address_region")} />
      <TextField name={`${prefix}_address_postal_code`} label="Postal code" defaultValue={v("address_postal_code")} />
      <TextField name={`${prefix}_address_country`} label="Country" defaultValue={v("address_country")} />
    </div>
  )
}
