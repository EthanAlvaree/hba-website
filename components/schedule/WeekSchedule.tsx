// Shared week-at-a-glance schedule grid. Used by both the faculty portal
// (a teacher's teaching schedule) and the student portal (a student's
// class schedule). Layout is the same; only the title and the "free /
// prep" cell wording differ.

import Link from "next/link"
import {
  formatTimeHHMM,
  orderedWeekdays,
  periodMeetings,
  type PeriodMeeting,
  type Weekday,
} from "@/lib/scheduler"
import type { SectionPeriod } from "@/lib/sis"

export type ScheduleEntry = {
  /** The period this meeting belongs to; null sections are excluded
   *  upstream. */
  period: SectionPeriod
  course_name: string
  course_code: string | null
  section_code: string | null
  room: string | null
  /** Where to link when the cell is clicked. Optional. */
  href?: string
}

type Cell = {
  entry: ScheduleEntry
  start: string
  end: string
}

type Props = {
  entries: ScheduleEntry[]
  /** Async sections show as a sidebar list since they have no fixed time. */
  emptyCellLabel?: string
}

export function WeekSchedule({ entries, emptyCellLabel = "Free" }: Props) {
  // Expand each entry into one cell per (day, time) meeting.
  const cellsByDay: Record<Weekday, Cell[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
  }
  const asyncEntries: ScheduleEntry[] = []

  for (const entry of entries) {
    const meetings: PeriodMeeting[] = periodMeetings[entry.period]
    if (meetings.length === 0) {
      asyncEntries.push(entry)
      continue
    }
    for (const meeting of meetings) {
      cellsByDay[meeting.day].push({
        entry,
        start: meeting.start,
        end: meeting.end,
      })
    }
  }

  for (const day of orderedWeekdays) {
    cellsByDay[day].sort((a, b) => a.start.localeCompare(b.start))
  }

  // The longest day determines how many rows we render.
  const maxRows = Math.max(...orderedWeekdays.map((d) => cellsByDay[d].length))

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50">
              {orderedWeekdays.map((day) => (
                <th
                  key={day}
                  className="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
                >
                  {weekdayHeading(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(maxRows, 1) }).map((_, rowIdx) => (
              <tr key={rowIdx} className="align-top">
                {orderedWeekdays.map((day) => {
                  const cell = cellsByDay[day][rowIdx]
                  return (
                    <td
                      key={day}
                      className="border-b border-r border-slate-100 px-3 py-3 last:border-r-0"
                    >
                      {cell ? <CellCard cell={cell} /> : null}
                    </td>
                  )
                })}
              </tr>
            ))}
            {maxRows === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-slate-600"
                >
                  Nothing scheduled this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {asyncEntries.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-brand-navy">Async (no fixed meeting time)</h2>
          <ul className="mt-3 space-y-2">
            {asyncEntries.map((entry, i) => (
              <li
                key={`${entry.period}-${i}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-base font-semibold text-slate-900">
                  {entry.course_name}
                </p>
                <p className="text-xs text-slate-500">
                  {entry.course_code}
                  {entry.section_code ? ` · Section ${entry.section_code}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-500">
        Periods follow the HBA bell schedule. Period 5 meets Mon/Wed plus a
        shorter Friday session; Period 6 meets Tue/Thu plus Friday.
      </p>
      {/* emptyCellLabel intentionally unused for now — kept in the API so the
          two surfaces can wire different "no class" wording in the future. */}
      <span className="hidden">{emptyCellLabel}</span>
    </div>
  )
}

function CellCard({ cell }: { cell: Cell }) {
  const { entry } = cell
  const body = (
    <div className="rounded-2xl border border-brand-navy/15 bg-brand-navy/5 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
        {formatTimeHHMM(cell.start)} – {formatTimeHHMM(cell.end)}
      </p>
      <p className="mt-1 text-sm font-semibold text-brand-navy leading-tight">
        {entry.course_name}
      </p>
      <p className="mt-0.5 text-xs text-slate-600">
        {entry.course_code}
        {entry.section_code ? ` · Sec ${entry.section_code}` : ""}
      </p>
      {entry.room && (
        <p className="text-xs text-slate-500">Room {entry.room}</p>
      )}
    </div>
  )

  if (entry.href) {
    return (
      <Link href={entry.href} className="block transition hover:opacity-80">
        {body}
      </Link>
    )
  }
  return body
}

function weekdayHeading(day: Weekday): string {
  switch (day) {
    case "mon":
      return "Monday"
    case "tue":
      return "Tuesday"
    case "wed":
      return "Wednesday"
    case "thu":
      return "Thursday"
    case "fri":
      return "Friday"
  }
}
