import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listConferenceEvents,
  listSlotsForEvent,
} from "@/lib/conferences"
import AcademicsHeader from "../AcademicsHeader"
import {
  createConferenceEventAction,
  deleteConferenceEventAction,
  generateSlotsAction,
} from "./actions"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatRange(startIso: string, endIso: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  })
  return `${f.format(new Date(startIso))} – ${f.format(new Date(endIso))}`
}

type PageProps = {
  searchParams: Promise<{
    saved?: string
    deleted?: string
    generated?: string
    error?: string
  }>
}

export default async function ConferencesAdminPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const events = await listConferenceEvents()

  // Per-event slot tallies.
  const slotsByEvent = new Map<string, { open: number; booked: number; total: number }>()
  await Promise.all(
    events.map(async (ev) => {
      const slots = await listSlotsForEvent(ev.id)
      const booked = slots.filter((s) => s.booked_by_parent_email).length
      slotsByEvent.set(ev.id, {
        open: slots.length - booked,
        booked,
        total: slots.length,
      })
    })
  )

  return (
    <div className="space-y-6">
      <AcademicsHeader active="conferences" />

      <header className="space-y-2">
        <h2 className="text-2xl font-extrabold text-brand-navy">Parent-teacher conferences</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Create a conference window, generate slots for every active faculty
          member, and let parents book through the parent portal. Each parent
          books one slot per teacher; the system prevents double-booking
          atomically.
        </p>
      </header>

      {raw.saved === "1" && <Banner kind="success">Event saved.</Banner>}
      {raw.deleted === "1" && <Banner kind="success">Event deleted.</Banner>}
      {raw.generated && (
        <Banner kind="success">
          Generated{" "}
          {(() => {
            const [s, t] = raw.generated.split("_")
            return `${s} slots across ${t} teachers.`
          })()}
        </Banner>
      )}
      {raw.error && <Banner kind="error">{raw.error}</Banner>}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-brand-navy">Create a conference event</h3>
        <form action={createConferenceEventAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Slug" required>
            <input
              name="slug"
              required
              placeholder="fall-2026"
              pattern="[a-z0-9-]+"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Name" required>
            <input
              name="name"
              required
              placeholder="Fall 2026 conferences"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Start (local time)" required>
            <input
              name="start_at"
              type="datetime-local"
              required
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="End (local time)" required>
            <input
              name="end_at"
              type="datetime-local"
              required
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Slot minutes">
            <input
              name="slot_minutes"
              type="number"
              min="5"
              max="120"
              defaultValue={15}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Active?">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
              />
              <span>Visible to parents</span>
            </label>
          </Field>
          <Field label="Description" full>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Create event
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-extrabold text-brand-navy">Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-600">No events yet.</p>
        ) : (
          events.map((ev) => {
            const counts = slotsByEvent.get(ev.id)
            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-brand-navy">
                      {ev.name}
                      {!ev.active && (
                        <span className="ml-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Inactive
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatRange(ev.start_at, ev.end_at)} · {ev.slot_minutes} min slots ·{" "}
                      <code className="font-mono text-[11px]">{ev.slug}</code>
                    </p>
                    {ev.description && (
                      <p className="mt-1 text-sm text-slate-700">{ev.description}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    {counts ? (
                      <>
                        <p>
                          <strong className="text-slate-900">{counts.total}</strong> slots
                        </p>
                        <p>
                          {counts.booked} booked · {counts.open} open
                        </p>
                      </>
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={generateSlotsAction}>
                    <input type="hidden" name="event_id" value={ev.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                    >
                      {counts && counts.total > 0
                        ? "Regenerate slots (idempotent)"
                        : "Generate slots"}
                    </button>
                  </form>
                  <form action={deleteConferenceEventAction}>
                    <input type="hidden" name="event_id" value={ev.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete event
                    </button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "error"
  children: React.ReactNode
}) {
  const cls =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-900"
  return (
    <section className={`rounded-2xl border px-5 py-3 text-sm shadow-sm ${cls}`}>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string
  required?: boolean
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
    </label>
  )
}
