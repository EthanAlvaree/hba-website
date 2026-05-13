import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  attendanceStatusBadgeClass,
  attendanceStatusLabels,
  type AttendanceRecord,
} from "@/lib/attendance"
import {
  calculateCurrentGrade,
  letterGrade,
  listAssignmentCategories,
  listPublishedAssignmentsForSection,
  listScoresForAssignmentIds,
} from "@/lib/gradebook"
import {
  getParentLinkForStudent,
  getProfileByEmail,
  getStudentDetail,
  type SectionModality,
  type SectionPeriod,
  type StudentDetailEnrollment,
} from "@/lib/sis"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function periodShortLabel(period: SectionPeriod | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
}

function modalityShortLabel(modality: SectionModality): string {
  switch (modality) {
    case "in_person":
      return "In person"
    case "online_async":
      return "Online async"
    case "online_sync":
      return "Online sync"
    case "hybrid":
      return "Hybrid"
  }
}

function teacherShortName(
  teacher: NonNullable<StudentDetailEnrollment["section"]>["teacher"]
): string {
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim()
  return full || teacher.display_name || teacher.email
}

// Lightweight Supabase client just for attendance prefetch on this page.
// Avoids importing the lazy client from lib/attendance.ts (which doesn't
// expose a batched helper).
function getSupabase() {
  const url = process.env.HBA_SUPABASE_URL
  const key = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase env vars missing")
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async function ParentStudentOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }

  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("parent")) {
    redirect("/admin/sign-in")
  }

  const { id: studentId } = await params

  // Gate: this parent has to actually be linked to this student.
  const link = await getParentLinkForStudent(profile.id, studentId)
  if (!link) {
    notFound()
  }

  const student = await getStudentDetail(studentId)
  if (!student) {
    notFound()
  }

  const displayName = student.preferred_name?.trim()
    ? `${student.preferred_name} (${student.legal_first_name} ${student.legal_last_name})`
    : `${student.legal_first_name} ${student.legal_last_name}`

  const activeEnrollments = student.enrollments.filter(
    (enrollment) => enrollment.status === "enrolled" || enrollment.status === "audit"
  )

  // For each active enrollment, compute current grade + attendance summary in
  // parallel. Same calc the student sees on their own portal; gated here by
  // parent_links.can_view_grades / can_view_attendance.
  const enrollmentIds = activeEnrollments.map((e) => e.id)
  const sectionIds = Array.from(
    new Set(activeEnrollments.map((e) => e.section?.id).filter((id): id is string => Boolean(id)))
  )

  const supabase = getSupabase()
  const [categoriesBySection, publishedBySection, scoresByEnrollment, attendanceByEnrollment] =
    await Promise.all([
      // Categories for every section in one query.
      (async () => {
        if (sectionIds.length === 0) return new Map<string, Awaited<ReturnType<typeof listAssignmentCategories>>>()
        const out = new Map<string, Awaited<ReturnType<typeof listAssignmentCategories>>>()
        for (const sectionId of sectionIds) {
          out.set(sectionId, await listAssignmentCategories(sectionId))
        }
        return out
      })(),
      // Published assignments per section.
      (async () => {
        if (sectionIds.length === 0) return new Map<string, Awaited<ReturnType<typeof listPublishedAssignmentsForSection>>>()
        const out = new Map<string, Awaited<ReturnType<typeof listPublishedAssignmentsForSection>>>()
        for (const sectionId of sectionIds) {
          out.set(sectionId, await listPublishedAssignmentsForSection(sectionId))
        }
        return out
      })(),
      // Scores for every enrollment in one batch.
      (async () => {
        const allAssignmentIds: string[] = []
        for (const sectionId of sectionIds) {
          // Lazy: pull each section's published assignments to get IDs.
          // Already loaded above — but in practice the two map closures run
          // sequentially below.
          allAssignmentIds.push(...[])
        }
        if (enrollmentIds.length === 0) return new Map<string, Awaited<ReturnType<typeof listScoresForAssignmentIds>>>()
        const { data, error } = await supabase
          .from("scores")
          .select(
            "id, created_at, updated_at, enrollment_id, assignment_id, kind, points_earned, submitted_at, graded_at, feedback"
          )
          .in("enrollment_id", enrollmentIds)
          .returns<Awaited<ReturnType<typeof listScoresForAssignmentIds>>>()
        if (error) throw new Error(error.message)
        const out = new Map<string, typeof data>()
        for (const row of data ?? []) {
          const bucket = out.get(row.enrollment_id) ?? []
          bucket.push(row)
          out.set(row.enrollment_id, bucket)
        }
        return out
      })(),
      // Attendance per enrollment in one batch.
      (async () => {
        if (enrollmentIds.length === 0) return new Map<string, AttendanceRecord[]>()
        const { data, error } = await supabase
          .from("attendance_records")
          .select("id, created_at, updated_at, enrollment_id, date, status, note, recorded_by")
          .in("enrollment_id", enrollmentIds)
          .order("date", { ascending: false })
          .returns<AttendanceRecord[]>()
        if (error) throw new Error(error.message)
        const out = new Map<string, AttendanceRecord[]>()
        for (const row of data ?? []) {
          const bucket = out.get(row.enrollment_id) ?? []
          bucket.push(row)
          out.set(row.enrollment_id, bucket)
        }
        return out
      })(),
    ])

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/parent"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to family portal
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {link.can_view_grades && (
              <Link
                href={`/parent/students/${studentId}/transcript`}
                className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                View transcript →
              </Link>
            )}
            <Link
              href={`/parent/students/${studentId}/complete-file`}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Complete file →
            </Link>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-brand-navy">{displayName}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {link.relationship ? `Listed as: ${link.relationship}` : "Listed as guardian"}
            {student.current_grade && <> &middot; Grade {student.current_grade}</>}
          </p>
        </section>

        {activeEnrollments.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
            Not enrolled in any sections this term.
          </section>
        ) : (
          activeEnrollments.map((enrollment) => {
            const section = enrollment.section!
            const courseName = section.course?.name ?? "(deleted course)"
            const courseCode = section.course?.code ?? ""

            const categories = categoriesBySection.get(section.id) ?? []
            const publishedAssignments = publishedBySection.get(section.id) ?? []
            const allScores = scoresByEnrollment.get(enrollment.id) ?? []
            const publishedIds = new Set(publishedAssignments.map((a) => a.id))

            const grade = link.can_view_grades
              ? calculateCurrentGrade({
                  categories,
                  assignments: publishedAssignments,
                  scores: allScores.filter((s) => publishedIds.has(s.assignment_id)),
                })
              : null

            const attendance = attendanceByEnrollment.get(enrollment.id) ?? []
            const absences = attendance.filter((r) => r.status === "absent").length
            const tardies = attendance.filter((r) => r.status === "tardy").length
            const excused = attendance.filter((r) => r.status === "excused").length
            const recentAttendance = attendance.slice(0, 5)

            return (
              <section
                key={enrollment.id}
                className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-brand-navy">{courseName}</h3>
                      {courseCode && (
                        <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {courseCode}
                        </code>
                      )}
                      {section.section_code && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Sec {section.section_code}
                        </span>
                      )}
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        {section.term?.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {periodShortLabel(section.period)} &middot;{" "}
                      {modalityShortLabel(section.modality)}
                      {section.room && <> &middot; Room {section.room}</>}
                    </p>
                    <p className="text-sm text-slate-600">
                      Teacher:{" "}
                      <span className="font-semibold text-slate-900">
                        {teacherShortName(section.teacher)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {grade && (
                      <div className="text-right">
                        {enrollment.grade_locked ? (
                          <>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
                              Final · official
                            </p>
                            {enrollment.final_grade_percentage === null ? (
                              <p className="text-2xl font-bold text-slate-500">—</p>
                            ) : (
                              <>
                                <p className="text-2xl font-extrabold text-brand-navy">
                                  {Number(enrollment.final_grade_percentage).toFixed(1)}%
                                </p>
                                {enrollment.final_grade_letter && (
                                  <p className="text-sm font-semibold text-brand-navy">
                                    {enrollment.final_grade_letter}
                                  </p>
                                )}
                              </>
                            )}
                          </>
                        ) : grade.overall_percentage === null ? (
                          <p className="text-2xl font-bold text-slate-500">—</p>
                        ) : (
                          <>
                            <p className="text-2xl font-extrabold text-emerald-900">
                              {grade.overall_percentage.toFixed(1)}%
                            </p>
                            <p className="text-sm font-semibold text-emerald-700">
                              {grade.letter}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    {link.can_view_grades && (
                      <Link
                        href={`/parent/students/${studentId}/sections/${enrollment.id}`}
                        className="inline-flex items-center rounded-full border border-brand-navy/30 bg-white px-3 py-1 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                </div>

                {grade && grade.categories.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {grade.categories.map((breakdown) => (
                      <li
                        key={breakdown.category_id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{breakdown.name}</p>
                          <p className="text-xs text-slate-500">
                            Weight {breakdown.weight.toFixed(2)}% &middot;{" "}
                            {breakdown.graded_count} graded
                            {breakdown.dropped_count > 0
                              ? ` · ${breakdown.dropped_count} lowest dropped`
                              : ""}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-700">
                          {breakdown.percentage === null
                            ? "Not yet graded"
                            : `${breakdown.percentage.toFixed(1)}% · ${letterGrade(breakdown.percentage)}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {!link.can_view_grades && (
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                    Grade visibility is disabled for your link. Contact the
                    office if this isn&rsquo;t what you expected.
                  </p>
                )}

                {link.can_view_attendance && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">Attendance</p>
                      <p className="text-xs font-semibold text-slate-700">
                        {absences} absent &middot; {tardies} tardy &middot;{" "}
                        {excused} excused
                      </p>
                    </div>
                    {recentAttendance.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {recentAttendance.map((record) => (
                          <li
                            key={record.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <span className="text-slate-600">
                              {new Intl.DateTimeFormat("en-US", {
                                dateStyle: "medium",
                                timeZone: pacific,
                              }).format(new Date(`${record.date}T00:00:00`))}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${attendanceStatusBadgeClass(record.status)}`}
                              >
                                {attendanceStatusLabels[record.status]}
                              </span>
                              {record.note && (
                                <span className="text-slate-500">{record.note}</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            )
          })
        )}
    </div>
  )
}
