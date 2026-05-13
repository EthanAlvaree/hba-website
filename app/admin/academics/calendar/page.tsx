import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  calendarCategorySchema,
  listCalendarEvents,
  type CalendarEventRow,
} from "@/lib/calendar-events"
import { categories } from "@/lib/categories"
import AcademicsHeader from "../AcademicsHeader"
import {
  createCalendarEventAction,
  deleteCalendarEventAction,
  updateCalendarEventAction,
} from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    saved?: string
    deleted?: string
    error?: string
  }>
}

const pacific = "America/Los_Angeles"
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: pacific,
  }).format(new Date(`${value}T12:00:00Z`))
}

function spanLabel(ev: CalendarEventRow): string {
  // end_date is exclusive (matches the JSON convention). For display, show
  // an inclusive range: subtract a day if end_date is set.
  if (!ev.end_date) return formatDate(ev.start_date)
  const [y, m, d] = ev.end_date.split("-").map(Number)
  const last = new Date(Date.UTC(y, m - 1, d - 1, 12))
  const lastIso = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}-${String(last.getUTCDate()).padStart(2, "0")}`
  if (ev.start_date === lastIso) return formatDate(ev.start_date)
  return `${formatDate(ev.start_date)} – ${formatDate(lastIso)}`
}

export default async function CalendarAdminPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const events = await listCalendarEvents()

  // Group future + past for easier scanning.
  const today = new Date().toISOString().slice(0, 10)
  const futureOrCurrent = events.filter(
    (e) => (e.end_date ?? e.start_date) >= today
  )
  const past = events.filter((e) => (e.end_date ?? e.start_date) < today)

  return (
    <div className="space-y-6">
      <AcademicsHeader active="calendar" />

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-brand-navy">School calendar</h2>
        <p className="mt-1 text-sm text-slate-600">
          Holidays, in-service days, semester start/end, finals, graduation, and
          community events. Edits here surface immediately on the public{" "}
          <a href="/calendar" className="underline-offset-4 hover:underline">
            /calendar
          </a>{" "}
          page, the .ics subscription feed, the printable year-at-a-glance, and
          (eventually) the SIS attendance grid and scheduler.
        </p>
      </section>

      {raw.saved === "1" && (
        <Banner kind="success" message="Event saved." />
      )}
      {raw.deleted === "1" && (
        <Banner kind="success" message="Event deleted." />
      )}
      {raw.error && <Banner kind="error" message={raw.error} />}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-brand-navy">Add an event</h3>
        <p className="mt-1 text-sm text-slate-600">
          Single-day events: leave the end date blank. Multi-day events: end
          date is INCLUSIVE — pick the last day the event spans (e.g. winter
          recess Dec 22 → Jan 5).
        </p>
        <form action={createCalendarEventAction} className="mt-4">
          <EventFormFields />
          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Add event
          </button>
        </form>
      </section>

      <EventList
        title={`Upcoming & current (${futureOrCurrent.length})`}
        events={futureOrCurrent}
      />
      <EventList
        title={`Past (${past.length})`}
        events={past}
        defaultOpen={false}
      />
    </div>
  )
}

function Banner({
  kind,
  message,
}: {
  kind: "success" | "error"
  message: string
}) {
  const cls =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-900"
  return (
    <section className={`rounded-2xl border px-5 py-3 text-sm shadow-sm ${cls}`}>
      {message}
    </section>
  )
}

function EventList({
  title,
  events,
  defaultOpen = true,
}: {
  title: string
  events: CalendarEventRow[]
  defaultOpen?: boolean
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <details open={defaultOpen}>
        <summary className="cursor-pointer text-lg font-extrabold text-brand-navy">
          {title}
        </summary>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No events here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </ul>
        )}
      </details>
    </section>
  )
}

function EventRow({ event }: { event: CalendarEventRow }) {
  const catColor = categories[event.category as keyof typeof categories]?.color ?? "#64748b"
  // end_date is exclusive; the form expects INCLUSIVE for the user, so
  // compute the inclusive value.
  let inclusiveEnd = ""
  if (event.end_date) {
    const [y, m, d] = event.end_date.split("-").map(Number)
    const last = new Date(Date.UTC(y, m - 1, d - 1, 12))
    inclusiveEnd = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}-${String(last.getUTCDate()).padStart(2, "0")}`
    if (inclusiveEnd === event.start_date) inclusiveEnd = ""
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50">
      <details>
        <summary className="cursor-pointer list-none px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"
              style={{ backgroundColor: catColor }}
            >
              {categories[event.category as keyof typeof categories]?.label ?? event.category}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{event.title}</p>
              <p className="text-xs text-slate-600">{spanLabel(event)}</p>
            </div>
            <span className="text-xs font-semibold text-slate-700">Edit</span>
          </div>
        </summary>

        <div className="space-y-3 border-t border-slate-200 px-4 py-3">
          <form action={updateCalendarEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <EventFormFields
              defaults={{
                slug: event.slug,
                title: event.title,
                start_date: event.start_date,
                end_date: inclusiveEnd,
                all_day: event.all_day,
                start_time: event.start_time ?? "",
                end_time: event.end_time ?? "",
                category: event.category,
                location: event.location ?? "",
                description: event.description ?? "",
              }}
            />
            <button
              type="submit"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Save changes
            </button>
          </form>

          <form action={deleteCalendarEventAction}>
            <input type="hidden" name="id" value={event.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Delete event
            </button>
          </form>
        </div>
      </details>
    </li>
  )
}

type FormDefaults = {
  slug: string
  title: string
  start_date: string
  end_date: string
  all_day: boolean
  start_time: string
  end_time: string
  category: string
  location: string
  description: string
}

function EventFormFields({
  defaults,
}: {
  defaults?: Partial<FormDefaults>
}) {
  // We store end_date as EXCLUSIVE in the DB but ask the user for the
  // INCLUSIVE last day they want to show. The action converts before save.
  // (Implementation: we accept the user's INCLUSIVE input and store
  // INCLUSIVE in the DB, then translate at render time. Wait — actually
  // the JSON convention is exclusive, and the DB matches. For the user-
  // facing form here, we use inclusive and convert in the action.)
  // FIXME: the current actions store the form value as-is. To keep the
  // existing JSON convention (exclusive), the form ALSO uses exclusive,
  // so end_date inputs match what gets persisted. We surface a helper
  // line under the field explaining this.
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Slug" required>
        <input
          name="slug"
          required
          defaultValue={defaults?.slug ?? ""}
          placeholder="2026-12-22-winter-recess"
          maxLength={120}
          pattern="[a-z0-9-]+"
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="Title" required>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          maxLength={200}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="Start date" required>
        <input
          name="start_date"
          type="date"
          required
          defaultValue={defaults?.start_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="End date (exclusive — day AFTER last day)" hint="Leave blank for a single-day event. For winter recess Dec 22 → Jan 5, enter Jan 6.">
        <input
          name="end_date"
          type="date"
          defaultValue={defaults?.end_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="Category" required>
        <select
          name="category"
          required
          defaultValue={defaults?.category ?? "academics"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {calendarCategorySchema.options.map((c) => (
            <option key={c} value={c}>
              {categories[c]?.label ?? c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="All-day?">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="all_day"
            defaultChecked={defaults?.all_day ?? true}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>All-day event</span>
        </label>
      </Field>
      <Field label="Start time (if not all-day)">
        <input
          name="start_time"
          type="time"
          defaultValue={defaults?.start_time ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="End time (if not all-day)">
        <input
          name="end_time"
          type="time"
          defaultValue={defaults?.end_time ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="Location" full>
        <input
          name="location"
          defaultValue={defaults?.location ?? ""}
          maxLength={200}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
      <Field label="Description" full>
        <textarea
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
          maxLength={4000}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </Field>
    </div>
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
