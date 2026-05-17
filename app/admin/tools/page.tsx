// Admin tools page.
//
// One-shot, run-occasionally operations that used to clutter the
// Profiles page. Sync from M365, push photos from a zip, copy
// code-side defaults into DB rows. Each tool is idempotent.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { siteConfig } from "@/lib/site"
import { listRecentM365SyncRuns, type M365SyncRunRow } from "@/lib/m365-sync"
import { seedQualificationsFromBiosAction } from "../profiles/actions"
import { SyncM365Buttons } from "./SyncM365Button"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    bio_seed_ok?: string
    bio_seed_error?: string
    bios_matched?: string
    bios_total?: string
    inserted?: string
    existing?: string
    no_profile_count?: string
    no_course_count?: string
    no_profile?: string
    no_course?: string
  }>
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value))
}

function statusPill(status: M365SyncRunRow["status"]): string {
  switch (status) {
    case "queued":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "running":
      return "border-sky-200 bg-sky-50 text-sky-800"
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-800"
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-800"
    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-700"
  }
}

export default async function AdminToolsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const recentRuns = await listRecentM365SyncRuns(10)
  const activeRun = recentRuns.find(
    (r) => r.status === "queued" || r.status === "running"
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold text-brand-navy">Admin tools</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          One-shot operations. Each one is idempotent — safe to re-run
          when you&rsquo;ve onboarded new faculty, added courses, or
          forced a fresh photo pull from Microsoft 365.
        </p>
      </header>

      {/* M365 sync ------------------------------------------------------- */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-lg font-extrabold text-brand-navy">
              Sync from Microsoft 365
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pulls every @{siteConfig.contact.emailDomain} mailbox from your tenant
              and creates/updates a profile row for each. Existing roles
              are preserved; new profiles start with empty roles and get
              <code className="text-xs"> faculty</code> backfilled on
              their first sign-in. Disabled M365 accounts are deactivated
              here too.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Runs in the background in batches of 25 — safe to navigate
              away. You&rsquo;ll be redirected to a live status page with
              a progress bar.
            </p>
          </div>
          {activeRun ? (
            <Link
              href={`/admin/tools/m365-syncs/${activeRun.id}`}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              View running sync →
            </Link>
          ) : (
            <SyncM365Buttons />
          )}
        </div>
      </section>

      {/* Recent runs ---------------------------------------------------- */}
      {recentRuns.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">
            Recent M365 syncs
          </h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {recentRuns.map((run) => {
              const total = run.total_users ?? 0
              const pct =
                total > 0
                  ? Math.round((run.processed_users / total) * 100)
                  : run.status === "done"
                    ? 100
                    : 0
              return (
                <li
                  key={run.id}
                  className="flex flex-wrap items-center gap-3 py-3 text-sm"
                >
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusPill(run.status)}`}
                  >
                    {run.status}
                  </span>
                  <Link
                    href={`/admin/tools/m365-syncs/${run.id}`}
                    className="font-mono text-xs text-brand-navy hover:underline"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {formatTimestamp(run.created_at)}
                  </span>
                  <span className="text-xs text-slate-600">
                    by{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px]">
                      {run.started_by_email}
                    </code>
                  </span>
                  <span className="ml-auto text-xs text-slate-600">
                    {run.processed_users}/{total} · {pct}%
                  </span>
                  {run.force_photo_resync && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Photo resync
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Bulk photo upload ---------------------------------------------- */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">
              Bulk profile photos
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Drop a zip of headshots named by username (e.g.{" "}
              <span className="font-mono text-xs">jane.doe.27.jpg</span>)
              and they&rsquo;ll be matched and uploaded automatically.
              Optionally push to M365 in the same step.
            </p>
          </div>
          <Link
            href="/admin/profiles/bulk-photo-upload"
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-6 py-3 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            Open bulk upload →
          </Link>
        </div>
      </section>

      {/* Teacher qualifications seed ------------------------------------ */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">
              Seed teacher qualifications from bios
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Reads <code className="text-xs">lib/faculty.ts</code> and
              creates a <code className="text-xs">teacher_qualifications</code>{" "}
              row for every (faculty member × course) pair listed on their
              public bio. Matches bio → profile by first-name email (e.g.
              Ellen Sullivan → ellen@{siteConfig.contact.emailDomain}); courses match
              the catalog by exact name. Idempotent — rows that already
              exist are left alone. Faculty can refine rank/notes on{" "}
              <code className="text-xs">/faculty-portal/teaching</code> after.
            </p>
          </div>
          <form action={seedQualificationsFromBiosAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Seed from bios
            </button>
          </form>
        </div>
      </section>

      {raw.bio_seed_ok === "1" && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">
            Bio import complete.
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Matched {raw.bios_matched ?? 0} of {raw.bios_total ?? 0} bios to
            profiles. Inserted {raw.inserted ?? 0} new qualifications,{" "}
            {raw.existing ?? 0} already existed.
          </p>
          {raw.no_profile_count && Number(raw.no_profile_count) > 0 && (
            <p className="mt-2 text-xs text-emerald-800">
              <strong>{raw.no_profile_count}</strong> bio(s) had no matching
              profile (no <code>firstname@{siteConfig.contact.emailDomain}</code> in
              the DB yet): {raw.no_profile}
              {Number(raw.no_profile_count) > 8 && " … and more"}
            </p>
          )}
          {raw.no_course_count && Number(raw.no_course_count) > 0 && (
            <p className="mt-2 text-xs text-emerald-800">
              <strong>{raw.no_course_count}</strong> course(s) on bios
              had no exact-name match in the catalog: {raw.no_course}
              {Number(raw.no_course_count) > 12 && " … and more"}
            </p>
          )}
        </section>
      )}

      {raw.bio_seed_error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">
            Bio import failed.
          </p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
            {raw.bio_seed_error}
          </p>
        </section>
      )}
    </div>
  )
}
