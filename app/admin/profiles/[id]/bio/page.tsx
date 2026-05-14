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
  facultyPortraitUrl,
  getFacultyBioForProfile,
  type FacultyBioRow,
} from "@/lib/faculty"
import FacultyPortraitCard from "@/components/faculty/PortraitCard"
import { getServiceSupabase } from "@/lib/supabase-server"
import { saveBioAction } from "@/app/faculty-portal/teaching/actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; portrait?: string }>
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

  const bio = await getFacultyBioForProfile(profile.id)

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
          Editing their bio still works, but you may want to add the
          role on the profiles page so the rest of the SIS treats them
          as faculty.
        </div>
      )}

      {raw.saved === "bio" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Bio saved. Changes appear on /faculty in a few minutes.
        </div>
      )}
      {raw.portrait === "cleared" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Portrait override removed. The code-side default is in use again.
        </div>
      )}

      <FacultyPortraitCard
        profileId={profile.id}
        currentPortraitUrl={facultyPortraitUrl(bio?.public_photo_path ?? null)}
        codeImagePath={bio?.image ?? null}
        asAdmin
      />

      <AdminBioEditor profileId={profile.id} bio={bio} fullName={fullName} />
    </div>
  )
}

function AdminBioEditor({
  profileId,
  bio,
  fullName,
}: {
  profileId: string
  bio: FacultyBioRow | null
  fullName: string
}) {
  const slug = bio?.slug ?? ""
  const name = bio?.name ?? fullName
  const title = bio?.title ?? ""
  const area = bio?.area ?? ""
  const hbaStart = bio?.hba_start ?? ""
  const careerStart = bio?.career_start ?? ""
  const coursesTaught = (bio?.courses_taught ?? []).join("\n")
  const shortBio = bio?.short_bio ?? ""
  const fullBio = bio?.full_bio ?? ""
  const hasRow = bio !== null

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-brand-navy">Public bio</h2>
          <p className="mt-1 text-sm text-slate-600">
            The faculty_bios record powering{" "}
            <code className="text-xs">/faculty</code>. The faculty member
            edits the same fields (minus URL slug) at{" "}
            <code className="text-xs">/faculty-portal/teaching</code>.
          </p>
        </div>
        {hasRow && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            On file
          </span>
        )}
      </div>

      <form action={saveBioAction} className="mt-4 space-y-3">
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="admin" value="1" />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">
              Display name <span className="text-rose-600">*</span>
            </span>
            <input
              name="name"
              defaultValue={name}
              maxLength={160}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">
              URL slug <span className="text-rose-600">*</span>
            </span>
            <input
              name="slug"
              defaultValue={slug}
              maxLength={120}
              placeholder="e.g. jane-doe — lives at /faculty/jane-doe"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
        <p className="-mt-1 text-[11px] text-slate-500">
          Name + slug publish this person on the public faculty page.
          Keep the slug stable once set — changing it breaks the
          existing URL.
        </p>

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
