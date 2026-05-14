// Student graduation-trajectory page — the sideways-tree builder.
//
// Each core subject area renders as a tree growing left-to-right:
// one node per school year. Past + current years are solid (the
// course the student took/is taking). The "next year" column is the
// interactive pick column — eligible courses branch out as selectable
// cards that drop straight into the student's course-request list.
// Years beyond next render faded, previewing what unlocks later.
//
// This page is the BUILDER. /portal/course-requests is the
// REVIEW + SUBMIT step — students assemble their list here, then go
// there to rank + submit.
//
// Two viewers, both can edit:
//   - Students build their own trajectory.
//   - Admins open ?as=<studentId> to build on a student's behalf —
//     the add forms post with admin=1 and bounce back here.

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
  listStudentAvailability,
  listStudentCourseRequests,
  studentCourseRequestKindSchema,
  subjectAreaLabel,
  type StudentCourseRequestKind,
  type TrajectoryEntry,
  type TrajectorySubjectSummary,
} from "@/lib/scheduler"
import StudentAvailabilityCard from "@/components/portal/StudentAvailabilityCard"
import { addCourseRequestAction } from "../course-requests/actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    as?: string
    track?: string
    saved?: string // "1" = course request added; "availability" = availability saved
  }>
}

const trackLabel = (track: "basic" | "college_bound") =>
  track === "basic" ? "Basic diploma" : "College-bound"

const kindLabel: Record<StudentCourseRequestKind, string> = {
  core: "Core",
  elective: "Elective",
  alternate: "Alternate",
}

function gradeLabel(grade: number): string {
  const suffix =
    grade === 9
      ? "th"
      : grade === 10
        ? "th"
        : grade === 11
          ? "th"
          : grade === 12
            ? "th"
            : "th"
  return `${grade}${suffix} grade`
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

  const [trajectory, availability] = await Promise.all([
    computeStudentTrajectory(targetStudentId, { track }),
    listStudentAvailability(targetStudentId),
  ])

  // The course-request action needs a term_id. Pick the first
  // not-yet-ended term whose academic year matches the trajectory's
  // next-year window.
  const todayIso = new Date().toISOString().slice(0, 10)
  const terms = await listTerms()
  const nextTerm =
    terms
      .filter((t) => t.end_date >= todayIso)
      .find(
        (t) =>
          trajectory.next_academic_year_start === null ||
          t.academic_year.startsWith(
            String(trajectory.next_academic_year_start)
          )
      ) ??
    terms.find((t) => t.end_date >= todayIso) ??
    null

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

  // Year columns: from the earliest relevant grade through the
  // "next" grade. HBA is 9-12; clamp sensibly but follow the student
  // if they're outside that range.
  const currentGrade = trajectory.current_grade
  const nextGrade = trajectory.next_grade
  const spanStart = Math.min(9, currentGrade ?? 9)
  const spanEnd = nextGrade ?? Math.max(12, currentGrade ?? 12)
  const yearColumns: number[] = []
  for (let g = spanStart; g <= spanEnd; g++) yearColumns.push(g)
  // One trailing "later" column when the student isn't yet a senior —
  // previews the courses that unlock past next year.
  const showLaterColumn = nextGrade !== null && nextGrade < 12

  const requestableSubjects = trajectory.subjects.filter(
    (s) => s.entries.length > 0 || s.transfer_entries.length > 0
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          {previewing
            ? "Admin · building on behalf"
            : "Graduation trajectory"}
        </p>
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {studentName}&rsquo;s graduation map
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Each subject grows left-to-right, one node per school year.
          Solid nodes are courses {previewing ? "they've" : "you've"}{" "}
          taken or are taking — those years are locked. The highlighted
          column is next year: pick from the branches to add a course
          to {previewing ? "their" : "your"} request list. Faded nodes
          preview what unlocks down the line.
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
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Review &amp; submit my requests →
        </Link>
      </div>

      {raw.saved === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Added to your course requests for{" "}
          {nextTerm?.name ?? "the upcoming term"}. Keep building, then
          review &amp; submit when you&rsquo;re ready.
        </div>
      )}
      {raw.saved === "availability" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Availability saved.
        </div>
      )}

      <StudentAvailabilityCard
        studentId={targetStudentId}
        availability={availability}
        asAdmin={previewing}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
        <LegendChip className="border-emerald-300 bg-emerald-50" label="Completed" />
        <LegendChip className="border-sky-300 bg-sky-50" label="In progress" />
        <LegendChip
          className="border-brand-orange bg-brand-orange/10"
          label="Pick for next year"
        />
        <LegendChip
          className="border-slate-300 bg-slate-50 opacity-60"
          label="Unlocks later"
        />
      </div>

      {/* Subject trees */}
      <div className="space-y-5">
        {requestableSubjects.length === 0 && (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            No course data mapped to graduation subjects yet. Once the
            office tags the catalogue, your trajectory shows up here.
          </section>
        )}
        {requestableSubjects.map((subject) => (
          <SubjectTree
            key={subject.subject_area}
            subject={subject}
            track={track}
            yearColumns={yearColumns}
            currentGrade={currentGrade}
            nextGrade={nextGrade}
            showLaterColumn={showLaterColumn}
            studentId={targetStudentId!}
            nextTermId={nextTerm?.id ?? null}
            alreadyRequestedCourseIds={alreadyRequestedCourseIds}
            previewing={previewing}
          />
        ))}

        {trajectory.unmapped_courses.length > 0 && (
          <ElectivesShelf
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

function LegendChip({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full border ${className}`} />
      {label}
    </span>
  )
}

// ============================================================================
// Subject tree — one horizontal row, a node per school year
// ============================================================================

function SubjectTree({
  subject,
  track,
  yearColumns,
  currentGrade,
  nextGrade,
  showLaterColumn,
  studentId,
  nextTermId,
  alreadyRequestedCourseIds,
  previewing,
}: {
  subject: TrajectorySubjectSummary
  track: "basic" | "college_bound"
  yearColumns: number[]
  currentGrade: number | null
  nextGrade: number | null
  showLaterColumn: boolean
  studentId: string
  nextTermId: string | null
  alreadyRequestedCourseIds: Set<string>
  previewing: boolean
}) {
  const required =
    track === "basic"
      ? subject.required_credits_basic
      : subject.required_credits_college_bound
  const earned = subject.credits_completed + subject.credits_in_progress
  const progressPct =
    required && required > 0
      ? Math.min(100, Math.round((earned / required) * 100))
      : 0

  // Index completed / in-progress entries by the grade they were taken.
  const takenByGrade = new Map<number, TrajectoryEntry[]>()
  for (const e of subject.entries) {
    if (e.status !== "completed" && e.status !== "in_progress") continue
    const g = e.grade_when_taken
    if (g === null || g === undefined) continue
    const arr = takenByGrade.get(g) ?? []
    arr.push(e)
    takenByGrade.set(g, arr)
  }
  // Anything completed/in-progress without a resolvable grade — show
  // it in a catch-all so it isn't silently dropped.
  const undatedTaken = subject.entries.filter(
    (e) =>
      (e.status === "completed" || e.status === "in_progress") &&
      (e.grade_when_taken === null || e.grade_when_taken === undefined)
  )

  const eligibleEntries = subject.entries.filter((e) => e.status === "eligible")
  const lockedEntries = subject.entries.filter(
    (e) => e.status === "needs_prereq" || e.status === "grade_locked"
  )

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-extrabold text-brand-navy">
          {subjectAreaLabel(subject.subject_area)}
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            {subject.credits_completed.toFixed(1)} earned
            {subject.credits_in_progress > 0 && (
              <> · {subject.credits_in_progress.toFixed(1)} in progress</>
            )}
            {required !== null && (
              <> · {required.toFixed(0)} required</>
            )}
          </p>
          {required !== null && required > 0 && (
            <div className="w-28">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${
                    progressPct >= 100 ? "bg-emerald-500" : "bg-brand-orange"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* The tree: horizontally scrollable row of year columns */}
      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-0">
          {yearColumns.map((grade, idx) => {
            const phase: YearPhase =
              currentGrade !== null && grade < currentGrade
                ? "past"
                : currentGrade !== null && grade === currentGrade
                  ? "current"
                  : nextGrade !== null && grade === nextGrade
                    ? "next"
                    : "future"
            return (
              <YearColumn
                key={grade}
                grade={grade}
                phase={phase}
                isFirst={idx === 0}
                takenEntries={takenByGrade.get(grade) ?? []}
                eligibleEntries={phase === "next" ? eligibleEntries : []}
                studentId={studentId}
                nextTermId={nextTermId}
                alreadyRequestedCourseIds={alreadyRequestedCourseIds}
                previewing={previewing}
              />
            )
          })}

          {/* Trailing "unlocks later" column for non-seniors. */}
          {showLaterColumn && (
            <LaterColumn lockedEntries={lockedEntries} />
          )}
        </div>
      </div>

      {undatedTaken.length > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Also completed (year not recorded)
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {undatedTaken.map((e) => (
              <span
                key={e.course_id}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800"
              >
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {subject.transfer_entries.length > 0 && (
        <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Transfer credit
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {subject.transfer_entries.map((t) => (
              <span
                key={t.id}
                title={`${t.school_name}${
                  t.academic_year ? ` · ${t.academic_year}` : ""
                }`}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  t.counted
                    ? "border-indigo-200 bg-white text-indigo-800"
                    : "border-slate-200 bg-white text-slate-400 line-through"
                }`}
              >
                {t.title}
                {t.grade_letter ? ` · ${t.grade_letter}` : ""}
                {t.counted ? ` · ${t.credits.toFixed(1)} cr` : " · no credit"}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

type YearPhase = "past" | "current" | "next" | "future"

const PHASE_CONNECTOR = "h-px w-6 self-center bg-slate-200"

function YearColumn({
  grade,
  phase,
  isFirst,
  takenEntries,
  eligibleEntries,
  studentId,
  nextTermId,
  alreadyRequestedCourseIds,
  previewing,
}: {
  grade: number
  phase: YearPhase
  isFirst: boolean
  takenEntries: TrajectoryEntry[]
  eligibleEntries: TrajectoryEntry[]
  studentId: string
  nextTermId: string | null
  alreadyRequestedCourseIds: Set<string>
  previewing: boolean
}) {
  const isPick = phase === "next"
  return (
    <div className="flex items-stretch">
      {!isFirst && <div className={PHASE_CONNECTOR} />}
      <div
        className={`flex w-48 flex-col gap-2 rounded-2xl border px-3 py-3 ${
          isPick
            ? "border-brand-orange bg-brand-orange/5"
            : phase === "current"
              ? "border-sky-200 bg-sky-50/40"
              : "border-slate-200 bg-slate-50/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
            {gradeLabel(grade)}
          </p>
          {isPick && (
            <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              Pick
            </span>
          )}
          {phase === "current" && (
            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
              Now
            </span>
          )}
        </div>

        {/* Past / current: solid completed nodes */}
        {takenEntries.map((e) => (
          <CompletedNode key={e.course_id} entry={e} />
        ))}

        {/* Next year: branching eligible picks */}
        {isPick &&
          eligibleEntries.map((e) => (
            <EligibleBranch
              key={e.course_id}
              entry={e}
              studentId={studentId}
              nextTermId={nextTermId}
              alreadyRequested={alreadyRequestedCourseIds.has(e.course_id)}
              previewing={previewing}
            />
          ))}
        {isPick && eligibleEntries.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 px-2 py-3 text-center text-[11px] text-slate-400">
            Nothing eligible in this subject — your requirement may
            already be met, or talk to your advisor.
          </p>
        )}

        {/* Past / current with nothing recorded */}
        {!isPick && takenEntries.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-300">
            —
          </p>
        )}
      </div>
    </div>
  )
}

function LaterColumn({ lockedEntries }: { lockedEntries: TrajectoryEntry[] }) {
  return (
    <div className="flex items-stretch">
      <div className={PHASE_CONNECTOR} />
      <div className="flex w-48 flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3 opacity-70">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Unlocks later
        </p>
        {lockedEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400">
            Everything in this subject is already open to you.
          </p>
        ) : (
          lockedEntries.map((e) => <LockedNode key={e.course_id} entry={e} />)
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Node variants
// ============================================================================

function CourseTags({ entry }: { entry: TrajectoryEntry }) {
  return (
    <>
      {entry.is_ap && (
        <span className="rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-brand-orange">
          AP
        </span>
      )}
      {entry.is_honors && !entry.is_ap && (
        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-sky-700">
          Honors
        </span>
      )}
    </>
  )
}

function CompletedNode({ entry }: { entry: TrajectoryEntry }) {
  const inProgress = entry.status === "in_progress"
  return (
    <div
      className={`rounded-xl border px-2.5 py-2 ${
        inProgress
          ? "border-sky-300 bg-sky-50"
          : "border-emerald-300 bg-emerald-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1">
        <p className="text-xs font-semibold text-slate-900">{entry.name}</p>
        <CourseTags entry={entry} />
      </div>
      <p
        className={`mt-0.5 text-[10px] ${
          inProgress ? "text-sky-700" : "text-emerald-700"
        }`}
      >
        {inProgress ? (
          <>In progress{entry.in_progress_term_name ? ` · ${entry.in_progress_term_name}` : ""}</>
        ) : (
          <>
            Completed
            {entry.completed_grade_letter
              ? ` · grade ${entry.completed_grade_letter}`
              : ""}
          </>
        )}
      </p>
    </div>
  )
}

function LockedNode({ entry }: { entry: TrajectoryEntry }) {
  const missing = entry.missing_prereqs ?? []
  // Collapse OR-groups so "needs Precalc or Honors Precalc" shows once.
  const groups = new Map<string, string[]>()
  for (const m of missing) {
    const key = m.group_key ?? `_solo_${m.code}`
    const arr = groups.get(key) ?? []
    arr.push(m.name)
    groups.set(key, arr)
  }
  return (
    <div className="rounded-xl border border-slate-300 bg-white/70 px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <p className="text-xs font-semibold text-slate-600">{entry.name}</p>
        <CourseTags entry={entry} />
      </div>
      {entry.status === "needs_prereq" && groups.size > 0 ? (
        <p className="mt-0.5 text-[10px] text-slate-500">
          After:{" "}
          {[...groups.values()].map((opts) => opts.join(" or ")).join("; ")}
        </p>
      ) : entry.status === "grade_locked" ? (
        <p className="mt-0.5 text-[10px] text-slate-500">
          Opens in a later grade
        </p>
      ) : (
        <p className="mt-0.5 text-[10px] text-slate-500">Not yet eligible</p>
      )}
    </div>
  )
}

function EligibleBranch({
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
  return (
    <div className="rounded-xl border border-brand-navy/25 bg-white px-2.5 py-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-1">
        <p className="text-xs font-semibold text-slate-900">{entry.name}</p>
        <CourseTags entry={entry} />
        {entry.override_granted && (
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-violet-700">
            Override
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {entry.credit_hours.toFixed(1)} credit
        {entry.credit_hours === 1 ? "" : "s"}
        {entry.offered_pattern === "odd_start_year" && " · odd-year course"}
        {entry.offered_pattern === "even_start_year" && " · even-year course"}
      </p>

      {alreadyRequested ? (
        <p className="mt-1.5 text-[10px] font-semibold text-emerald-700">
          On {previewing ? "their" : "your"} list ✓
        </p>
      ) : nextTermId ? (
        <form
          action={addCourseRequestAction}
          className="mt-1.5 flex items-center gap-1"
        >
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="term_id" value={nextTermId} />
          <input type="hidden" name="course_id" value={entry.course_id} />
          <input type="hidden" name="redirect_to" value="trajectory" />
          {/* Admin building on a student's behalf — admin=1 lets the
              action accept the edit and bounce back to ?as= mode. */}
          {previewing && <input type="hidden" name="admin" value="1" />}
          <select
            name="kind"
            defaultValue="core"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-900"
          >
            {studentCourseRequestKindSchema.options.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel[kind]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-brand-navy px-2 py-1 text-[10px] font-semibold text-white transition hover:brightness-110"
          >
            Add
          </button>
        </form>
      ) : null}
    </div>
  )
}

// ============================================================================
// Electives shelf — courses not tied to a graduation subject
// ============================================================================

function ElectivesShelf({
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
  const eligible = entries.filter((e) => e.status === "eligible")
  const taken = entries.filter(
    (e) => e.status === "completed" || e.status === "in_progress"
  )
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-slate-50/60 px-6 py-5 shadow-sm">
      <h2 className="text-xl font-extrabold text-brand-navy">
        Other electives
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Courses not tied to a specific graduation requirement. Most
        students pick one or two.
      </p>

      {taken.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Taken
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {taken.map((e) => (
              <span
                key={e.course_id}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-800"
              >
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Eligible next year
        </p>
        {eligible.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">
            Nothing new to pick right now.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eligible.map((e) => (
              <EligibleBranch
                key={e.course_id}
                entry={e}
                studentId={studentId}
                nextTermId={nextTermId}
                alreadyRequested={alreadyRequestedCourseIds.has(e.course_id)}
                previewing={previewing}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
