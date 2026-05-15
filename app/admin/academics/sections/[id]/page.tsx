import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  calculateCurrentGrade,
  listAssignmentCategories,
  listAssignments,
  listScoresForAssignmentIds,
} from "@/lib/gradebook"
import {
  enrollmentStatusSchema,
  getCourseSectionById,
  listCourses,
  listEnrollmentsForSection,
  listFaculty,
  listStudents,
  listTerms,
  studentLabel,
  type EnrollmentRecord,
  type EnrollmentStatus,
} from "@/lib/sis"
import AcademicsHeader from "../../AcademicsHeader"
import {
  enrollStudentInSectionAction,
  lockSectionGradesAction,
  unlockSectionGradesAction,
  updateEnrollmentStatusAction,
  updateSectionAction,
} from "../../actions"
import SectionFormFields, { modalityLabel, periodLabel } from "../SectionFormFields"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

function statusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "Enrolled"
    case "dropped":
      return "Dropped"
    case "withdrawn":
      return "Withdrawn"
    case "completed":
      return "Completed"
    case "audit":
      return "Audit"
  }
}

function statusBadgeClass(status: EnrollmentStatus): string {
  switch (status) {
    case "enrolled":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "audit":
      return "border border-sky-200 bg-sky-50 text-sky-700"
    case "completed":
      return "border border-slate-200 bg-slate-100 text-slate-700"
    case "dropped":
    case "withdrawn":
      return "border border-rose-200 bg-rose-50 text-rose-700"
  }
}

function rosterName(enrollment: EnrollmentRecord): string {
  const student = enrollment.student
  if (!student) return "(unknown student)"
  const preferred = student.preferred_name?.trim()
  const legal = `${student.legal_first_name} ${student.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export default async function CourseSectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const { id } = await params

  const section = await getCourseSectionById(id)
  if (!section) {
    notFound()
  }

  const [enrollments, courses, terms, faculty, students, categories, assignments] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listCourses(),
    listTerms(),
    listFaculty(),
    listStudents(),
    listAssignmentCategories(section.id),
    listAssignments(section.id),
  ])

  // Fetch every score for the section in one batch (one round trip), then
  // compute each enrollment's current grade in memory. Admin sees grades
  // across ALL assignments (drafts included) since they manage gradebook
  // state. The student portal uses the same calc but filters to published.
  const allScores = await listScoresForAssignmentIds(assignments.map((a) => a.id))
  const scoresByEnrollment = new Map<string, typeof allScores>()
  for (const score of allScores) {
    const bucket = scoresByEnrollment.get(score.enrollment_id) ?? []
    bucket.push(score)
    scoresByEnrollment.set(score.enrollment_id, bucket)
  }
  const gradeByEnrollment = new Map<string, ReturnType<typeof calculateCurrentGrade>>()
  for (const enrollment of enrollments) {
    gradeByEnrollment.set(
      enrollment.id,
      calculateCurrentGrade({
        categories,
        assignments,
        scores: scoresByEnrollment.get(enrollment.id) ?? [],
      })
    )
  }

  const detailPath = `/admin/academics/sections/${section.id}`
  const activeCourses = courses.filter((course) => course.active || course.id === section.course_id)

  // Students already enrolled in this section shouldn't appear in the "add"
  // dropdown again. We still keep dropped/withdrawn students out of the picker
  // (admin can change their status from the roster row).
  const enrolledStudentIds = new Set(enrollments.map((e) => e.student?.id).filter(Boolean) as string[])
  const addableStudents = students.filter((student) => !enrolledStudentIds.has(student.id))

  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length
  const teacherName = (() => {
    const t = section.teacher
    if (!t) return "Unassigned"
    const full = [t.first_name, t.last_name].filter(Boolean).join(" ").trim()
    return full || t.display_name || t.email
  })()

  return (
    <div className="space-y-6">
        <AcademicsHeader active="sections" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/academics/sections"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to all sections
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/academics/sections/${section.id}/attendance`}
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy shadow-md transition hover:bg-brand-navy hover:text-white"
            >
              Take attendance →
            </Link>
            <Link
              href={`/admin/academics/sections/${section.id}/gradebook`}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Gradebook setup →
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-brand-navy">
                  {section.course.name}
                </h2>
                <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {section.course.code}
                </code>
                {section.section_code && (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                    Section {section.section_code}
                  </span>
                )}
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {section.term.name}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                {periodLabel(section.period)} &middot; {modalityLabel(section.modality)}
                {section.room && <> &middot; Room {section.room}</>}
                {typeof section.max_enrollment === "number" && (
                  <> &middot; Cap {section.max_enrollment}</>
                )}
              </p>
              <p className="text-sm text-slate-600">
                Teacher: <span className="font-semibold text-slate-800">{teacherName}</span>
              </p>
              <p className="text-sm text-slate-600">
                {enrolledCount} enrolled
                {typeof section.max_enrollment === "number" &&
                  ` of ${section.max_enrollment}`}
                {enrollments.length !== enrolledCount && (
                  <> &middot; {enrollments.length - enrolledCount} other status</>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Section properties</h3>
          <p className="mt-1 text-sm text-slate-600">
            Update the course, term, teacher, period, or any other section
            metadata.
          </p>
          <form action={updateSectionAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="redirectTo" value={detailPath} />
            <SectionFormFields
              courses={activeCourses}
              terms={terms}
              faculty={faculty}
              defaults={section}
            />
            <div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Save section
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Roster</h3>
          <p className="mt-1 text-sm text-slate-600">
            Students enrolled in this section. Status changes are local to this
            section &mdash; dropping a student here does not affect their other
            sections or their overall HBA status.
          </p>

          <div className="mt-6 space-y-3">
            {enrollments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
                No students enrolled yet.
              </div>
            ) : (
              enrollments.map((enrollment) => {
                const grade = gradeByEnrollment.get(enrollment.id)
                return (
                <div
                  key={enrollment.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {rosterName(enrollment)}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(enrollment.status)}`}
                      >
                        {statusLabel(enrollment.status)}
                      </span>
                      {grade?.overall_percentage !== null && grade?.overall_percentage !== undefined && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          {grade.overall_percentage.toFixed(1)}% · {grade.letter}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {enrollment.student?.profile?.email ?? "no profile email"}
                      {enrollment.student?.current_grade && (
                        <> &middot; Grade {enrollment.student.current_grade}</>
                      )}
                      {enrollment.dropped_at && (
                        <> &middot; Left {formatTimestamp(enrollment.dropped_at)}</>
                      )}
                    </p>
                    {(enrollment.final_grade_letter || enrollment.final_grade_percentage !== null) && (
                      <p className="text-xs font-semibold text-slate-700">
                        Locked final grade:{" "}
                        {enrollment.final_grade_letter ??
                          (typeof enrollment.final_grade_percentage === "number"
                            ? `${Number(enrollment.final_grade_percentage).toFixed(1)}%`
                            : "—")}
                      </p>
                    )}
                  </div>

                  <form
                    action={updateEnrollmentStatusAction}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="enrollment_id" value={enrollment.id} />
                    <input type="hidden" name="section_id" value={section.id} />
                    <input type="hidden" name="redirectTo" value={detailPath} />
                    <select
                      name="status"
                      defaultValue={enrollment.status}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      {enrollmentStatusSchema.options.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                    >
                      Update
                    </button>
                  </form>

                  <p className="text-xs text-slate-500 sm:text-right">
                    Enrolled {formatTimestamp(enrollment.enrolled_at)}
                  </p>
                </div>
                )
              })
            )}
          </div>
        </section>

        <FinalGradesCard section={section} enrollments={enrollments} />

        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-emerald-900">Add a student</h3>
          {addableStudents.length === 0 ? (
            <p className="mt-2 text-sm text-emerald-800">
              {students.length === 0
                ? "No active students yet. Students appear here after the office runs the Enroll workflow on an accepted application."
                : "All active students are already on this roster."}
            </p>
          ) : (
            <form
              action={enrollStudentInSectionAction}
              className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_auto]"
            >
              <input type="hidden" name="section_id" value={section.id} />
              <input type="hidden" name="redirectTo" value={detailPath} />
              <label className="space-y-2 text-sm font-medium text-emerald-900">
                <span className="block">Student</span>
                <select
                  name="student_id"
                  required
                  defaultValue=""
                  className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  <option value="">Pick a student…</option>
                  {addableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentLabel(student)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-emerald-900">
                <span className="block">Initial status</span>
                <select
                  name="status"
                  defaultValue="enrolled"
                  className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900"
                >
                  {enrollmentStatusSchema.options.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  Add to roster
                </button>
              </div>
            </form>
          )}
        </section>
    </div>
  )
}

function FinalGradesCard({
  section,
  enrollments,
}: {
  section: { id: string }
  enrollments: EnrollmentRecord[]
}) {
  const lockedCount = enrollments.filter((e) => e.grade_locked).length
  const detailPath = `/admin/academics/sections/${section.id}`
  const isFullyLocked = lockedCount > 0 && lockedCount === enrollments.length
  const isPartiallyLocked = lockedCount > 0 && !isFullyLocked

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <h3 className="text-lg font-extrabold text-brand-navy">Final grades</h3>
      <p className="mt-1 text-sm text-slate-600">
        Locking snapshots each enrollment&rsquo;s current calculated grade into
        the transcript. Subsequent edits to assignments or scores don&rsquo;t
        move the locked snapshot &mdash; unlock first if you need to recompute.
      </p>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {enrollments.length === 0
          ? "No enrollments to lock."
          : isFullyLocked
          ? `All ${enrollments.length} enrollments are locked.`
          : isPartiallyLocked
          ? `${lockedCount} of ${enrollments.length} enrollments are locked. Lock again to update the rest.`
          : `Unlocked — final grades are still calculating live from scores.`}
      </p>

      {enrollments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={lockSectionGradesAction}>
            <input type="hidden" name="section_id" value={section.id} />
            <input type="hidden" name="redirectTo" value={detailPath} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              {isFullyLocked ? "Re-lock (refresh snapshot)" : "Lock final grades"}
            </button>
          </form>

          {lockedCount > 0 && (
            <form action={unlockSectionGradesAction}>
              <input type="hidden" name="section_id" value={section.id} />
              <input type="hidden" name="redirectTo" value={detailPath} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Unlock all
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
