// Admin tools page.
//
// One-shot, run-occasionally operations that used to clutter the
// Profiles page. Sync from M365, push photos from a zip, copy
// code-side defaults into DB rows. Each tool is idempotent and
// reports a result banner via search params after a run.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  seedQualificationsFromBiosAction,
  syncM365Action,
} from "../profiles/actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    sync_ok?: string
    created?: string
    updated?: string
    skipped?: string
    filtered?: string
    photos_pulled?: string
    photos_failed?: string
    sync_error?: string
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

export default async function AdminToolsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams

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
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">
              Sync from Microsoft 365
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Pulls every @highbluffacademy.com mailbox from your tenant
              and creates/updates a profile row for each. Existing roles
              are preserved; new profiles start with empty roles and get
              <code className="text-xs"> faculty</code> backfilled on
              their first sign-in. Disabled M365 accounts are deactivated
              here too.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <form action={syncM365Action}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Sync from M365
              </button>
            </form>
            <form action={syncM365Action} className="text-right">
              <input type="hidden" name="force_photo_resync" value="1" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                title="Same sync, but re-pulls every M365 profile photo even if the SIS already has one. Useful for the first round of bulk photo sync."
              >
                Sync + force-resync all photos
              </button>
            </form>
          </div>
        </div>
      </section>

      {raw.sync_ok === "1" && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">
            M365 sync complete.
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Created {raw.created ?? 0} new profile(s), updated{" "}
            {raw.updated ?? 0}, left {raw.skipped ?? 0} unchanged. Filtered{" "}
            {raw.filtered ?? 0} non-HBA / mailbox-less account(s).
            {raw.photos_pulled && Number(raw.photos_pulled) > 0 && (
              <>
                {" "}Pulled <strong>{raw.photos_pulled}</strong> profile
                photo(s) from M365.
              </>
            )}
            {raw.photos_failed && Number(raw.photos_failed) > 0 && (
              <>
                {" "}
                <span className="text-amber-800">
                  {raw.photos_failed} photo(s) failed — see server logs.
                </span>
              </>
            )}
          </p>
        </section>
      )}

      {raw.sync_error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">
            M365 sync failed.
          </p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
            {raw.sync_error}
          </p>
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
              Ellen Sullivan → ellen@highbluffacademy.com); courses match
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
              profile (no <code>firstname@highbluffacademy.com</code> in
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
