import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getProfileByEmail, sectionPeriodSchema, type SectionPeriod } from "@/lib/sis"
import { listCourses, type CourseRecord } from "@/lib/sis"
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
  deleteQualificationAction,
  saveAvailabilityAction,
  saveQualificationAction,
  saveWorkloadAction,
} from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ saved?: string }>
}

export default async function TeachingProfilePage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  if (!profile.roles.includes("faculty") && !profile.roles.includes("admin")) {
    redirect("/admin/sign-in")
  }

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

  const raw = await searchParams
  const savedMessage =
    raw.saved === "qualification"
      ? "Qualification saved."
      : raw.saved === "availability"
      ? "Availability saved."
      : raw.saved === "workload"
      ? "Workload preferences saved."
      : null

  return (
    <div className="space-y-6">
        <div>
          <Link
            href="/faculty-portal"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to faculty portal
          </Link>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h1 className="text-3xl font-extrabold text-brand-navy">
            Teaching profile
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Update what you can teach, when you&rsquo;re available, and how
            much you want to teach. The scheduler reads this when proposing
            section assignments each term.
          </p>
        </section>

        {savedMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
            {savedMessage}
          </div>
        )}

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

// ============================================================================
// Qualifications card
// ============================================================================

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
          Courses I can teach
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add every course you&rsquo;re qualified to teach. Rank them in
          order of preference (1 = most preferred). The scheduler tries to
          give you your top-ranked courses first.
        </p>
      </div>

      {qualifications.length === 0 ? (
        <p className="text-sm text-slate-600">
          No qualifications listed yet. Add your first course below.
        </p>
      ) : (
        <ul className="space-y-2">
          {qualifications.map((q) => (
            <li
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,120px)_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {q.course?.name ?? "(deleted course)"}
                    {q.course?.code && (
                      <code className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {q.course.code}
                      </code>
                    )}
                  </p>
                  {q.notes && (
                    <p className="text-xs text-slate-500">{q.notes}</p>
                  )}
                </div>

                <form
                  action={saveQualificationAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="profile_id" value={profileId} />
                  <input type="hidden" name="course_id" value={q.course_id} />
                  <input
                    type="hidden"
                    name="notes"
                    value={q.notes ?? ""}
                  />
                  <label className="text-xs text-slate-700">
                    Rank
                    <input
                      name="preference_rank"
                      type="number"
                      min="1"
                      defaultValue={q.preference_rank}
                      className="ml-2 w-16 rounded-xl border border-slate-200 px-2 py-1 text-sm text-slate-900"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-brand-navy/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                  >
                    Update
                  </button>
                </form>

                <form action={deleteQualificationAction}>
                  <input type="hidden" name="profile_id" value={profileId} />
                  <input type="hidden" name="course_id" value={q.course_id} />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={saveQualificationAction}
        className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4"
      >
        <p className="text-sm font-semibold text-brand-navy">Add a course</p>
        <input type="hidden" name="profile_id" value={profileId} />

        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,100px)]">
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
            <span className="block">Preference rank</span>
            <input
              name="preference_rank"
              type="number"
              min="1"
              defaultValue="1"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        </div>

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

// ============================================================================
// Availability card
// ============================================================================

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
          Periods I&rsquo;m available to teach
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Check the periods you can teach. Uncheck any you can&rsquo;t (other
          commitments, want a free period, etc.). New profiles default to
          available everywhere.
        </p>
      </div>

      <form action={saveAvailabilityAction} className="space-y-3">
        <input type="hidden" name="profile_id" value={profileId} />

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
          <span className="block">Notes about your availability (optional)</span>
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

// ============================================================================
// Workload card
// ============================================================================

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
          Limits the scheduler will respect when assigning you sections. Leave
          a field blank for &ldquo;no limit&rdquo;. There are 8 periods in a
          week total (Period 1-6 plus the two Friday electives).
        </p>
      </div>

      <form action={saveWorkloadAction} className="space-y-4">
        <input type="hidden" name="profile_id" value={profileId} />

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
            placeholder="e.g. happy to teach a 4th period if it's the same prep"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save workload preferences
        </button>
      </form>
    </section>
  )
}
