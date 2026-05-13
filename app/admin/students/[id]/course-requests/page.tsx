// Admin-side course-requests editor for a single student.
//
// Mirrors /portal/course-requests but lets an admin pick on behalf
// of any student. Useful when a student can't navigate the portal
// (younger kids), is offline, or simply asked the office to do it.
//
// Hits the same server actions in app/portal/course-requests/actions.ts;
// the actions honor a hidden admin=1 flag to redirect back here and
// audit-log each edit.

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getStudentDetail,
  listCourses,
  listTerms,
  type CourseRecord,
} from "@/lib/sis"
import {
  listStudentCourseRequests,
  studentCourseRequestKindSchema,
  type StudentCourseRequestKind,
  type StudentCourseRequestWithCourse,
} from "@/lib/scheduler"
import {
  addCourseRequestAction,
  deleteCourseRequestAction,
  submitCourseRequestsAction,
} from "@/app/portal/course-requests/actions"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    term_id?: string
    saved?: string
    deleted?: string
    submitted?: string
  }>
}

const pacific = "America/Los_Angeles"

const kindLabel: Record<StudentCourseRequestKind, string> = {
  core: "Core (1 of 6)",
  elective: "Elective (1 of 2)",
  alternate: "Alternate (backup)",
}

const kindBadgeClass: Record<StudentCourseRequestKind, string> = {
  core: "border border-brand-navy/30 bg-brand-navy/5 text-brand-navy",
  elective: "border border-sky-200 bg-sky-50 text-sky-700",
  alternate: "border border-slate-200 bg-slate-50 text-slate-700",
}

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

export default async function AdminStudentCourseRequestsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const { id: studentId } = await params
  const raw = await searchParams

  const student = await getStudentDetail(studentId)
  if (!student) notFound()

  const studentName =
    student.preferred_name?.trim() ||
    `${student.legal_first_name} ${student.legal_last_name}`

  // Show every term not yet ended; admins occasionally need to backfill
  // requests for a term that has already started.
  const todayIso = new Date().toISOString().slice(0, 10)
  const allTerms = await listTerms()
  const upcomingTerms = allTerms
    .filter((t) => t.end_date >= todayIso)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  if (upcomingTerms.length === 0) {
    return (
      <Layout studentId={studentId} studentName={studentName}>
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No upcoming or current terms exist. Create one on the{" "}
          <Link className="underline" href="/admin/academics/terms">
            Terms tab
          </Link>{" "}
          first.
        </section>
      </Layout>
    )
  }

  const targetTermId =
    (raw.term_id && upcomingTerms.find((t) => t.id === raw.term_id)?.id) ??
    upcomingTerms[0].id
  const targetTerm = upcomingTerms.find((t) => t.id === targetTermId)!

  const [requests, courses] = await Promise.all([
    listStudentCourseRequests({
      student_id: studentId,
      term_id: targetTermId,
    }),
    listCourses(),
  ])

  const activeCourses = courses.filter((c) => c.active)
  const requestedCourseIds = new Set(requests.map((r) => r.course_id))
  const requestableCourses = activeCourses.filter(
    (c) => !requestedCourseIds.has(c.id)
  )

  const coreCount = requests.filter((r) => r.kind === "core").length
  const electiveCount = requests.filter((r) => r.kind === "elective").length
  const alternateCount = requests.filter((r) => r.kind === "alternate").length
  const submittedAt = requests.find((r) => r.submitted_at)?.submitted_at ?? null

  return (
    <Layout studentId={studentId} studentName={studentName}>
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-navy">
              Course requests
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick courses on this student&rsquo;s behalf. Same form they see
              in <code>/portal/course-requests</code>; edits here are
              audit-logged. Submitting marks the list as ready for the
              scheduler (you can re-submit after changes).
            </p>
          </div>
          <Link
            href={`/portal/trajectory?as=${studentId}`}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            View their trajectory →
          </Link>
        </div>
      </section>

      {raw.saved === "1" && <Banner>Saved.</Banner>}
      {raw.deleted === "1" && <Banner>Removed.</Banner>}
      {raw.submitted === "1" && <Banner>Submitted on their behalf.</Banner>}

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Term</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingTerms.map((term) => {
            const isActive = term.id === targetTermId
            return (
              <Link
                key={term.id}
                href={`/admin/students/${studentId}/course-requests?term_id=${term.id}`}
                className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {term.name}
                {term.is_current && (
                  <span className="ml-2 text-xs opacity-70">(current)</span>
                )}
              </Link>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {formatDate(targetTerm.start_date)} —{" "}
          {formatDate(targetTerm.end_date)}
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-brand-navy">
              Requests for {targetTerm.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {coreCount} core &middot; {electiveCount} elective &middot;{" "}
              {alternateCount} alternate
              {submittedAt && (
                <>
                  {" "}&middot; Submitted{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: pacific,
                  }).format(new Date(submittedAt))}
                </>
              )}
            </p>
          </div>
        </div>

        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {(["core", "elective", "alternate"] as const).flatMap((kind) => {
              const rows = requests.filter((r) => r.kind === kind)
              if (rows.length === 0) return []
              return [
                <li
                  key={`heading-${kind}`}
                  className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {kindLabel[kind]}
                </li>,
                ...rows.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    studentId={studentId}
                  />
                )),
              ]
            })}
          </ul>
        )}
      </section>

      {requestableCourses.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Add a course
          </h3>
          <form action={addCourseRequestAction} className="mt-4 space-y-3">
            <input type="hidden" name="student_id" value={studentId} />
            <input type="hidden" name="term_id" value={targetTermId} />
            <input type="hidden" name="admin" value="1" />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span className="block">Course</span>
                <select
                  name="course_id"
                  required
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Pick a course…</option>
                  {requestableCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span className="block">Kind</span>
                <select
                  name="kind"
                  defaultValue="core"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {studentCourseRequestKindSchema.options.map((kind) => (
                    <option key={kind} value={kind}>
                      {kindLabel[kind]}
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

              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span className="block">Notes (optional)</span>
                <input
                  name="notes"
                  maxLength={2000}
                  placeholder="Why this course matters"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Add to their list
            </button>
          </form>
        </section>
      )}

      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-emerald-900">
          Submit on behalf
        </h3>
        <p className="mt-1 text-sm text-emerald-800">
          Marks the list as ready for the scheduler. Admin submits skip
          the office-notification email (you already know it landed).
          Re-submitting after edits is fine — the timestamp updates.
        </p>
        <form action={submitCourseRequestsAction} className="mt-3">
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="term_id" value={targetTermId} />
          <input type="hidden" name="admin" value="1" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Submit their requests
          </button>
        </form>
      </section>
    </Layout>
  )
}

function Layout({
  studentId,
  studentName,
  children,
}: {
  studentId: string
  studentName: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/students/${studentId}`}
          className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to student profile
        </Link>
      </div>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Admin · Course requests
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-brand-navy">
          {studentName}
        </h1>
      </header>
      {children}
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      {children}
    </div>
  )
}

function RequestRow({
  request,
  studentId,
}: {
  request: StudentCourseRequestWithCourse
  studentId: string
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {request.course?.name ?? "(deleted course)"}
            </p>
            {request.course?.code && (
              <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                {request.course.code}
              </code>
            )}
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${kindBadgeClass[request.kind]}`}
            >
              {kindLabel[request.kind]}
            </span>
          </div>
          {request.notes && (
            <p className="text-xs text-slate-500">{request.notes}</p>
          )}
        </div>
        <p className="text-xs text-slate-600">
          Rank {request.preference_rank}
        </p>
        <form action={deleteCourseRequestAction}>
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="term_id" value={request.term_id} />
          <input type="hidden" name="course_id" value={request.course_id} />
          <input type="hidden" name="admin" value="1" />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Remove
          </button>
        </form>
      </div>
    </li>
  )
}
