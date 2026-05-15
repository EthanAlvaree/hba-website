import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listAdminAuditEvents,
  listAuditActionCodes,
  type AdminAuditRecord,
} from "@/lib/audit"
import BackupNowButton from "./BackupNowButton"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

type PageProps = {
  searchParams: Promise<{
    action?: string
    actor?: string
    target_kind?: string
    target_id?: string
    date_from?: string
    date_to?: string
  }>
}

function actionLabel(code: string): string {
  // Human-friendly label for known codes. Fall back to the raw code so new
  // event types still surface in the UI without a code change.
  switch (code) {
    case "admin.promote":
      return "Promote to admin"
    case "admin.demote":
      return "Demote from admin"
    case "profile.delete":
      return "Delete profile"
    case "profile.roles_update":
      return "Update roles"
    case "profile.active_update":
      return "Activate / deactivate"
    case "term.lock":
      return "Lock term grades"
    case "term.unlock":
      return "Unlock term grades"
    case "section.grades_lock":
      return "Lock section grades"
    case "section.grades_unlock":
      return "Unlock section grades"
    case "schedule_draft.commit":
      return "Commit schedule draft"
    case "schedule_draft.discard":
      return "Discard schedule draft"
    case "parent_links.bulk_import":
      return "Bulk import parent links"
    case "m365_sync.manual":
      return "Manual M365 sync"
    case "db_backup.cron":
      return "Cron DB snapshot"
    case "db_backup.manual":
      return "Manual DB snapshot"
    case "profile_photo.bulk_upload":
      return "Bulk profile photo upload"
    case "profile_photo.upload":
      return "Upload profile photo"
    case "profile_photo.clear":
      return "Remove profile photo"
    case "profile_photo.m365_resync":
      return "Resync photo from M365"
    case "student.withdraw":
      return "Withdraw student"
    case "mass_email.send":
      return "Mass email sent"
    case "mass_email.schedule":
      return "Mass email scheduled"
    case "mass_email.cancel_scheduled":
      return "Mass email scheduled-send cancelled"
    case "mass_email.dispatch_scheduled":
      return "Scheduled mass email dispatched"
    default:
      return code
  }
}

function actionBadgeClass(code: string): string {
  if (code.startsWith("admin.")) return "border-amber-200 bg-amber-50 text-amber-800"
  if (code.startsWith("profile.")) return "border-rose-200 bg-rose-50 text-rose-700"
  if (code.startsWith("term.") || code.startsWith("section.")) {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }
  if (code.startsWith("schedule_draft.")) {
    return "border-violet-200 bg-violet-50 text-violet-700"
  }
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function buildFilterHref(current: Record<string, string | undefined>, overrides: Record<string, string>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...current, ...overrides })) {
    if (v && v.length > 0) params.set(k, v)
  }
  const qs = params.toString()
  return qs ? `/admin/audit-log?${qs}` : "/admin/audit-log"
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const raw = await searchParams

  const [events, actionCodes] = await Promise.all([
    listAdminAuditEvents({
      action: raw.action,
      actor_email: raw.actor,
      target_kind: raw.target_kind,
      target_id: raw.target_id,
      date_from: raw.date_from,
      date_to: raw.date_to,
      limit: 250,
    }),
    listAuditActionCodes(),
  ])

  const anyFilter = Boolean(
    raw.action || raw.actor || raw.target_kind || raw.target_id || raw.date_from || raw.date_to
  )

  // CSV export carries the same filters as the page so "what you see is
  // what you download." Built from raw so the URL stays small.
  const csvParams = new URLSearchParams()
  for (const [k, v] of Object.entries(raw)) {
    if (v && v.length > 0) csvParams.set(k, v)
  }
  const csvHref = `/api/admin/reports/audit-log.csv${csvParams.toString() ? `?${csvParams.toString()}` : ""}`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-navy">Audit log</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Every sensitive admin action (promote, demote, delete profile, lock
            a term, commit a schedule draft, bulk import) is recorded here.
            Showing the {events.length} most recent matching events.
          </p>
        </div>
        <BackupNowButton />
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,160px)_minmax(0,160px)_auto] lg:items-end">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Action</span>
            <select
              name="action"
              defaultValue={raw.action ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All actions</option>
              {actionCodes.map((code) => (
                <option key={code} value={code}>
                  {actionLabel(code)} ({code})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Actor email</span>
            <input
              name="actor"
              defaultValue={raw.actor ?? ""}
              placeholder={`admin@${siteConfig.contact.emailDomain}`}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">From</span>
            <input
              name="date_from"
              type="date"
              defaultValue={raw.date_from ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">To</span>
            <input
              name="date_to"
              type="date"
              defaultValue={raw.date_to ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Filter
            </button>
            {anyFilter && (
              <Link
                href="/admin/audit-log"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <p>
            Dates are Pacific-time calendar days. Times in results are{" "}
            {pacific.replace("America/", "")}.
          </p>
          <Link
            href={csvHref}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 px-4 py-1.5 font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            Download CSV (current filters)
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            No audit events match these filters.
          </div>
        ) : (
          events.map((event) => <AuditRow key={event.id} event={event} filters={raw} />)
        )}
      </section>
    </div>
  )
}

function AuditRow({
  event,
  filters,
}: {
  event: AdminAuditRecord
  filters: Record<string, string | undefined>
}) {
  const detailEntries = event.details
    ? Object.entries(event.details).filter(([, v]) => v !== null && v !== undefined)
    : []

  return (
    <details className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm open:border-brand-navy/20 open:shadow-md">
      <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] lg:items-center">
          <p className="text-xs font-semibold text-slate-700">
            {formatTimestamp(event.created_at)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${actionBadgeClass(event.action)}`}
            >
              {actionLabel(event.action)}
            </span>
            {event.target_kind && (
              <Link
                href={buildFilterHref(filters, {
                  target_kind: event.target_kind,
                  target_id: event.target_id ?? "",
                })}
                className="text-xs text-slate-600 hover:underline"
              >
                {event.target_kind}
                {event.target_id ? ` · ${event.target_id.slice(0, 8)}` : ""}
              </Link>
            )}
          </div>
          <Link
            href={buildFilterHref(filters, { actor: event.actor_email })}
            className="text-xs font-semibold text-slate-700 hover:underline"
          >
            {event.actor_email}
          </Link>
          <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Details
          </span>
        </div>
      </summary>

      <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
        {detailEntries.length === 0 ? (
          <p className="text-xs text-slate-500">No structured details on this event.</p>
        ) : (
          <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {detailEntries.map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {key}
                </dt>
                <dd className="mt-1 text-slate-800 break-words">
                  {typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {(event.ip || event.user_agent) && (
          <p className="mt-3 text-[11px] text-slate-500">
            {event.ip && <>IP: {event.ip}</>}
            {event.ip && event.user_agent && " · "}
            {event.user_agent && <>UA: {event.user_agent}</>}
          </p>
        )}
      </div>
    </details>
  )
}
