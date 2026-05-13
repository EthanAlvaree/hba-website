// Print-friendly one-page summary for a single student.
//
// What it's for: office workflows that still touch paper — pulling a
// folder for a new family meeting, handing a sub teacher a sheet for
// the day, faxing health office a contact card. Strips the editing
// chrome down to just facts + contacts and adds an inline print
// stylesheet that hides the admin shell + interactive controls when
// the user actually prints.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getStudentDetail,
  listStudentTags,
  type StudentDetailEnrollment,
  type StudentDetailParentLink,
} from "@/lib/sis"
import PrintButton from "./PrintButton"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function parentName(link: StudentDetailParentLink): string {
  const parent = link.parent
  if (!parent) return "(unknown)"
  const full = [parent.first_name, parent.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return full || parent.display_name || parent.email
}

function parentRoleLabel(link: StudentDetailParentLink): string {
  if (link.is_homestay) return "Homestay"
  if (link.is_primary) return "Primary guardian"
  return "Guardian"
}

function periodShortLabel(period: string | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

function teacherShortName(
  teacher: StudentDetailEnrollment["section"] extends infer S
    ? S extends { teacher: infer T }
      ? T
      : never
    : never
): string {
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  return full || teacher.display_name || teacher.email
}

export default async function StudentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const { id } = await params
  const student = await getStudentDetail(id)
  if (!student) notFound()

  const tags = await listStudentTags(id)

  const fullLegalName = [
    student.legal_first_name,
    student.legal_middle_name,
    student.legal_last_name,
    student.suffix,
  ]
    .filter(Boolean)
    .join(" ")

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
    : `${student.legal_first_name} ${student.legal_last_name}`

  const address = [
    student.address_line1,
    student.address_line2,
    [student.address_city, student.address_region, student.address_postal_code]
      .filter(Boolean)
      .join(", "),
    student.address_country,
  ]
    .filter(Boolean)
    .join("\n")

  const currentEnrollments = student.enrollments.filter(
    (e) => e.status === "enrolled" || e.status === "audit"
  )

  const sortedParentLinks = [...student.parent_links].sort((a, b) => {
    // Primary first, then homestay last, then everything else by name.
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    if (a.is_homestay !== b.is_homestay) return a.is_homestay ? 1 : -1
    return parentName(a).localeCompare(parentName(b))
  })

  const printedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date())

  return (
    <>
      {/* Print-time CSS: hide the admin shell + the toolbar, drop
          backgrounds, tighten margins. Keeps the screen experience
          unchanged for review before hitting Print. */}
      <style>{`
        @media print {
          header, nav, aside, .no-print { display: none !important; }
          body, .min-h-screen { background: white !important; }
          main { padding: 0 !important; }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 0 16px 0 !important;
            page-break-inside: avoid;
          }
          h1 { font-size: 22pt !important; }
          h2 { font-size: 13pt !important; }
          body { font-size: 10.5pt !important; }
        }
        @page { margin: 0.5in; }
      `}</style>

      <div className="space-y-5">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/students/${id}`}
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to profile
          </Link>
          <PrintButton />
        </div>

        <header className="print-card rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            Student profile
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">
            {displayName}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Printed {printedAt}
          </p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <Field label="Legal name" value={fullLegalName} />
            <Field label="Date of birth" value={formatDate(student.dob)} />
            <Field label="Grade" value={student.current_grade} />
            <Field
              label="Enrollment"
              value={
                student.enrollment_type === "full_time"
                  ? "Full-time"
                  : student.enrollment_type === "part_time"
                    ? "Part-time"
                    : student.enrollment_type === "summer"
                      ? "Summer"
                      : null
              }
            />
            <Field label="Status" value={student.status} />
            <Field
              label="HBA email"
              value={student.profile?.email ?? null}
            />
            <Field label="Pronouns" value={student.pronouns} />
            <Field label="Primary language" value={student.primary_language} />
            <Field
              label="Registered at HBA"
              value={formatDate(student.registered_at_hba)}
            />
            {tags.length > 0 && (
              <Field label="Tags" value={tags.join(", ")} />
            )}
          </dl>
          {address && (
            <div className="mt-4 grid gap-1 sm:grid-cols-[160px_1fr]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Home address
              </p>
              <p className="whitespace-pre-line text-sm text-slate-800">
                {address}
              </p>
            </div>
          )}
        </header>

        <section className="print-card rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Parents &amp; emergency contacts
          </h2>
          {sortedParentLinks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No parent links on file.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sortedParentLinks.map((link) => (
                <li
                  key={link.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {parentName(link)}{" "}
                      <span className="font-normal text-slate-500">
                        · {parentRoleLabel(link)}
                        {link.relationship && link.relationship.trim().length > 0 && (
                          <> · {link.relationship}</>
                        )}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600">
                      {link.is_emergency_contact && (
                        <span className="mr-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                          Emergency
                        </span>
                      )}
                      {link.can_receive_communications ? "Comms ✓" : "Comms ✗"}
                    </p>
                  </div>
                  {link.parent && (
                    <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                      <Field label="Email" value={link.parent.email} />
                      <Field
                        label="Personal email"
                        value={link.parent.personal_email}
                      />
                      <Field
                        label="Mobile"
                        value={link.parent.mobile_phone}
                      />
                      <Field
                        label="Work phone"
                        value={link.parent.work_phone}
                      />
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="print-card rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Current schedule
          </h2>
          {currentEnrollments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No active enrollments.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {currentEnrollments.map((enrollment) => {
                const section = enrollment.section
                const teacher = section?.teacher ?? null
                return (
                  <li key={enrollment.id} className="py-3">
                    <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {periodShortLabel(section?.period ?? null)}
                      </p>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {section?.course?.name ?? "(deleted course)"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {section?.course?.code}
                          {section?.term?.name && (
                            <> · {section.term.name}</>
                          )}
                          {section?.room && <> · Room {section.room}</>}
                        </p>
                      </div>
                      <p className="text-xs text-slate-700">
                        {teacherShortName(teacher)}
                        {teacher?.email && (
                          <>
                            <br />
                            <span className="text-slate-500">{teacher.email}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {student.internal_notes && student.internal_notes.trim().length > 0 && (
          <section className="print-card rounded-[2rem] border border-amber-200 bg-amber-50/40 px-6 py-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-amber-900">
              Internal notes
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-amber-900">
              {student.internal_notes}
            </p>
            <p className="mt-2 text-[11px] italic text-amber-700">
              Office-only. Don&rsquo;t share this printout outside the
              admin team.
            </p>
          </section>
        )}
      </div>
    </>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="text-sm text-slate-800">
        {value || <span className="text-slate-400">—</span>}
      </p>
    </div>
  )
}

