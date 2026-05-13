// Admin-side bio editor for any faculty profile. Mounts the same
// BioCard pattern as /faculty-portal/teaching but with admin auth.
// Useful for the office team to:
//   - seed an existing faculty member's bio from the code defaults
//     so they don't see an empty form,
//   - fix a typo without bothering the faculty member,
//   - draft a bio for a brand-new hire.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  faculty as codeFaculty,
  getFacultyBioOverrideForProfile,
  type FacultyMember,
} from "@/lib/faculty"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"
import { saveBioAction } from "@/app/faculty-portal/teaching/actions"
import { seedFacultyBioForProfileAction } from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; seeded?: string; seed_error?: string }>
}

export default async function AdminFacultyBioPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const { id: profileId } = await params
  const raw = await searchParams

  const supabase = getServiceSupabase()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, first_name, last_name, roles, active")
    .eq("id", profileId)
    .maybeSingle<{
      id: string
      email: string
      display_name: string | null
      first_name: string | null
      last_name: string | null
      roles: string[]
      active: boolean
    }>()
  if (!profile) notFound()

  const override = await getFacultyBioOverrideForProfile(profile.id)

  // Match the profile to a code-side faculty entry by email convention
  // (same logic as /faculty-portal/teaching).
  const codeFacultyEntry: FacultyMember | null =
    codeFaculty.find(
      (m) =>
        profile.email.toLowerCase() ===
        `${m.slug.split("-")[0]?.toLowerCase()}@${siteConfig.contact.emailDomain}`
    ) ?? null

  const isFaculty = profile.roles.includes("faculty")
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    profile.display_name ||
    profile.email

  return (
    <div className="space-y-6">
      <Link
        href="/admin/profiles"
        className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
      >
        ← Back to profiles
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Admin · Bio editor
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {fullName}&rsquo;s public bio
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          What appears on <code className="text-xs">/faculty</code> and the
          per-faculty detail page. Changes apply within a few minutes.
        </p>
      </header>

      {!isFaculty && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This profile doesn&rsquo;t have the <code>faculty</code> role.
          Editing their bio still works, but the public faculty page
          won&rsquo;t render them unless they&rsquo;re also in{" "}
          <code>lib/faculty.ts</code>.
        </div>
      )}

      {raw.seeded === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Seeded the bio with code-side defaults. Edit below and save.
        </div>
      )}
      {raw.seeded === "already" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          A bio override already exists for this profile — nothing to seed.
        </div>
      )}
      {raw.seed_error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {raw.seed_error}
        </div>
      )}
      {raw.saved === "bio" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Bio saved. Changes appear on /faculty in a few minutes.
        </div>
      )}

      {!override && codeFacultyEntry && (
        <section className="rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-4 shadow-sm">
          <h2 className="text-base font-extrabold text-brand-navy">
            Seed from code defaults
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            This profile has no bio override yet. The form below will save
            as a new override; you can also pre-fill it with the existing
            prose from <code>lib/faculty.ts</code> first.
          </p>
          <form action={seedFacultyBioForProfileAction} className="mt-3">
            <input type="hidden" name="profile_id" value={profile.id} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Pre-fill with code defaults
            </button>
          </form>
        </section>
      )}

      <AdminBioEditor
        profileId={profile.id}
        codeDefaults={codeFacultyEntry}
        override={override}
      />
    </div>
  )
}

type BioOverride = Awaited<ReturnType<typeof getFacultyBioOverrideForProfile>>

function AdminBioEditor({
  profileId,
  codeDefaults,
  override,
}: {
  profileId: string
  codeDefaults: FacultyMember | null
  override: BioOverride
}) {
  const title = override?.title ?? codeDefaults?.title ?? ""
  const area = override?.area ?? codeDefaults?.area ?? ""
  const hbaStart = override?.hba_start ?? codeDefaults?.hbaStart ?? ""
  const careerStart = override?.career_start ?? codeDefaults?.careerStart ?? ""
  const coursesTaught = (
    override?.courses_taught ??
    codeDefaults?.coursesTaught ??
    []
  ).join("\n")
  const shortBio = override?.short_bio ?? codeDefaults?.shortBio ?? ""
  const fullBio = override?.full_bio ?? codeDefaults?.fullBio ?? ""
  const hasOverride = override !== null

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-brand-navy">Public bio</h2>
          <p className="mt-1 text-sm text-slate-600">
            Same editor the faculty member sees at{" "}
            <code className="text-xs">/faculty-portal/teaching</code>. Saves go
            through the same action; both surfaces stay in sync.
          </p>
        </div>
        {hasOverride && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Customized
          </span>
        )}
      </div>

      <form action={saveBioAction} className="mt-4 space-y-3">
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="admin" value="1" />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Title</span>
            <input
              name="title"
              defaultValue={title}
              maxLength={200}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Subject area / department</span>
            <input
              name="area"
              defaultValue={area}
              maxLength={200}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Started at HBA</span>
            <input
              name="hba_start"
              defaultValue={hbaStart}
              maxLength={80}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Teaching career began</span>
            <input
              name="career_start"
              defaultValue={careerStart}
              maxLength={200}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Courses taught (one per line)</span>
          <textarea
            name="courses_taught"
            defaultValue={coursesTaught}
            rows={5}
            maxLength={4000}
            className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Short bio</span>
          <textarea
            name="short_bio"
            defaultValue={shortBio}
            rows={2}
            maxLength={800}
            className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Full bio (paragraphs separated by a blank line)</span>
          <textarea
            name="full_bio"
            defaultValue={fullBio}
            rows={10}
            maxLength={12000}
            className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save public bio
        </button>
      </form>
    </section>
  )
}
