import Link from "next/link"
import { notFound } from "next/navigation"
import { assertCanEditSection } from "@/lib/section-auth"
import {
  calculateCurrentGrade,
  listAssignmentCategories,
  listAssignments,
  listScoresForAssignmentIds,
} from "@/lib/gradebook"
import {
  listEnrollmentsForSection,
  type EnrollmentRecord,
  type EnrollmentStatus,
} from "@/lib/sis"
import { modalityLabel, periodLabel } from "@/app/admin/academics/sections/SectionFormFields"

export const dynamic = "force-dynamic"

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

function rosterName(enrollment: EnrollmentRecord): string {
  const student = enrollment.student
  if (!student) return "(unknown student)"
  const preferred = student.preferred_name?.trim()
  const legal = `${student.legal_first_name} ${student.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export default async function FacultySectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { section, isAdmin } = await assertCanEditSection(id)
  if (!section) notFound()

  const [enrollments, categories, assignments] = await Promise.all([
    listEnrollmentsForSection(section.id),
    listAssignmentCategories(section.id),
    listAssignments(section.id),
  ])

  // Compute current grade per enrollment using only published assignments.
  // Faculty sees what a student would see — drafts in the gradebook
  // contribute nothing until published.
  const publishedAssignments = assignments.filter((a) => a.is_published)
  const allScores = await listScoresForAssignmentIds(publishedAssignments.map((a) => a.id))
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
        assignments: publishedAssignments,
        scores: scoresByEnrollment.get(enrollment.id) ?? [],
      })
    )
  }

  const enrolledCount = enrollments.filter((e) => e.status === "enrolled").length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/faculty-portal"
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to my sections
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/faculty-portal/sections/${section.id}/gradebook`}
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Gradebook setup →
          </Link>
          {isAdmin && (
            <Link
              href={`/admin/academics/sections/${section.id}`}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Admin view
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-brand-navy">
              {section.course.name}
            </h1>
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
          </p>
          <p className="text-sm text-slate-600">
            {enrolledCount} enrolled
            {typeof section.max_enrollment === "number" &&
              ` of ${section.max_enrollment}`}
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-extrabold text-brand-navy">Roster</h2>
          <p className="text-xs text-slate-500">
            Current grades use only published assignments. Drafts don&rsquo;t
            count yet.
          </p>
        </div>

        {enrollments.length === 0 ? (
          <p className="mt-6 text-sm text-slate-600">
            No students enrolled in this section yet. An admin assigns
            students from the schedule, or you can ask the office to add one.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {enrollments.map((enrollment) => {
              const grade = gradeByEnrollment.get(enrollment.id)
              const pct =
                grade && grade.overall_percentage !== null
                  ? `${grade.overall_percentage.toFixed(1)}%`
                  : "—"
              const letter = grade?.letter ?? null
              return (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">
                          {rosterName(enrollment)}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(enrollment.status)}`}
                        >
                          {statusLabel(enrollment.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {enrollment.student?.profile?.email ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      Grade: {pct} {letter && <span className="text-slate-500">({letter})</span>}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {grade?.categories.reduce((sum, c) => sum + c.graded_count, 0) ?? 0} graded
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Attendance entry is in the admin dashboard for now &mdash; we&rsquo;ll
          add a teacher-scoped attendance page in a follow-up. Ping the office
          if you need today&rsquo;s attendance recorded.
        </p>
      </section>
    </div>
  )
}
