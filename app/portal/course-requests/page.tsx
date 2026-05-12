import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  getProfileByEmail,
  getStudentByProfileId,
  listCourses,
  type CourseRecord,
} from "@/lib/sis"
import {
  listStudentCourseRequests,
  studentCourseRequestKindSchema,
  type StudentCourseRequestKind,
  type StudentCourseRequestWithCourse,
} from "@/lib/scheduler"
import { createClient } from "@supabase/supabase-js"
import {
  addCourseRequestAction,
  deleteCourseRequestAction,
  submitCourseRequestsAction,
} from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    term_id?: string
    saved?: string
    deleted?: string
    submitted?: string
  }>
}

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

type TermRow = {
  id: string
  name: string
  slug: string
  start_date: string
  end_date: string
  is_current: boolean
}

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

export default async function CourseRequestsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.email) redirect("/admin/sign-in")

  const profile = await getProfileByEmail(session.user.email)
  if (!profile) redirect("/admin/sign-in")
  if (!profile.roles.includes("student")) {
    if (profile.roles.includes("parent")) redirect("/parent")
    if (session.isAdmin) redirect("/admin/contact-submissions")
    redirect("/")
  }

  const student = await getStudentByProfileId(profile.id)
  if (!student) redirect("/")

  // Full-time only — summer/part-time students bypass this flow.
  if (student.enrollment_type !== "full_time") {
    redirect("/portal")
  }

  // Fetch upcoming (or current) terms. We use a thin direct query — the
  // existing helpers don't take time filters yet.
  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const todayIso = new Date().toISOString().slice(0, 10)
  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select("id, name, slug, start_date, end_date, is_current")
    .gte("end_date", todayIso)
    .order("start_date", { ascending: true })
    .returns<TermRow[]>()

  if (termsError) throw new Error(termsError.message)

  const upcomingTerms = terms ?? []
  if (upcomingTerms.length === 0) {
    return (
      <CourseRequestsLayout title="Course requests">
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No upcoming terms are open for course requests yet. Check back once
          the office sets up next year&rsquo;s terms.
        </section>
      </CourseRequestsLayout>
    )
  }

  const raw = await searchParams
  const targetTermId = raw.term_id && upcomingTerms.some((t) => t.id === raw.term_id)
    ? raw.term_id
    : upcomingTerms[0].id
  const targetTerm = upcomingTerms.find((t) => t.id === targetTermId)!

  const [requests, courses] = await Promise.all([
    listStudentCourseRequests({ student_id: student.id, term_id: targetTermId }),
    listCourses(),
  ])

  const activeCourses = courses.filter((c) => c.active)
  const requestedCourseIds = new Set(requests.map((r) => r.course_id))
  const requestableCourses = activeCourses.filter((c) => !requestedCourseIds.has(c.id))

  const coreCount = requests.filter((r) => r.kind === "core").length
  const electiveCount = requests.filter((r) => r.kind === "elective").length
  const alternateCount = requests.filter((r) => r.kind === "alternate").length
  const submittedAt = requests.find((r) => r.submitted_at)?.submitted_at ?? null

  return (
    <CourseRequestsLayout title="Course requests">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-2xl font-extrabold text-brand-navy">Course requests</h2>
        <p className="mt-2 text-sm text-slate-600">
          Tell us what you&rsquo;d like to take next term. Pick 6 core courses
          and 2 electives, plus a few alternates the scheduler can fall back
          to. You&rsquo;ll get your top-ranked picks when the schedule
          works out; alternates fill in when a section is full or
          can&rsquo;t be scheduled.
        </p>
      </section>

      {raw.saved === "1" && <Banner>Saved.</Banner>}
      {raw.deleted === "1" && <Banner>Removed.</Banner>}
      {raw.submitted === "1" && <Banner>Submitted to the office.</Banner>}

      {/* Term selector */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Term</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingTerms.map((term) => {
            const isActive = term.id === targetTermId
            return (
              <Link
                key={term.id}
                href={`/portal/course-requests?term_id=${term.id}`}
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
          {formatDate(targetTerm.start_date)} — {formatDate(targetTerm.end_date)}
        </p>
      </section>

      {/* Existing requests */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-brand-navy">
              Your requests for {targetTerm.name}
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
                <li key={`heading-${kind}`} className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {kindLabel[kind]}
                </li>,
                ...rows.map((r) => <RequestRow key={r.id} request={r} student_id={student.id} />),
              ]
            })}
          </ul>
        )}
      </section>

      {/* Add a request */}
      {requestableCourses.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Add a course</h3>
          <form action={addCourseRequestAction} className="mt-4 space-y-3">
            <input type="hidden" name="student_id" value={student.id} />
            <input type="hidden" name="term_id" value={targetTermId} />

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
                  placeholder="Why this course matters to you"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Add to my list
            </button>
          </form>
        </section>
      )}

      {/* Submit */}
      <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-emerald-900">Submit to the office</h3>
        <p className="mt-1 text-sm text-emerald-800">
          When your list is ready, submit so the scheduler can plan your
          term. You can keep editing afterward &mdash; re-submit if you make
          changes.
        </p>
        <form action={submitCourseRequestsAction} className="mt-3">
          <input type="hidden" name="student_id" value={student.id} />
          <input type="hidden" name="term_id" value={targetTermId} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Submit my requests
          </button>
        </form>
      </section>
    </CourseRequestsLayout>
  )
}

function CourseRequestsLayout({
  title: _title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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
  student_id,
}: {
  request: StudentCourseRequestWithCourse
  student_id: string
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
        <p className="text-xs text-slate-600">Rank {request.preference_rank}</p>
        <form action={deleteCourseRequestAction}>
          <input type="hidden" name="student_id" value={student_id} />
          <input type="hidden" name="term_id" value={request.term_id} />
          <input type="hidden" name="course_id" value={request.course_id} />
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
