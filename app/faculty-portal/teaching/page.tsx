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
  saveAvailabilityAction,
  saveBioAction,
  saveQualificationAction,
  saveWorkloadAction,
} from "./actions"
import { QualificationsDragList } from "./QualificationsDragList"
import { listAdminAuditEvents } from "@/lib/audit"
import {
  getFacultyBioOverrideForProfile,
  faculty as codeFaculty,
  type FacultyMember,
} from "@/lib/faculty"
import { siteConfig } from "@/lib/site"

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

  const [qualifications, availability, workload, courses, recentAudit, bioOverride] = await Promise.all([
    listTeacherQualifications(profile.id),
    listTeacherAvailability(profile.id),
    getTeacherWorkload(profile.id),
    listCourses(),
    listAdminAuditEvents({ target_kind: "profile", target_id: profile.id, limit: 25 }),
    getFacultyBioOverrideForProfile(profile.id),
  ])

  // Find the code-side faculty entry that corresponds to this profile,
  // matched by the email convention (slug.split("-")[0] @ emailDomain).
  // null when there's no matching entry (e.g. a brand-new hire not yet
  // added to lib/faculty.ts).
  const codeFacultyEntry: FacultyMember | null =
    codeFaculty.find(
      (m) =>
        profile.email.toLowerCase() ===
        `${m.slug.split("-")[0]?.toLowerCase()}@${siteConfig.contact.emailDomain}`
    ) ?? null

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
      : raw.saved === "bio"
      ? "Public bio saved. Changes appear on /faculty in a few minutes."
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

        <BioCard
          profileId={profile.id}
          codeDefaults={codeFacultyEntry}
          override={bioOverride}
        />

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

        {recentAudit.length > 0 && (
          <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-brand-navy">Recent admin activity on my profile</h2>
            <p className="mt-1 text-sm text-slate-600">
              Last {recentAudit.length} admin action{recentAudit.length === 1 ? "" : "s"}
              {" "}affecting your profile — visible for transparency.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {recentAudit.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
                >
                  <span className="font-semibold text-slate-900">{ev.action}</span>
                  <span className="text-xs text-slate-600">
                    by {ev.actor_email} ·{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Los_Angeles",
                    }).format(new Date(ev.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
          Add every course you&rsquo;re qualified to teach, then drag to
          rank them by preference (top = most preferred). The scheduler
          tries to give you your top-ranked courses first. New courses
          are added at the bottom of the list.
        </p>
      </div>

      <QualificationsDragList
        profileId={profileId}
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
        {/* New qualifications are appended to the end of the list. The drag
            UI handles re-ranking after add. */}
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

// ============================================================================
// Bio card — faculty edit their public-page bio
// ============================================================================

type BioOverride = Awaited<ReturnType<typeof getFacultyBioOverrideForProfile>>

function BioCard({
  profileId,
  codeDefaults,
  override,
}: {
  profileId: string
  codeDefaults: FacultyMember | null
  override: BioOverride
}) {
  // What ends up in each input: prefer the saved override; fall back
  // to the code-side default. Empty fields render the code default as
  // a placeholder so the faculty member knows what the public page
  // will show if they leave it blank.
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
            What appears on{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              /faculty
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              /faculty/&lt;you&gt;
            </code>
            . Updates apply within a few minutes (no code change
            required).
          </p>
        </div>
        {hasOverride && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Customized
          </span>
        )}
      </div>

      {!codeDefaults && (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          You aren&rsquo;t in the static faculty list yet — your bio
          here will show up on the public page once an admin adds you
          to the directory.
        </p>
      )}

      <form action={saveBioAction} className="mt-4 space-y-3">
        <input type="hidden" name="profile_id" value={profileId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Title</span>
            <input
              name="title"
              defaultValue={title}
              maxLength={200}
              placeholder="e.g. Director of Instruction and Curriculum"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Subject area / department</span>
            <input
              name="area"
              defaultValue={area}
              maxLength={200}
              placeholder="e.g. Leadership · Mathematics · Technology"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">When you started at HBA</span>
            <input
              name="hba_start"
              defaultValue={hbaStart}
              maxLength={80}
              placeholder="e.g. June 2007"
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">When your teaching career began</span>
            <input
              name="career_start"
              defaultValue={careerStart}
              maxLength={200}
              placeholder="e.g. 2008 in Santiago, Chile"
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
            placeholder={"Chemistry: In the Earth System\nAP Chemistry\nPhysics of the Universe"}
            className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">
            Short bio (1–2 sentences for the faculty index card)
          </span>
          <textarea
            name="short_bio"
            defaultValue={shortBio}
            rows={2}
            maxLength={800}
            className="w-full rounded-3xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">
            Full bio (paragraphs separated by a blank line)
          </span>
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
