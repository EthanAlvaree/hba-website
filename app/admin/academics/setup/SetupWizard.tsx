"use client"

import { useMemo, useState } from "react"
import { runTermSetupAction } from "./actions"

type SuggestedEvent = {
  title: string
  start: string
  end: string
  category: "academics" | "holiday" | "faculty" | "community"
  enabled: boolean
}

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + days)
  return ymd(dt)
}

function previousWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6) {
    dt.setUTCDate(dt.getUTCDate() - 1)
  }
  return ymd(dt)
}

function suggestEvents(start: string, end: string): SuggestedEvent[] {
  if (!start || !end || start >= end) return []
  // First day = start_date; Last day = end_date (or last weekday on or
  // before). Finals week = last 5 weekdays of the term.
  const lastWeekday = previousWeekday(end)
  const finalsStart = (() => {
    let count = 0
    let cursor = lastWeekday
    while (count < 4) {
      cursor = addDays(cursor, -1)
      const [y, m, d] = cursor.split("-").map(Number)
      const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
      if (dow !== 0 && dow !== 6) count += 1
    }
    return cursor
  })()
  return [
    {
      title: "First day of class",
      start,
      end: start,
      category: "academics",
      enabled: true,
    },
    {
      title: "Last day of class",
      start: lastWeekday,
      end: lastWeekday,
      category: "academics",
      enabled: true,
    },
    {
      title: "Final exams week",
      start: finalsStart,
      end: lastWeekday,
      category: "academics",
      enabled: true,
    },
  ]
}

export function SetupWizard({ defaults }: { defaults?: { start?: string; end?: string } }) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [kind, setKind] = useState<"fall" | "spring" | "summer">("fall")
  const [academicYear, setAcademicYear] = useState("")
  const [startDate, setStartDate] = useState(defaults?.start ?? "")
  const [endDate, setEndDate] = useState(defaults?.end ?? "")
  const [isCurrent, setIsCurrent] = useState(true)

  const [events, setEvents] = useState<SuggestedEvent[]>(() =>
    suggestEvents(defaults?.start ?? "", defaults?.end ?? "")
  )
  const [eventsTouched, setEventsTouched] = useState(false)

  // Re-seed event suggestions when term dates change AND the user hasn't
  // manually edited the event list yet. Once the user touches the events,
  // we preserve their edits.
  const seededEvents = useMemo(
    () => suggestEvents(startDate, endDate),
    [startDate, endDate]
  )
  function maybeReseed(nextStart: string, nextEnd: string) {
    if (!eventsTouched) {
      setEvents(suggestEvents(nextStart, nextEnd))
    }
  }

  function updateEvent(idx: number, patch: Partial<SuggestedEvent>) {
    setEventsTouched(true)
    setEvents((current) =>
      current.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    )
  }

  function removeEvent(idx: number) {
    setEventsTouched(true)
    setEvents((current) => current.filter((_, i) => i !== idx))
  }

  function addEvent() {
    setEventsTouched(true)
    setEvents((current) => [
      ...current,
      {
        title: "",
        start: startDate || "",
        end: startDate || "",
        category: "academics",
        enabled: true,
      },
    ])
  }

  return (
    <form action={runTermSetupAction} className="space-y-6">
      {/* Step 1: Term basics */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">1. Term basics</h2>
        <p className="mt-1 text-sm text-slate-600">
          Name the term, set its dates, and mark it current if you want
          attendance + scheduling to default to it immediately.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name" required>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Fall 2026"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Slug" required hint="Lowercase letters, digits, hyphens.">
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              placeholder="fall-2026"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Kind" required>
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="fall">Fall</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
            </select>
          </Field>
          <Field label="Academic year" required hint="Format: 2026-2027.">
            <input
              name="academic_year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              pattern="\d{4}-\d{4}"
              placeholder="2026-2027"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Start date" required>
            <input
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                maybeReseed(e.target.value, endDate)
              }}
              required
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="End date" required>
            <input
              name="end_date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                maybeReseed(startDate, e.target.value)
              }}
              required
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Current term" full>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_current"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
              />
              <span>
                Mark this as the current term (only one term can be current; we
                clear the flag on the previous one automatically).
              </span>
            </label>
          </Field>
        </div>
      </section>

      {/* Step 2: Suggested calendar events */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">2. Calendar events</h2>
            <p className="mt-1 text-sm text-slate-600">
              We&rsquo;ll suggest a few academic landmarks based on your dates.
              Check the boxes for the ones you want created on the public
              calendar + SIS attendance grids. You can add more after the term
              is set up.
            </p>
          </div>
          {!eventsTouched && seededEvents.length > 0 && events.length === 0 && (
            <button
              type="button"
              onClick={() => setEvents(seededEvents)}
              className="rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              Use suggested events
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No events to create. Set start + end dates above to see
            suggestions, or click <em>Add event</em> below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((ev, idx) => (
              <li
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                  <input
                    type="checkbox"
                    checked={ev.enabled}
                    onChange={(e) => updateEvent(idx, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                  />
                  <input
                    name="event_title"
                    value={ev.title}
                    onChange={(e) => updateEvent(idx, { title: e.target.value })}
                    placeholder="Event title"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    name="event_start_date"
                    type="date"
                    value={ev.start}
                    onChange={(e) => updateEvent(idx, { start: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    name="event_end_date"
                    type="date"
                    value={ev.end}
                    onChange={(e) => updateEvent(idx, { end: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <select
                    name="event_category"
                    value={ev.category}
                    onChange={(e) =>
                      updateEvent(idx, { category: e.target.value as SuggestedEvent["category"] })
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="academics">Academics</option>
                    <option value="holiday">Holiday / break</option>
                    <option value="faculty">Faculty in-service</option>
                    <option value="community">Community</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeEvent(idx)}
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
                {ev.enabled && (
                  <input type="hidden" name="event_enabled" value={String(idx)} />
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={addEvent}
          className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          + Add event
        </button>
      </section>

      {/* Step 3: Submit */}
      <section className="rounded-[2rem] border border-brand-navy/30 bg-brand-navy text-white px-6 py-6 shadow-md">
        <h2 className="text-lg font-extrabold">3. Create term + events</h2>
        <p className="mt-1 text-sm text-white/80">
          One click creates the term and every checked calendar event. After
          that, head over to the Sections tab to add this term&rsquo;s
          courses, or to the Scheduler if you want to auto-generate from
          student course requests.
        </p>
        <button
          type="submit"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Run setup
        </button>
      </section>
    </form>
  )
}

function Field({
  label,
  required,
  hint,
  full,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      className={`space-y-1 text-xs font-medium text-slate-700 ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="block">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}
