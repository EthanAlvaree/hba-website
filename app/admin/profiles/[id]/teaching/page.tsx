// Admin-side teaching profile editor.
//
// Mirrors the qualifications / availability / workload cards from
// /faculty-portal/teaching, but lets an admin edit on behalf of any
// faculty member. Hits the same server actions — the assert helper
// in /faculty-portal/teaching/actions.ts already permits admins to
// touch other profiles, and the actions honor a hidden admin=1 flag
// to redirect back here after a save.
//
// Bio + portrait have their own admin editor at
// /admin/profiles/[id]/bio so this page links there instead of
// duplicating the same forms.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listCourses,
  sectionPeriodSchema,
  type CourseRecord,
  type SectionPeriod,
} from "@/lib/sis"
import {
  buildAvailabilityMap,
  getTeacherWorkload,
  listTeacherAvailability,
  listTeacherQualifications,
  periodDisplayLabel,
  type TeacherQualificationWithCourse,
  type TeacherWorkloadRecord,
} from "@/lib/scheduler"
import {
  saveAvailabilityAction,
  saveQualificationAction,
  saveWorkloadAction,
} from "@/app/faculty-portal/teaching/actions"
import { QualificationsDragList } from "@/app/faculty-portal/teaching/QualificationsDragList"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}

const savedLabels: Record<string, string> = {
  qualification: "Qualification saved.",
  availability: "Availability saved.",
  workload: "Workload preferences saved.",
}

export default async function AdminFacultyTeachingPage({
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

  const [qualifications, availability, workload, courses] = await Promise.all([
    listTeacherQualifications(profile.id),
    listTeacherAvailability(profile.id),
    getTeacherWorkload(profile.id),
    listCourses(),
  ])

  const availabilityMap = buildAvailabilityMap(availability)
  const qualifiedCourseIds = new Set(qualifications.map((q) => q.course_id))
  const availableCourses = courses.filter(
    (c) => c.active && !qualifiedCourseIds.has(c.id)
  )

  const isFaculty = profile.roles.includes("faculty")
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    profile.display_name ||
    profile.email

  const savedMessage = raw.saved ? savedLabels[raw.saved] : null

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
          Admin · Teaching profile
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {fullName}&rsquo;s teaching profile
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          What this faculty member can teach, when they&rsquo;re available,
          and how much they want to teach. The scheduler reads this when
          proposing section assignments. Edits here save on their behalf
          — they&rsquo;ll see the same data when they sign in.
        </p>
      </header>

      {!isFaculty && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This profile doesn&rsquo;t carry the <code>faculty</code> role.
          You can still edit their teaching preferences, but the scheduler
          won&rsquo;t pull them in until the role is set.
        </div>
      )}

      {savedMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {savedMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href={`/admin/profiles/${profile.id}/bio`}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        >
          Edit public bio →
        </Link>
      </div>

      <QualificationsCard
        profileId={profile.id}
        qualifications={qualifications}
        availableCourses={availableCourses}
      />

      <AvailabilityCard
        profileId={profile.id}
        availabilityMap={availabilityMap}
      />

      <WorkloadCard profileId={profile.id} workload={workload} />
    </div>
  )
}

function QualificationsCard({
  profileId,
  qualifications,
  availableCourses,
}: {
  profileId: string
  qualifications: TeacherQualificationWithCourse[]
  availableCourses: CourseRecord[]
}) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">
          Courses they can teach
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add every course this faculty member is qualified to teach. Drag
          to rank by preference (top = most preferred). The scheduler tries
          to give them their top-ranked courses first.
        </p>
      </div>

      <QualificationsDragList
        profileId={profileId}
        admin
        initial={qualifications
          .slice()
          .sort((a, b) => a.preference_rank - b.preference_rank)
          .map((q) => ({
            id: q.id,
            course_id: q.course_id,
            course_name: q.course?.name ?? "(deleted course)",
            course_code: q.course?.code ?? null,
            notes: q.notes,
          }))}
      />

      <form
        action={saveQualificationAction}
        className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
      >
        <p className="text-sm font-semibold text-brand-navy">Add a course</p>
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="admin" value="1" />
        <input
          type="hidden"
          name="preference_rank"
          value={qualifications.length + 1}
        />

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Course</span>
          <select
            name="course_id"
            required
            defaultValue=""
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Pick a course…</option>
            {availableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Notes (optional)</span>
          <input
            name="notes"
            maxLength={2000}
            placeholder="AP certified, 8 years teaching, etc."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Add qualification
        </button>
      </form>
    </section>
  )
}

function AvailabilityCard({
  profileId,
  availabilityMap,
}: {
  profileId: string
  availabilityMap: Map<SectionPeriod, boolean>
}) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">
          Periods they&rsquo;re available to teach
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tick every period this faculty member can teach. Untick the ones
          they can&rsquo;t (Tricia is out 1st period, others have a
          standing commitment, etc.). New profiles default to available
          everywhere.
        </p>
      </div>

      <form action={saveAvailabilityAction} className="space-y-3">
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="admin" value="1" />

        <ul className="space-y-2">
          {sectionPeriodSchema.options.map((period) => (
            <li
              key={period}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
            >
              <label className="flex items-center gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name={`available_${period}`}
                  defaultChecked={availabilityMap.get(period) ?? true}
                  className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                <span>{periodDisplayLabel[period]}</span>
              </label>
            </li>
          ))}
        </ul>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Notes (optional)</span>
          <textarea
            name="availability_notes"
            rows={2}
            maxLength={2000}
            placeholder="Anything the scheduler should know — out on Fridays, prefer mornings, etc."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save availability
        </button>
      </form>
    </section>
  )
}

function WorkloadCard({
  profileId,
  workload,
}: {
  profileId: string
  workload: TeacherWorkloadRecord | null
}) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">
          Workload preferences
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Limits the scheduler respects when assigning sections. Leave a
          field blank for &ldquo;no limit&rdquo;. There are 8 periods in a
          week (Period 1–6 plus the two Friday electives).
        </p>
      </div>

      <form action={saveWorkloadAction} className="space-y-4">
        <input type="hidden" name="profile_id" value={profileId} />
        <input type="hidden" name="admin" value="1" />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Min periods per week</span>
            <input
              name="min_periods_per_week"
              type="number"
              min="0"
              max="8"
              defaultValue={workload?.min_periods_per_week ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Max periods per week</span>
            <input
              name="max_periods_per_week"
              type="number"
              min="0"
              max="8"
              defaultValue={workload?.max_periods_per_week ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Max consecutive periods</span>
            <input
              name="max_consecutive_periods"
              type="number"
              min="1"
              max="6"
              defaultValue={workload?.max_consecutive_periods ?? ""}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Notes (optional)</span>
          <textarea
            name="workload_notes"
            rows={2}
            maxLength={2000}
            defaultValue={workload?.notes ?? ""}
            placeholder="Coaching commitments, advisory load, etc."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save workload
        </button>
      </form>
    </section>
  )
}
