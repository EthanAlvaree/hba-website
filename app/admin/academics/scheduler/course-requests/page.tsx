// Admin overview of student course requests, by term.
//
// Until now the only place these existed was in the student portal and
// the scheduler solver — the office had no way to peek at who's
// submitted, who hasn't, or what they asked for. This page closes
// that loop: pick a term, see every full-time active student and
// their request state, drill into one to see the exact list.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listTerms } from "@/lib/sis"
import type { StudentCourseRequestKind } from "@/lib/scheduler"
import { getServiceSupabase } from "@/lib/supabase-server"
import AcademicsHeader from "../../AcademicsHeader"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ term_id?: string; student_id?: string }>
}

const kindLabel: Record<StudentCourseRequestKind, string> = {
  core: "Core",
  elective: "Elective",
  alternate: "Alternate",
}

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

export default async function AdminCourseRequestsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const terms = await listTerms()
  if (terms.length === 0) {
    return (
      <Layout title="Course requests">
        <p className="text-sm text-slate-600">
          No terms exist yet. Create one on the{" "}
          <Link className="underline" href="/admin/academics/terms">
            Terms tab
          </Link>{" "}
          first.
        </p>
      </Layout>
    )
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  // Default to the current term, then any term that hasn't ended yet,
  // falling back to the most recent term so the page always renders.
  const defaultTerm =
    terms.find((t) => t.is_current) ??
    terms.find((t) => t.end_date >= todayIso) ??
    terms[terms.length - 1]
  const targetTermId =
    (raw.term_id && terms.find((t) => t.id === raw.term_id)?.id) ?? defaultTerm.id
  const targetTerm = terms.find((t) => t.id === targetTermId)!

  const supabase = getServiceSupabase()

  // All full-time active students. We need the full population — both
  // those who submitted and those who haven't — so the office can
  // chase the stragglers.
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(
      "id, legal_first_name, legal_last_name, preferred_name, current_grade, profile:profiles(email)"
    )
    .eq("status", "active")
    .eq("enrollment_type", "full_time")
    .order("legal_last_name", { ascending: true })
    .returns<
      Array<{
        id: string
        legal_first_name: string
        legal_last_name: string
        preferred_name: string | null
        current_grade: string | null
        profile: { email: string } | null
      }>
    >()
  if (studentsError) throw new Error(studentsError.message)

  // Every course request for this term, joined to course metadata.
  const { data: requests, error: reqError } = await supabase
    .from("student_course_requests")
    .select(
      `id, student_id, course_id, kind, preference_rank, notes, submitted_at,
       course:courses(code, name)`
    )
    .eq("term_id", targetTermId)
    .order("preference_rank", { ascending: true })
    .returns<
      Array<{
        id: string
        student_id: string
        course_id: string
        kind: StudentCourseRequestKind
        preference_rank: number
        notes: string | null
        submitted_at: string | null
        course: { code: string; name: string } | null
      }>
    >()
  if (reqError) throw new Error(reqError.message)

  // Bucket requests by student so per-row totals are O(1).
  const byStudent = new Map<string, typeof requests>()
  for (const r of requests ?? []) {
    const arr = byStudent.get(r.student_id) ?? []
    arr.push(r)
    byStudent.set(r.student_id, arr)
  }

  const summaries = (students ?? []).map((s) => {
    const rows = byStudent.get(s.id) ?? []
    const submittedAt = rows.find((r) => r.submitted_at)?.submitted_at ?? null
    return {
      student: s,
      total: rows.length,
      core: rows.filter((r) => r.kind === "core").length,
      elective: rows.filter((r) => r.kind === "elective").length,
      alternate: rows.filter((r) => r.kind === "alternate").length,
      submittedAt,
      rows,
    }
  })

  const submitted = summaries.filter((s) => s.submittedAt).length
  const inProgress = summaries.filter((s) => !s.submittedAt && s.total > 0).length
  const notStarted = summaries.filter((s) => s.total === 0).length

  const focusedStudent = raw.student_id
    ? summaries.find((s) => s.student.id === raw.student_id) ?? null
    : null

  return (
    <Layout title="Course requests">
      {/* Term selector */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <p className="text-sm font-semibold text-brand-navy">Term</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {terms.map((term) => {
            const isActive = term.id === targetTermId
            return (
              <Link
                key={term.id}
                href={`/admin/academics/scheduler/course-requests?term_id=${term.id}`}
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
      </section>

      {/* Summary */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Submitted" value={submitted} tone="emerald" />
        <Stat label="In progress" value={inProgress} tone="amber" />
        <Stat label="Not started" value={notStarted} tone="rose" />
      </section>

      {/* Student list */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-brand-navy">
          {targetTerm.name} — full-time students
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Every active full-time student. Click into a name to see the
          exact list of courses they&rsquo;ve requested.
        </p>
        {summaries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No active full-time students.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {summaries.map((s) => {
              const isFocused = focusedStudent?.student.id === s.student.id
              const name =
                s.student.preferred_name?.trim() ||
                `${s.student.legal_first_name} ${s.student.legal_last_name}`
              return (
                <li key={s.student.id} className="py-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {name}{" "}
                        <span className="font-normal text-slate-500">
                          · grade {s.student.current_grade ?? "—"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.student.profile?.email ?? "(no profile)"}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {s.core} core · {s.elective} elective · {s.alternate} alt
                      {s.submittedAt && (
                        <> · <span className="text-emerald-700">Submitted {formatTimestamp(s.submittedAt)}</span></>
                      )}
                      {!s.submittedAt && s.total > 0 && (
                        <> · <span className="text-amber-800">In progress</span></>
                      )}
                      {s.total === 0 && (
                        <> · <span className="text-rose-700">Not started</span></>
                      )}
                    </p>
                    <Link
                      href={`/admin/academics/scheduler/course-requests?term_id=${targetTermId}&student_id=${s.student.id}#focus`}
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isFocused
                          ? "border-brand-navy bg-brand-navy text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {isFocused ? "Showing below" : "View list"}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Per-student detail */}
      {focusedStudent && (
        <section
          id="focus"
          className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">
                {focusedStudent.student.preferred_name?.trim() ||
                  `${focusedStudent.student.legal_first_name} ${focusedStudent.student.legal_last_name}`}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {focusedStudent.submittedAt
                  ? `Submitted ${formatTimestamp(focusedStudent.submittedAt)}`
                  : focusedStudent.total > 0
                    ? "In progress — student hasn't submitted yet"
                    : "Hasn't started a list"}
              </p>
            </div>
            <Link
              href={`/admin/academics/scheduler/course-requests?term_id=${targetTermId}`}
              className="text-xs font-semibold text-slate-600 underline-offset-4 hover:underline"
            >
              Clear focus
            </Link>
          </div>

          {focusedStudent.rows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No requests yet for this term.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(["core", "elective", "alternate"] as const).flatMap((kind) => {
                const rows = focusedStudent.rows.filter((r) => r.kind === kind)
                if (rows.length === 0) return []
                return [
                  <li
                    key={`heading-${kind}`}
                    className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    {kindLabel[kind]}
                  </li>,
                  ...rows.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {r.course?.name ?? "(deleted course)"}
                        </p>
                        {r.course?.code && (
                          <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {r.course.code}
                          </code>
                        )}
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          Rank {r.preference_rank}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="mt-1 text-xs text-slate-600">{r.notes}</p>
                      )}
                    </li>
                  )),
                ]
              })}
            </ul>
          )}
        </section>
      )}
    </Layout>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "emerald" | "amber" | "rose"
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-rose-200 bg-rose-50 text-rose-900"
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm ${toneClass}`}>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]">
        {label}
      </p>
    </div>
  )
}

function Layout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <AcademicsHeader active="scheduler" />
      <header className="space-y-1">
        <Link
          href="/admin/academics/scheduler"
          className="text-xs font-semibold text-brand-navy underline-offset-4 hover:underline"
        >
          ← Back to scheduler
        </Link>
        <h1 className="text-3xl font-extrabold text-brand-navy">{title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          What students have asked to take next term. Use this to chase
          stragglers before kicking off the solver — every unsubmitted
          full-time student is a hole in the schedule.
        </p>
      </header>
      {children}
    </div>
  )
}
