// Shared attendance entry UI for /admin/academics/sections/[id]/attendance
// and /faculty-portal/sections/[id]/attendance. The `surface` prop wires
// the "← Back" link and the hidden form field that the server action
// reads to decide which path tree to revalidate + redirect into.

import Link from "next/link"
import {
  attendanceStatusLabels,
  attendanceStatusSchema,
  type AttendanceRecord,
} from "@/lib/attendance"
import type { CourseSectionRecord, EnrollmentRecord } from "@/lib/sis"
import { periodLabel } from "@/app/admin/academics/sections/SectionFormFields"
import { saveAttendanceAction } from "@/app/admin/academics/sections/[id]/attendance/actions"
import {
  buildMailtoUrl,
  buildTeamsChatUrl,
  tardyMessage,
  type ParentContact,
} from "@/lib/parent-contact"
import { categories } from "@/lib/categories"
import type { CalendarEventRow } from "@/lib/calendar-events"

const pacific = "America/Los_Angeles"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function rosterName(enrollment: EnrollmentRecord): string {
  const student = enrollment.student
  if (!student) return "(unknown student)"
  const preferred = student.preferred_name?.trim()
  const legal = `${student.legal_first_name} ${student.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export type AttendanceSurface = "admin" | "faculty"

function sectionBasePath(surface: AttendanceSurface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

type Props = {
  section: CourseSectionRecord
  enrollments: EnrollmentRecord[]
  attendance: AttendanceRecord[]
  date: string
  surface: AttendanceSurface
  /** Optional parent contacts keyed by student_id. When provided, each row
   *  gets a "✉ Tardy email" link pre-filled with the tardy message template
   *  for that student's parents. */
  parentContactsByStudent?: Map<string, ParentContact[]>
  /** Used in the email signature when parent-contact links are rendered. */
  teacherDisplayName?: string
  /** If the date falls on a calendar holiday or in-service day, we surface
   *  a banner and disable the save button to discourage accidental entries.
   *  Caller passes the matching event so we can name it ("Winter recess"). */
  nonSchoolEvent?: CalendarEventRow | null
}

export function AttendanceEntry({
  section,
  enrollments,
  attendance,
  date,
  surface,
  parentContactsByStudent,
  teacherDisplayName,
  nonSchoolEvent,
}: Props) {
  // Compute weekend status from the date directly so we don't need an event
  // for "Saturday/Sunday." Holidays still flow through nonSchoolEvent.
  const [yyyy, mm, dd] = date.split("-").map(Number)
  const dayOfWeek = new Date(Date.UTC(yyyy, mm - 1, dd, 12)).getUTCDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isNonSchool = isWeekend || Boolean(nonSchoolEvent)
  const nonSchoolLabel = nonSchoolEvent
    ? `${nonSchoolEvent.title} (${categories[nonSchoolEvent.category as keyof typeof categories]?.label ?? nonSchoolEvent.category})`
    : isWeekend
    ? "Weekend"
    : null
  const gradableEnrollments = enrollments.filter(
    (e) => e.status === "enrolled" || e.status === "audit"
  )

  const recordByEnrollment = new Map<string, AttendanceRecord>()
  for (const record of attendance) {
    recordByEnrollment.set(record.enrollment_id, record)
  }

  const recordedCount = gradableEnrollments.filter((e) => recordByEnrollment.has(e.id)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={sectionBasePath(surface, section.id)}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to section
        </Link>
        <Link
          href={`${sectionBasePath(surface, section.id)}/attendance/week`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          Week view →
        </Link>
      </div>

      {isNonSchool && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-amber-900">
            No school today — {nonSchoolLabel}.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Attendance isn&rsquo;t expected. You can still pick a different
            date below; saving on a non-school day is allowed but flagged so
            it&rsquo;s easy to spot mistakes.
          </p>
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.course.code} &middot; {section.term.name}
              {section.section_code ? ` · Section ${section.section_code}` : ""}
            </p>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              Attendance &middot; {formatDate(date)}
            </h2>
            <p className="text-sm text-slate-600">
              {section.course.name} &middot; {periodLabel(section.period)}
            </p>
          </div>
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {recordedCount} of {gradableEnrollments.length} recorded
          </p>
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span className="block">Pick a different date</span>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Go to date
          </button>
        </form>
      </section>

      {gradableEnrollments.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No active students on this section&rsquo;s roster.
        </section>
      ) : (
        <form
          action={saveAttendanceAction}
          className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm space-y-4"
        >
          <input type="hidden" name="section_id" value={section.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="surface" value={surface} />

          <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,180px)_minmax(0,3fr)] items-end gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>Student</span>
            <span>Status</span>
            <span>Note (optional)</span>
          </div>

          <ul className="space-y-3">
            {gradableEnrollments.map((enrollment) => {
              const existing = recordByEnrollment.get(enrollment.id)
              return (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <input type="hidden" name="enrollment_id" value={enrollment.id} />
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,180px)_minmax(0,3fr)] lg:items-center">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {rosterName(enrollment)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {enrollment.student?.profile?.email ?? "—"}
                      </p>
                      {parentContactsByStudent && enrollment.student && (() => {
                        const contacts =
                          parentContactsByStudent.get(enrollment.student.id) ?? []
                        if (contacts.length === 0) return null
                        const messageOpts = tardyMessage({
                          contacts,
                          student: {
                            preferred_name: enrollment.student.preferred_name,
                            legal_first_name: enrollment.student.legal_first_name,
                            legal_last_name: enrollment.student.legal_last_name,
                          },
                          courseName: section.course.name,
                          date,
                          teacherName: teacherDisplayName ?? "Your teacher",
                        })
                        const mailto = buildMailtoUrl(messageOpts)
                        const teams = buildTeamsChatUrl(messageOpts)
                        const parentCount = contacts.length
                        return (
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                            <a
                              href={mailto}
                              className="inline-flex items-center gap-1 font-semibold text-brand-navy underline-offset-2 hover:underline"
                              title={`Email ${parentCount} parent${parentCount === 1 ? "" : "s"} the tardy template`}
                            >
                              ✉ Email tardy
                            </a>
                            <a
                              href={teams}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-brand-navy underline-offset-2 hover:underline"
                              title={`Open a Teams chat with ${parentCount} parent${parentCount === 1 ? "" : "s"} (requires Microsoft account on their end)`}
                            >
                              💬 Teams
                            </a>
                          </div>
                        )
                      })()}
                    </div>

                    <label className="block lg:hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={existing?.status ?? "present"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {attendanceStatusSchema.options.map((status) => (
                        <option key={status} value={status}>
                          {attendanceStatusLabels[status]}
                        </option>
                      ))}
                    </select>

                    <label className="block lg:hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Note
                    </label>
                    <input
                      name="note"
                      defaultValue={existing?.note ?? ""}
                      maxLength={2000}
                      placeholder="Optional context — doctor's appointment, etc."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">
              Rows where the student is marked Present and has no note are
              skipped on first save &mdash; only exceptions get persisted.
              Updates to existing rows save regardless.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Save attendance
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
