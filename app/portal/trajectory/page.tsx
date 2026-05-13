// Student graduation-trajectory page.
//
// Shows the student's progress against HBA's published graduation
// requirements alongside an eligibility map: what they've taken, what
// they're taking now, what they're allowed to take next year, and
// what's gated behind prereqs / alternating-year rotation / grade
// level. Eligible courses can be added straight to their course-
// request list from this page; ineligible ones are surfaced so the
// reason is clear (and admin can grant an override if warranted).
//
// Two viewers:
//   - Students see their own trajectory.
//   - Admins can preview ?as=<studentId> the same way /portal works.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
  listTerms,
} from "@/lib/sis"
import {
  computeStudentTrajectory,
  listStudentCourseRequests,
  studentCourseRequestKindSchema,
  subjectAreaLabel,
  type StudentCourseRequestKind,
  type TrajectoryEntry,
  type TrajectoryResult,
  type TrajectorySubjectSummary,
} from "@/lib/scheduler"
import { addCourseRequestAction } from "../course-requests/actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    as?: string
    track?: string
    saved?: string
  }>
}

const trackLabel = (track: "basic" | "college_bound") =>
  track === "basic" ? "Basic diploma" : "College-bound"

const statusOrder: Record<TrajectoryEntry["status"], number> = {
  completed: 0,
  in_progress: 1,
  eligible: 2,
  needs_prereq: 3,
  wrong_year: 4,
  grade_locked: 5,
}

const kindLabel: Record<StudentCourseRequestKind, string> = {
  core: "Core",
  elective: "Elective",
  alternate: "Alternate",
}

export default async function TrajectoryPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")

  const raw = await searchParams
  const isStudent = profile.roles.includes("student")
  const isAdmin = session.isAdmin === true

  let targetStudentId: string | null = null
  let previewing = false
  if (isStudent) {
    const myStudent = await getStudentByProfileId(profile.id)
    targetStudentId = myStudent?.id ?? null
  }
  if (isAdmin && raw.as) {
    targetStudentId = raw.as
    previewing = true
  }
  if (!targetStudentId) notFound()

  const detail = await getStudentDetail(targetStudentId)
  if (!detail) notFound()

  const track: "basic" | "college_bound" =
    raw.track === "basic" ? "basic" : "college_bound"

  const trajectory = await computeStudentTrajectory(targetStudentId, { track })

  // Pull all terms so we can offer the next upcoming term to the
  // "Add to requests" forms. The course-request action requires a
  // term_id — pick the first not-yet-ended term whose academic_year
  // start matches the trajectory's offering-year filter.
  const todayIso = new Date().toISOString().slice(0, 10)
  const terms = await listTerms()
  const nextTerm =
    terms
      .filter((t) => t.end_date >= todayIso)
      .find(
        (t) =>
          trajectory.next_academic_year_start === null ||
          t.academic_year.startsWith(String(trajectory.next_academic_year_start))
      ) ??
    terms.find((t) => t.end_date >= todayIso) ??
    null

  // Already-requested course IDs (for the picked term) so we don't
  // surface "Add" on a course they've already added.
  const existingRequests = nextTerm
    ? await listStudentCourseRequests({
        student_id: targetStudentId,
        term_id: nextTerm.id,
      })
    : []
  const alreadyRequestedCourseIds = new Set(
    existingRequests.map((r) => r.course_id)
  )

  const studentName =
    detail.preferred_name?.trim() ||
    `${detail.legal_first_name} ${detail.legal_last_name}`

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          {previewing ? "Admin preview · trajectory" : "Graduation trajectory"}
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {studentName}&rsquo;s graduation map
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Your progress toward HBA&rsquo;s graduation requirements, plus
          the courses you&rsquo;re eligible to take next year. Click into
          any eligible course to add it to your course-request list.
          Ineligible courses are shown so the reason is clear — talk to
          your advisor if you think you should qualify.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={
              previewing
                ? `/portal/trajectory?as=${targetStudentId}&track=basic`
                : `/portal/trajectory?track=basic`
            }
            className={trackTabClass(track === "basic")}
          >
            {trackLabel("basic")}
          </Link>
          <Link
            href={
              previewing
                ? `/portal/trajectory?as=${targetStudentId}&track=college_bound`
                : `/portal/trajectory?track=college_bound`
            }
            className={trackTabClass(track === "college_bound")}
          >
            {trackLabel("college_bound")}
          </Link>
        </div>
        <Link
          href="/portal/course-requests"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          Go to course requests →
        </Link>
      </div>

      {raw.saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Added to your course requests for{" "}
          {nextTerm?.name ?? "the upcoming term"}.
        </div>
      )}

      {trajectory.next_academic_year_start !== null && (
        <p className="text-xs text-slate-500">
          Eligibility shown for the {trajectory.next_academic_year_start}–
          {trajectory.next_academic_year_start + 1} academic year.
        </p>
      )}

      <div className="space-y-6">
        {trajectory.subjects
          .filter((s) => s.entries.length > 0)
          .map((subject) => (
            <SubjectSection
              key={subject.subject_area}
              subject={subject}
              studentId={targetStudentId!}
              nextTermId={nextTerm?.id ?? null}
              track={track}
              alreadyRequestedCourseIds={alreadyRequestedCourseIds}
              previewing={previewing}
            />
          ))}

        {trajectory.unmapped_courses.length > 0 && (
          <UnmappedSection
            entries={trajectory.unmapped_courses}
            studentId={targetStudentId!}
            nextTermId={nextTerm?.id ?? null}
            alreadyRequestedCourseIds={alreadyRequestedCourseIds}
            previewing={previewing}
          />
        )}
      </div>
    </div>
  )
}

function trackTabClass(active: boolean): string {
  const base =
    "inline-flex items-center rounded-full border px-4 py-1.5 font-semibold transition"
  return active
    ? `${base} border-brand-navy bg-brand-navy text-white`
    : `${base} border-slate-200 bg-white text-slate-700 hover:border-slate-400`
}

function SubjectSection({
  subject,
  studentId,
  nextTermId,
  track,
  alreadyRequestedCourseIds,
  previewing,
}: {
  subject: TrajectorySubjectSummary
  studentId: string
  nextTermId: string | null
  track: "basic" | "college_bound"
  alreadyRequestedCourseIds: Set<string>
  previewing: boolean
}) {
  const required =
    track === "basic"
      ? subject.required_credits_basic
      : subject.required_credits_college_bound
  const credits = subject.credits_completed + subject.credits_in_progress
  const progressPct =
    required && required > 0
      ? Math.min(100, Math.round((credits / required) * 100))
      : 0

  // Sort entries by status group, then by display order (AP/honors up).
  const sortedEntries = [...subject.entries].sort((a, b) => {
    const sa = statusOrder[a.status]
    const sb = statusOrder[b.status]
    if (sa !== sb) return sa - sb
    if (a.is_ap !== b.is_ap) return a.is_ap ? -1 : 1
    if (a.is_honors !== b.is_honors) return a.is_honors ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">
            {subjectAreaLabel(subject.subject_area)}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {subject.credits_completed.toFixed(1)} earned
            {subject.credits_in_progress > 0 && (
              <> · {subject.credits_in_progress.toFixed(1)} in progress</>
            )}
            {required !== null && (
              <>
                {" "}· {required.toFixed(0)} required for {trackLabel(track).toLowerCase()}
              </>
            )}
          </p>
        </div>
        {required !== null && required > 0 && (
          <div className="w-40">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full ${
                  progressPct >= 100 ? "bg-emerald-500" : "bg-brand-orange"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] text-slate-500">
              {progressPct}%
            </p>
          </div>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {sortedEntries.map((entry) => (
          <CourseRow
            key={entry.course_id}
            entry={entry}
            studentId={studentId}
            nextTermId={nextTermId}
            alreadyRequested={alreadyRequestedCourseIds.has(entry.course_id)}
            previewing={previewing}
          />
        ))}
      </ul>
    </section>
  )
}

function UnmappedSection({
  entries,
  studentId,
  nextTermId,
  alreadyRequestedCourseIds,
  previewing,
}: {
  entries: TrajectoryEntry[]
  studentId: string
  nextTermId: string | null
  alreadyRequestedCourseIds: Set<string>
  previewing: boolean
}) {
  const sortedEntries = [...entries].sort((a, b) => {
    const sa = statusOrder[a.status]
    const sb = statusOrder[b.status]
    if (sa !== sb) return sa - sb
    return a.name.localeCompare(b.name)
  })
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-slate-50/60 px-6 py-6 shadow-sm">
      <h2 className="text-xl font-extrabold text-brand-navy">
        Other electives
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Courses not tied to a specific graduation requirement. Most
        students pick one or two from this list.
      </p>
      <ul className="mt-4 space-y-2">
        {sortedEntries.map((entry) => (
          <CourseRow
            key={entry.course_id}
            entry={entry}
            studentId={studentId}
            nextTermId={nextTermId}
            alreadyRequested={alreadyRequestedCourseIds.has(entry.course_id)}
            previewing={previewing}
          />
        ))}
      </ul>
    </section>
  )
}

function CourseRow({
  entry,
  studentId,
  nextTermId,
  alreadyRequested,
  previewing,
}: {
  entry: TrajectoryEntry
  studentId: string
  nextTermId: string | null
  alreadyRequested: boolean
  previewing: boolean
}) {
  const toneClass = (() => {
    switch (entry.status) {
      case "completed":
        return "border-emerald-200 bg-emerald-50/60"
      case "in_progress":
        return "border-sky-200 bg-sky-50/60"
      case "eligible":
        return "border-brand-navy/20 bg-white"
      case "needs_prereq":
        return "border-amber-200 bg-amber-50/40"
      case "wrong_year":
      case "grade_locked":
        return "border-slate-200 bg-slate-50 opacity-80"
    }
  })()

  return (
    <li className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {entry.name}
            </p>
            <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {entry.code}
            </code>
            {entry.is_ap && (
              <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
                AP
              </span>
            )}
            {entry.is_honors && !entry.is_ap && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                Honors
              </span>
            )}
            {entry.override_granted && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                Override granted
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {entry.credit_hours.toFixed(1)} credit{entry.credit_hours === 1 ? "" : "s"}
            {entry.grade_levels.length > 0 && (
              <> · Grades {entry.grade_levels.join("/")}</>
            )}
            {entry.offered_pattern === "odd_start_year" && (
              <> · Offered odd-start years</>
            )}
            {entry.offered_pattern === "even_start_year" && (
              <> · Offered even-start years</>
            )}
          </p>
        </div>

        <StatusDetail entry={entry} />

        <div className="flex justify-end">
          {entry.status === "eligible" && nextTermId && !previewing && (
            <AddToRequestForm
              studentId={studentId}
              termId={nextTermId}
              courseId={entry.course_id}
              alreadyRequested={alreadyRequested}
            />
          )}
          {entry.status === "eligible" && previewing && (
            <span className="text-[11px] italic text-slate-500">
              (admin preview)
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

function StatusDetail({ entry }: { entry: TrajectoryEntry }) {
  switch (entry.status) {
    case "completed":
      return (
        <p className="text-xs text-emerald-800">
          Completed
          {entry.completed_term_name && <> · {entry.completed_term_name}</>}
          {entry.completed_grade_letter && (
            <> · grade {entry.completed_grade_letter}</>
          )}
        </p>
      )
    case "in_progress":
      return (
        <p className="text-xs text-sky-800">
          Currently enrolled
          {entry.in_progress_term_name && <> · {entry.in_progress_term_name}</>}
        </p>
      )
    case "eligible":
      return <p className="text-xs text-slate-600">Eligible next year</p>
    case "needs_prereq": {
      // Collapse by group_key so OR-groups show once.
      const groups = new Map<string, { code: string; name: string }[]>()
      for (const m of entry.missing_prereqs ?? []) {
        const key = m.group_key ?? `_solo_${m.code}`
        const arr = groups.get(key) ?? []
        arr.push(m)
        groups.set(key, arr)
      }
      return (
        <div className="text-xs text-amber-900">
          <p className="font-semibold">Needs prereq:</p>
          <ul className="mt-1 space-y-0.5">
            {[...groups.values()].map((opts, idx) => (
              <li key={idx}>
                {opts.map((o) => o.name).join(" or ")}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case "wrong_year":
      return (
        <p className="text-xs text-slate-600">
          Not offered next year ({entry.offered_pattern === "odd_start_year" ? "odd-start years only" : "even-start years only"}).
        </p>
      )
    case "grade_locked":
      return (
        <p className="text-xs text-slate-600">
          Locked until grade{" "}
          {entry.grade_levels
            .map((g) => parseInt(g, 10))
            .filter((n) => Number.isFinite(n))
            .reduce<number | null>(
              (acc, v) => (acc === null || v < acc ? v : acc),
              null
            ) ?? "?"}
          .
        </p>
      )
  }
}

function AddToRequestForm({
  studentId,
  termId,
  courseId,
  alreadyRequested,
}: {
  studentId: string
  termId: string
  courseId: string
  alreadyRequested: boolean
}) {
  if (alreadyRequested) {
    return (
      <span className="text-[11px] font-semibold text-emerald-700">
        Already on your list ✓
      </span>
    )
  }
  return (
    <form
      action={addCourseRequestAction}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="student_id" value={studentId} />
      <input type="hidden" name="term_id" value={termId} />
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="redirect_to" value="trajectory" />
      <select
        name="kind"
        defaultValue="core"
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900"
      >
        {studentCourseRequestKindSchema.options.map((kind) => (
          <option key={kind} value={kind}>
            {kindLabel[kind]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
      >
        Add to requests
      </button>
    </form>
  )
}
