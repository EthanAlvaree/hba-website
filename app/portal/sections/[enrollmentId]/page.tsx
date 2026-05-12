import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  attendanceStatusBadgeClass,
  attendanceStatusLabels,
  listAttendanceForEnrollment,
  summarizeAttendance,
} from "@/lib/attendance"
import {
  calculateCurrentGrade,
  letterGrade,
  listAssignmentCategories,
  listPublishedAssignmentsForSection,
  listScoresForEnrollment,
  type AssignmentWithCategory,
  type ScoreKind,
  type ScoreRecord,
} from "@/lib/gradebook"
import {
  getProfileByEmail,
  getStudentByProfileId,
  getStudentDetail,
  type StudentDetailEnrollment,
} from "@/lib/sis"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function periodShortLabel(period: string | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

function teacherShortName(
  teacher: NonNullable<StudentDetailEnrollment["section"]>["teacher"]
): string {
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim()
  return full || teacher.display_name || teacher.email
}

function scoreCell(
  assignment: AssignmentWithCategory,
  score: ScoreRecord | undefined
): { label: string; sub: string | null } {
  if (!score) {
    return { label: "Not graded", sub: null }
  }
  switch (score.kind as ScoreKind) {
    case "numeric": {
      if (score.points_earned === null) {
        return { label: "Not graded", sub: null }
      }
      const pct = assignment.points_possible
        ? (Number(score.points_earned) / Number(assignment.points_possible)) * 100
        : null
      return {
        label: `${Number(score.points_earned).toFixed(2)} / ${Number(assignment.points_possible).toFixed(2)}`,
        sub: pct !== null ? `${pct.toFixed(1)}%` : null,
      }
    }
    case "excused":
      return { label: "Excused", sub: "Doesn't count" }
    case "incomplete":
      return { label: "Incomplete", sub: "Awaiting grading" }
    case "missing":
      return { label: "Missing", sub: "Counts as 0" }
    case "not_counted":
      return { label: "Not counted", sub: null }
  }
}

export default async function StudentPortalSectionPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("student")) {
    redirect("/portal")
  }

  const studentStub = await getStudentByProfileId(profile.id)
  if (!studentStub) {
    redirect("/")
  }

  const student = await getStudentDetail(studentStub.id)
  if (!student) {
    redirect("/")
  }

  const { enrollmentId } = await params

  const enrollment = student.enrollments.find((e) => e.id === enrollmentId)
  if (!enrollment || !enrollment.section) {
    // Either bogus ID or someone else's enrollment. Send them home without
    // leaking which is which.
    notFound()
  }

  const section = enrollment.section

  const [categories, publishedAssignments, scores, attendance] = await Promise.all([
    listAssignmentCategories(section.id),
    listPublishedAssignmentsForSection(section.id),
    listScoresForEnrollment(enrollment.id),
    listAttendanceForEnrollment(enrollment.id),
  ])

  const attendanceSummary = summarizeAttendance(attendance)
  const recentAttendance = attendance.slice(0, 10)

  const scoreByAssignment = new Map<string, ScoreRecord>()
  for (const score of scores) {
    scoreByAssignment.set(score.assignment_id, score)
  }

  const totalWeight = categories.reduce((sum, category) => sum + Number(category.weight), 0)
  const gradedCount = publishedAssignments.filter((assignment) => {
    const score = scoreByAssignment.get(assignment.id)
    if (!score) return false
    if (score.kind === "numeric" && score.points_earned === null) return false
    return true
  }).length

  // Grade calculation runs over published assignments only — drafts the
  // teacher hasn't released shouldn't influence what the student sees.
  const publishedScoreIds = new Set(publishedAssignments.map((a) => a.id))
  const grade = calculateCurrentGrade({
    categories,
    assignments: publishedAssignments,
    scores: scores.filter((s) => publishedScoreIds.has(s.assignment_id)),
  })

  return (
    <div className="space-y-6">
        <div>
          <Link
            href="/portal"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to portal
          </Link>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.course?.code} &middot; {section.term?.name}
              {section.section_code ? ` · Section ${section.section_code}` : ""}
            </p>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              {section.course?.name ?? "(deleted course)"}
            </h2>
            <p className="text-sm text-slate-600">
              {periodShortLabel(section.period)}
              {section.room && <> &middot; Room {section.room}</>}
            </p>
            <p className="text-sm text-slate-600">
              Teacher:{" "}
              <span className="font-semibold text-slate-900">{teacherShortName(section.teacher)}</span>
            </p>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-emerald-900">
                  Current grade
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Weighted average of what&rsquo;s been graded so far. Updates
                  as new assignments are scored.
                </p>
              </div>
              <div className="text-right">
                {grade.overall_percentage === null ? (
                  <p className="text-2xl font-extrabold text-emerald-900">—</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold text-emerald-900">
                      {grade.overall_percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm font-semibold text-emerald-800">
                      {grade.letter}
                    </p>
                  </>
                )}
              </div>
            </div>

            {grade.overall_percentage === null && (
              <p className="mt-3 text-xs text-emerald-800">
                Nothing has been graded yet in this section. Your grade will
                appear once your teacher posts scores.
              </p>
            )}

            <ul className="mt-4 space-y-2">
              {grade.categories.map((breakdown) => (
                <li
                  key={breakdown.category_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{breakdown.name}</p>
                    <p className="text-xs text-slate-500">
                      Weight {breakdown.weight.toFixed(2)}%
                      {breakdown.dropped_count > 0
                        ? ` · ${breakdown.dropped_count} lowest dropped`
                        : ""}{" "}
                      &middot;{" "}
                      {breakdown.graded_count} graded
                    </p>
                  </div>
                  <p className="font-semibold text-slate-700">
                    {breakdown.percentage === null
                      ? "Nothing graded yet"
                      : `${breakdown.percentage.toFixed(1)}% · ${letterGrade(breakdown.percentage)}`}
                  </p>
                </li>
              ))}
            </ul>

            {Math.abs(totalWeight - 100) > 0.01 && (
              <p className="mt-3 text-xs text-amber-800">
                Heads up: category weights total {totalWeight.toFixed(2)}%, not
                100. The office is aware. The current grade renormalizes
                automatically across the graded categories.
              </p>
            )}
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Assignments</h3>
              <p className="mt-1 text-sm text-slate-600">
                Only published assignments are shown. Drafts your teacher
                hasn&rsquo;t posted yet stay hidden.
              </p>
            </div>
            <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {gradedCount} of {publishedAssignments.length} graded
            </p>
          </div>

          {publishedAssignments.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">
              No published assignments yet.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {publishedAssignments.map((assignment) => {
                const cell = scoreCell(assignment, scoreByAssignment.get(assignment.id))
                const score = scoreByAssignment.get(assignment.id)
                return (
                  <li
                    key={assignment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-900">
                            {assignment.title}
                          </p>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            {assignment.category?.name ?? "(uncategorized)"}
                          </span>
                          {assignment.is_extra_credit && (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                              Extra credit
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {assignment.due_date
                            ? `Due ${formatDate(assignment.due_date)}`
                            : "No due date"}{" "}
                          &middot; {Number(assignment.points_possible).toFixed(2)} pts possible
                        </p>
                        {score?.feedback && (
                          <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 whitespace-pre-wrap">
                            <strong className="font-semibold">Feedback:</strong>{" "}
                            {score.feedback}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900">{cell.label}</p>
                        {cell.sub && (
                          <p className="text-xs text-slate-500">{cell.sub}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center justify-self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] sm:justify-self-end ${
                          score
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {score ? "Graded" : "Pending"}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-lg font-extrabold text-brand-navy">Attendance</h3>
            <p className="text-xs font-semibold text-slate-700">
              {attendanceSummary.absent} absences &middot;{" "}
              {attendanceSummary.tardy} tardies &middot;{" "}
              {attendanceSummary.excused} excused
            </p>
          </div>

          {attendance.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No attendance records on file for this section yet. By default,
              you&rsquo;re assumed present unless your teacher marks an
              exception.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {recentAttendance.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                  >
                    <p className="font-semibold text-slate-900">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeZone: pacific,
                      }).format(new Date(`${record.date}T00:00:00`))}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${attendanceStatusBadgeClass(record.status)}`}
                      >
                        {attendanceStatusLabels[record.status]}
                      </span>
                      {record.note && (
                        <span className="text-xs text-slate-600">{record.note}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {attendance.length > recentAttendance.length && (
                <p className="mt-3 text-xs text-slate-500">
                  Showing the {recentAttendance.length} most recent of{" "}
                  {attendance.length} exceptions on file.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-sm text-slate-600">
            This is a <strong>provisional</strong> current grade. Your final
            grade is locked in when your teacher closes the term. Late work and
            extra credit posted between now and then can still change the
            number.
          </p>
        </section>
    </div>
  )
}
