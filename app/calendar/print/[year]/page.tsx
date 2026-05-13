// app/calendar/print/[year]/page.tsx

import { notFound } from "next/navigation"
import Link from "next/link"
import { getAllEvents } from "@/lib/events-server"
import { effectiveEnd, SchoolEvent } from "@/lib/events"
import { categories, CategoryKey } from "@/lib/categories"
import { siteConfig } from "@/lib/site"
import PrintToolbar from "./PrintToolbar"

// `force-dynamic` so admin edits to the DB calendar surface here without
// waiting for the next 1-hour revalidate window.
export const dynamic = "force-dynamic"

const SUPPORTED_START_YEARS = ["2025", "2026"] as const

export function generateStaticParams() {
  return SUPPORTED_START_YEARS.map((year) => ({ year }))
}

interface Props {
  params: Promise<{ year: string }>
}

const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"]

interface MonthSpec {
  year: number
  month: number // 0-indexed
}

function buildAcademicYearMonths(startYear: number): MonthSpec[] {
  const months: MonthSpec[] = []
  for (let i = 0; i < 12; i++) {
    const month = (7 + i) % 12 // start at August (index 7)
    const year = startYear + (i < 5 ? 0 : 1)
    months.push({ year, month })
  }
  return months
}

function isoDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0")
  const d = String(day).padStart(2, "0")
  return `${year}-${m}-${d}`
}

/** Build a fixed 6×7 grid of date cells starting from the Sunday on or before day 1 of the month. */
function buildMonthCells(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1)
  const startSundayOffset = firstOfMonth.getDay()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startSundayOffset + i)
    cells.push({ date: d, inMonth: d.getMonth() === month })
  }
  return cells
}

/** Categories ordered by visual priority for marker selection. */
const CATEGORY_PRIORITY: CategoryKey[] = ["holiday", "faculty", "academics", "community"]

function eventsCoveringDate(events: SchoolEvent[], dateISO: string): SchoolEvent[] {
  return events.filter((ev) => ev.start <= dateISO && effectiveEnd(ev) > dateISO)
}

function pickPrimaryCategory(evs: SchoolEvent[]): CategoryKey | null {
  if (evs.length === 0) return null
  for (const cat of CATEGORY_PRIORITY) {
    if (evs.some((e) => e.category === cat)) return cat
  }
  return evs[0].category
}

function markerFor(category: CategoryKey | null): string | null {
  if (category === "holiday") return "H"
  if (category === "faculty") return "INS"
  return null
}

function eventsListedFor(events: SchoolEvent[], year: number, month: number): SchoolEvent[] {
  const monthStart = isoDate(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = isoDate(year, month, lastDay)
  return events.filter((ev) => ev.start >= monthStart && ev.start <= monthEnd)
}

function formatEventDateLabel(ev: SchoolEvent): string {
  const start = new Date(ev.start + "T00:00:00")
  const lastInclusive = new Date(effectiveEnd(ev) + "T00:00:00")
  lastInclusive.setDate(lastInclusive.getDate() - 1)

  const sameDay = start.toDateString() === lastInclusive.toDateString()
  const startLabel = `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}`
  if (sameDay) return startLabel

  const sameMonth =
    start.getMonth() === lastInclusive.getMonth() &&
    start.getFullYear() === lastInclusive.getFullYear()
  if (sameMonth) {
    return `${startLabel}–${lastInclusive.getDate()}`
  }
  return `${startLabel} – ${MONTH_NAMES_SHORT[lastInclusive.getMonth()]} ${lastInclusive.getDate()}`
}

export default async function PrintCalendarPage({ params }: Props) {
  const { year: yearStr } = await params

  if (!SUPPORTED_START_YEARS.includes(yearStr as typeof SUPPORTED_START_YEARS[number])) {
    notFound()
  }

  const startYear = parseInt(yearStr, 10)
  const endYear = startYear + 1
  const events = await getAllEvents()
  const months = buildAcademicYearMonths(startYear)

  const otherYear = startYear === 2025 ? "2026" : "2025"
  const otherYearLabel = startYear === 2025 ? "2026–2027" : "2025–2026"

  return (
    <div className="print-page">
      <div className="print-toolbar">
        <Link
          href="/calendar"
          className="text-xs font-bold uppercase tracking-widest text-brand-navy hover:text-brand-orange transition-colors"
        >
          ← Back to calendar
        </Link>

        <div className="flex flex-wrap gap-3 items-center">
          <Link
            href={`/calendar/print/${otherYear}`}
            className="text-xs font-semibold text-brand-navy hover:text-brand-orange transition-colors"
          >
            View {otherYearLabel} →
          </Link>
          <PrintToolbar />
        </div>
      </div>

      <article className="print-sheet">
        <header className="print-masthead">
          <h1>{siteConfig.name} Academic Calendar</h1>
          <div className="print-year">
            {startYear} to {endYear}
          </div>
        </header>

        <div className="print-grid">
          {months.map(({ year, month }) => {
            const cells = buildMonthCells(year, month)
            const listed = eventsListedFor(events, year, month)
            return (
              <div key={`${year}-${month}`} className="print-month">
                <div className="print-month-header">
                  {MONTH_NAMES_FULL[month]} {year}
                </div>
                <div className="print-day-header">
                  {DAY_HEADERS.map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <div className="print-month-grid">
                  {cells.map(({ date, inMonth }, i) => {
                    const dateISO = isoDate(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                    )
                    const dayEvents = inMonth
                      ? eventsCoveringDate(events, dateISO)
                      : []
                    const primary = pickPrimaryCategory(dayEvents)
                    const marker = markerFor(primary)
                    const cls = [
                      "print-day",
                      inMonth ? "" : "off-month",
                      primary ? `is-${primary}` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                    return (
                      <div key={i} className={cls}>
                        <span className="print-day-num">{date.getDate()}</span>
                        {marker && (
                          <span className="print-day-marker">{marker}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {listed.length > 0 && (
                  <ul className="print-month-events">
                    {listed.map((ev) => (
                      <li key={ev.id}>
                        <span
                          className="dot"
                          style={{ backgroundColor: categories[ev.category].color }}
                        />
                        <span>
                          <span className="ev-date">
                            {formatEventDateLabel(ev)}
                          </span>
                          {" — "}
                          {ev.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>

        <div className="print-legend">
          <span className="print-legend-item">
            <span
              className="print-legend-swatch"
              style={{ background: "#e2e8f0" }}
            />
            <strong>H</strong>&nbsp;Holiday or break
          </span>
          <span className="print-legend-item">
            <span
              className="print-legend-swatch"
              style={{ background: "#f1f5f9" }}
            />
            <strong>INS</strong>&nbsp;Teacher in-service — no school for students
          </span>
          <span className="print-legend-item">
            <span
              className="print-legend-swatch"
              style={{ background: "rgba(243, 112, 33, 0.10)" }}
            />
            Academic milestone
          </span>
          <span className="print-legend-item">
            <span
              className="print-legend-swatch"
              style={{ background: "rgba(22, 163, 74, 0.10)" }}
            />
            Community event
          </span>
        </div>

        <div className="print-footer">
          <span className="print-footer-brand">{siteConfig.name}</span>
          <span>{siteConfig.domain} · {siteConfig.contact.phone}</span>
          <span>Academic year {startYear}–{endYear}</span>
        </div>
      </article>
    </div>
  )
}
