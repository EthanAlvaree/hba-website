import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  applicationEnrollmentTypeSchema,
  type ApplicationEnrollmentType,
} from "@/lib/applications"
import {
  listStudentsForDirectory,
  studentStatusSchema,
  type StudentStatus,
} from "@/lib/sis"
import StudentsHeader from "./StudentsHeader"

export const dynamic = "force-dynamic"

type StudentsPageProps = {
  searchParams: Promise<{
    status?: string
    enrollment_type?: string
  }>
}

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function statusBadgeClass(status: StudentStatus) {
  switch (status) {
    case "active":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "graduated":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    case "withdrawn":
      return "border border-rose-200 bg-rose-50 text-rose-700"
  }
}

function statusLabel(status: StudentStatus): string {
  switch (status) {
    case "active":
      return "Active"
    case "graduated":
      return "Graduated"
    case "withdrawn":
      return "Withdrawn"
  }
}

function enrollmentTypeLabel(type: ApplicationEnrollmentType | null): string {
  if (type === "summer") return "Summer"
  if (type === "part_time") return "Part-time"
  if (type === "full_time") return "Full-time"
  return "Not set"
}

function buildPath(filters: {
  status: StudentStatus | "all"
  enrollmentType: ApplicationEnrollmentType | "all"
}) {
  const params = new URLSearchParams()
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.enrollmentType !== "all") {
    params.set("enrollment_type", filters.enrollmentType)
  }
  const qs = params.toString()
  return qs ? `/admin/students?${qs}` : "/admin/students"
}

export default async function StudentsDirectoryPage({ searchParams }: StudentsPageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const params = await searchParams

  const parsedStatus = studentStatusSchema.safeParse(params.status)
  const status: StudentStatus | "all" = parsedStatus.success ? parsedStatus.data : "all"

  const parsedEnrollment = applicationEnrollmentTypeSchema.safeParse(params.enrollment_type)
  const enrollmentType: ApplicationEnrollmentType | "all" = parsedEnrollment.success
    ? parsedEnrollment.data
    : "all"

  const students = await listStudentsForDirectory({
    status,
    enrollmentType,
  })

  const buildFilterHref = (overrides: Partial<{ status: StudentStatus | "all"; enrollmentType: ApplicationEnrollmentType | "all" }>) =>
    buildPath({ status, enrollmentType, ...overrides })

  const statusTabs: Array<{ label: string; value: StudentStatus | "all" }> = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Graduated", value: "graduated" },
    { label: "Withdrawn", value: "withdrawn" },
  ]

  return (
    <div className="space-y-6">
        <StudentsHeader />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {statusTabs.map((tab) => (
              <Link
                key={tab.value}
                href={buildFilterHref({ status: tab.value })}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  tab.value === status
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <form className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span className="block">Enrollment type</span>
              <select
                name="enrollment_type"
                defaultValue={enrollmentType}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">All types</option>
                <option value="summer">Summer</option>
                <option value="part_time">Part-time</option>
                <option value="full_time">Full-time</option>
              </select>
            </label>
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Apply filter
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {students.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No students match these filters. Students appear here after the
              office runs the Enroll workflow on an accepted application.
            </div>
          ) : (
            students.map((student) => {
              const displayName = student.preferred_name?.trim()
                ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
                : `${student.legal_first_name} ${student.legal_last_name}`

              return (
                <Link
                  key={student.id}
                  href={`/admin/students/${student.id}`}
                  className="block rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
                >
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] lg:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-brand-navy">
                          {displayName}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(student.status)}`}
                        >
                          {statusLabel(student.status)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {enrollmentTypeLabel(student.enrollment_type)}
                        </span>
                        {student.current_grade && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                            Grade {student.current_grade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {student.profile?.email ?? "(no profile email)"}
                        {student.registered_at_hba && (
                          <> &middot; Registered {formatDate(student.registered_at_hba)}</>
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {student.application_id ? "Application on file" : "No application back-link"}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-brand-navy/20 px-3 py-1 text-xs font-semibold text-brand-navy">
                      Open →
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </section>
    </div>
  )
}
