// Weekly attendance grid: rows = students, columns = Mon-Fri. Each cell has a
// status select + an optional note input. Shared between
// /admin/academics/sections/[id]/attendance/week and the faculty equivalent.
//
// Cells are encoded as parallel arrays in form data:
//   enrollment_id[] · date[] · status[] · note[]
// All four arrays have the same length and same index alignment. The server
// action groups them by date and calls saveAttendanceForSection once per day.

import Link from "next/link"
import {
  attendanceStatusLabels,
  attendanceStatusSchema,
  mondayOfWeekFor,
  type AttendanceRecord,
} from "@/lib/attendance"
import type { CourseSectionRecord, EnrollmentRecord } from "@/lib/sis"
import { periodLabel } from "@/app/admin/academics/sections/SectionFormFields"
import { saveAttendanceWeekAction } from "@/app/admin/academics/sections/[id]/attendance/actions"
import type { CalendarEventRow } from "@/lib/calendar-events"

const pacific = "America/Los_Angeles"

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function formatDayHeader(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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

export type AttendanceWeekSurface = "admin" | "faculty"

function sectionBasePath(surface: AttendanceWeekSurface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
}

type Props = {
  section: CourseSectionRecord
  enrollments: EnrollmentRecord[]
  attendance: AttendanceRecord[]
  /** Days to render as columns — typically Mon..Fri for the chosen week. */
  weekDates: string[]
  surface: AttendanceWeekSurface
  /** Optional calendar events covering this week. Used to show a "no-school"
   *  banner above the grid (e.g., "Tuesday: Veterans Day"). */
  weekNonSchoolDays?: Array<{ date: string; label: string }>
}

export function AttendanceWeekGrid({
  section,
  enrollments,
  attendance,
  weekDates,
  surface,
  weekNonSchoolDays = [],
}: Props) {
  const gradableEnrollments = enrollments.filter(
    (e) => e.status === "enrolled" || e.status === "audit"
  )

  // (enrollment_id, date) → existing record
  const recordKey = (eid: string, date: string) => `${eid}::${date}`
  const recordByCell = new Map<string, AttendanceRecord>()
  for (const r of attendance) {
    recordByCell.set(recordKey(r.enrollment_id, r.date), r)
  }

  const monday = weekDates[0]
  const sunday = weekDates[weekDates.length - 1]
  const prevMonday = mondayOfWeekFor(addDays(monday, -7))
  const nextMonday = mondayOfWeekFor(addDays(monday, 7))

  const basePath = sectionBasePath(surface, section.id)
  const weekHref = (m: string) => `${basePath}/attendance/week?week_of=${m}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={basePath}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to section
        </Link>
        <Link
          href={`${basePath}/attendance`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          Single-day view →
        </Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.course.code} &middot; {section.term.name}
              {section.section_code ? ` · Section ${section.section_code}` : ""}
            </p>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              Attendance &middot; week of {formatLongDate(monday)}
            </h2>
            <p className="text-sm text-slate-600">
              {section.course.name} &middot; {periodLabel(section.period)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={weekHref(prevMonday)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              ← Previous week
            </Link>
            <Link
              href={weekHref(nextMonday)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Next week →
            </Link>
          </div>
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span className="block">Jump to a week (pick any date in it)</span>
            <input
              name="week_of"
              type="date"
              defaultValue={monday}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Go
          </button>
        </form>
      </section>

      {weekNonSchoolDays.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">No-school days this week:</p>
          <ul className="mt-1 ml-4 list-disc">
            {weekNonSchoolDays.map((d) => (
              <li key={d.date}>
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Los_Angeles",
                }).format(new Date(`${d.date}T12:00:00Z`))}{" "}
                — {d.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gradableEnrollments.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No active students on this section&rsquo;s roster.
        </section>
      ) : (
        <form
          action={saveAttendanceWeekAction}
          className="space-y-3 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
        >
          <input type="hidden" name="section_id" value={section.id} />
          <input type="hidden" name="week_of" value={monday} />
          <input type="hidden" name="surface" value={surface} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-white py-2 pr-3 align-bottom text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Student
                  </th>
                  {weekDates.map((date) => (
                    <th
                      key={date}
                      className="py-2 px-2 align-bottom text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                    >
                      {formatDayHeader(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradableEnrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-b border-slate-100 last:border-b-0 align-top"
                  >
                    <td className="sticky left-0 z-10 bg-white py-3 pr-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {rosterName(enrollment)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {enrollment.student?.profile?.email ?? "—"}
                      </p>
                    </td>
                    {weekDates.map((date) => {
                      const existing = recordByCell.get(
                        recordKey(enrollment.id, date)
                      )
                      return (
                        <td key={date} className="py-3 px-2 min-w-[160px]">
                          <input
                            type="hidden"
                            name="enrollment_id"
                            value={enrollment.id}
                          />
                          <input type="hidden" name="date" value={date} />
                          <select
                            name="status"
                            defaultValue={existing?.status ?? "present"}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900"
                          >
                            {attendanceStatusSchema.options.map((status) => (
                              <option key={status} value={status}>
                                {attendanceStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                          <input
                            name="note"
                            defaultValue={existing?.note ?? ""}
                            maxLength={2000}
                            placeholder="Note (optional)"
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-2 py-1 text-xs text-slate-900"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">
              Cells where the student is Present and the note is empty are
              skipped on first save (unless they already exist) &mdash; saving
              doesn&rsquo;t create stale placeholder rows for the entire week.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Save week
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Week of {formatLongDate(monday)} &mdash; {formatLongDate(sunday)}
          </p>
        </form>
      )}
    </div>
  )
}
