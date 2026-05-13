// Shared score-entry UI for /admin/.../grade/[assignmentId] and the
// faculty equivalent. The `surface` prop wires the "Back to gradebook"
// link and the form's hidden `surface` field so the action redirects
// back to the right tree.

import Link from "next/link"
import {
  scoreKindSchema,
  type AssignmentWithCategory,
  type ScoreKind,
  type ScoreRecord,
} from "@/lib/gradebook"
import type { CourseSectionRecord, EnrollmentRecord } from "@/lib/sis"
import { saveScoresAction } from "@/app/admin/academics/sections/[id]/gradebook/actions"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function formatTimestamp(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

const kindLabels: Record<ScoreKind, string> = {
  numeric: "Numeric",
  excused: "Excused",
  incomplete: "Incomplete",
  missing: "Missing (0)",
  not_counted: "Doesn't count",
}

function rosterName(enrollment: EnrollmentRecord): string {
  const student = enrollment.student
  if (!student) return "(unknown student)"
  const preferred = student.preferred_name?.trim()
  const legal = `${student.legal_first_name} ${student.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export type ScoreEntrySurface = "admin" | "faculty"

function sectionBasePath(surface: ScoreEntrySurface, sectionId: string): string {
  return surface === "faculty"
    ? `/faculty-portal/sections/${sectionId}`
    : `/admin/academics/sections/${sectionId}`
}

type Props = {
  section: CourseSectionRecord
  assignment: AssignmentWithCategory
  enrollments: EnrollmentRecord[]
  scores: ScoreRecord[]
  surface: ScoreEntrySurface
}

export function ScoreEntry({ section, assignment, enrollments, scores, surface }: Props) {
  const gradableEnrollments = enrollments.filter(
    (e) => e.status === "enrolled" || e.status === "audit"
  )

  const scoreByEnrollment = new Map<string, ScoreRecord>()
  for (const score of scores) {
    scoreByEnrollment.set(score.enrollment_id, score)
  }

  const gradedCount = gradableEnrollments.filter((e) =>
    scoreByEnrollment.has(e.id)
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${sectionBasePath(surface, section.id)}/gradebook`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to gradebook setup
        </Link>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.course.code} &middot; {section.term.name}
              {section.section_code ? ` · Section ${section.section_code}` : ""}
            </p>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              {assignment.title}
            </h2>
            <p className="text-sm text-slate-600">
              {assignment.category?.name ?? "(uncategorized)"} &middot;{" "}
              {Number(assignment.points_possible).toFixed(2)} pts
              {assignment.due_date && <> &middot; Due {formatDate(assignment.due_date)}</>}
              {assignment.is_published ? (
                <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Published
                </span>
              ) : (
                <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Draft
                </span>
              )}
              {assignment.is_extra_credit && (
                <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Extra credit
                </span>
              )}
            </p>
            {assignment.description && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {assignment.description}
              </p>
            )}
          </div>
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {gradedCount} of {gradableEnrollments.length} graded
          </p>
        </div>
      </section>

      {gradableEnrollments.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No active students on this section&rsquo;s roster. Enroll students
          from the section detail page before entering scores.
        </section>
      ) : (
        <form
          action={saveScoresAction}
          className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm space-y-4"
        >
          <input type="hidden" name="section_id" value={section.id} />
          <input type="hidden" name="assignment_id" value={assignment.id} />
          <input type="hidden" name="surface" value={surface} />

          <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,160px)_minmax(0,120px)_minmax(0,2fr)] items-end gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span>Student</span>
            <span>Score kind</span>
            <span>Points</span>
            <span>Feedback (optional)</span>
          </div>

          <ul className="space-y-3">
            {gradableEnrollments.map((enrollment) => {
              const existing = scoreByEnrollment.get(enrollment.id)
              return (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <input
                    type="hidden"
                    name="enrollment_id"
                    value={enrollment.id}
                  />
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,160px)_minmax(0,120px)_minmax(0,2fr)] lg:items-center">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {rosterName(enrollment)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {enrollment.student?.profile?.email ?? "—"}
                        {existing?.graded_at && (
                          <> &middot; Last graded {formatTimestamp(existing.graded_at)}</>
                        )}
                      </p>
                    </div>

                    <label className="block lg:hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Score kind
                    </label>
                    <select
                      name="kind"
                      defaultValue={existing?.kind ?? "numeric"}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {scoreKindSchema.options.map((kind) => (
                        <option key={kind} value={kind}>
                          {kindLabels[kind]}
                        </option>
                      ))}
                    </select>

                    <label className="block lg:hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Points
                    </label>
                    <input
                      name="points_earned"
                      type="number"
                      step="0.25"
                      min="0"
                      inputMode="decimal"
                      defaultValue={
                        existing?.points_earned !== null && existing?.points_earned !== undefined
                          ? Number(existing.points_earned).toString()
                          : ""
                      }
                      placeholder={`/ ${Number(assignment.points_possible).toFixed(0)}`}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />

                    <label className="block lg:hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Feedback (optional)
                    </label>
                    <input
                      name="feedback"
                      defaultValue={existing?.feedback ?? ""}
                      placeholder="Optional note for this student"
                      maxLength={4000}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">
              Empty rows (numeric kind with no points and no feedback) are
              skipped &mdash; saving doesn&rsquo;t create stale placeholder
              scores.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Save scores
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
