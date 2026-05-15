// What-if explorer — generate a schedule draft with constraints
// loosened, to see how much a single bottleneck is costing.
//
// "What if Tricia could teach 1st period?" "What if we let teachers
// pick up an extra section?" The explorer runs the real solver with
// per-run overrides — the underlying availability + workload data is
// never touched. The result is a normal draft, tagged with a note
// describing exactly what was loosened, so it shows up in the draft
// list + compare view alongside the baseline.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listTerms } from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"
import AcademicsHeader from "../../AcademicsHeader"
import { generateWhatIfDraftAction } from "../actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ term_id?: string; solver_error?: string }>
}

export default async function WhatIfPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const supabase = getServiceSupabase()

  const [terms, teacherConstraints, studentConstraints] = await Promise.all([
    listTerms(),
    // Teachers who have at least one explicit "unavailable" period.
    // Only these are worth offering in the ignore-list — everyone
    // else has nothing to loosen.
    supabase
      .from("teacher_availability")
      .select(
        "profile_id, period, profile:profiles(first_name, last_name, display_name, email)"
      )
      .eq("available", false)
      .returns<
        Array<{
          profile_id: string
          period: string
          profile: {
            first_name: string | null
            last_name: string | null
            display_name: string | null
            email: string
          } | null
        }>
      >(),
    supabase
      .from("student_availability")
      .select(
        "student_id, period, student:students(legal_first_name, legal_last_name, preferred_name)"
      )
      .eq("available", false)
      .returns<
        Array<{
          student_id: string
          period: string
          student: {
            legal_first_name: string
            legal_last_name: string
            preferred_name: string | null
          } | null
        }>
      >(),
  ])

  // Collapse the per-period rows into one entry per teacher / student,
  // with the count of blocked periods for context.
  const teacherMap = new Map<
    string,
    { id: string; name: string; blockedPeriods: number }
  >()
  for (const row of teacherConstraints.data ?? []) {
    const name =
      [row.profile?.first_name, row.profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      row.profile?.display_name ||
      row.profile?.email ||
      "(unknown)"
    const existing = teacherMap.get(row.profile_id)
    if (existing) {
      existing.blockedPeriods += 1
    } else {
      teacherMap.set(row.profile_id, {
        id: row.profile_id,
        name,
        blockedPeriods: 1,
      })
    }
  }
  const teachersWithConstraints = [...teacherMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const studentMap = new Map<
    string,
    { id: string; name: string; blockedPeriods: number }
  >()
  for (const row of studentConstraints.data ?? []) {
    const name = row.student
      ? row.student.preferred_name?.trim() ||
        `${row.student.legal_first_name} ${row.student.legal_last_name}`
      : "(unknown)"
    const existing = studentMap.get(row.student_id)
    if (existing) {
      existing.blockedPeriods += 1
    } else {
      studentMap.set(row.student_id, {
        id: row.student_id,
        name,
        blockedPeriods: 1,
      })
    }
  }
  const studentsWithConstraints = [...studentMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const defaultTermId =
    (raw.term_id && terms.find((t) => t.id === raw.term_id)?.id) ??
    terms.find((t) => t.is_current)?.id ??
    terms[0]?.id ??
    ""

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
        <h1 className="text-3xl font-extrabold text-brand-navy">
          What-if explorer
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          Generate a draft with one or more constraints loosened, to see
          how much a bottleneck is costing. Nothing here changes the
          underlying data — the overrides apply to this run only. The
          result is a normal draft, tagged with a note describing what
          was loosened, so you can compare it against the baseline.
        </p>
      </header>

      {raw.solver_error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">Solver failed.</p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
            {raw.solver_error}
          </p>
        </section>
      )}

      {terms.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
          No terms exist yet. Create one on the{" "}
          <Link className="underline" href="/admin/academics/terms">
            Terms tab
          </Link>{" "}
          first.
        </section>
      ) : (
        <form
          action={generateWhatIfDraftAction}
          className="space-y-6 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
        >
          {/* Term + min size */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Term</span>
              <select
                name="term_id"
                required
                defaultValue={defaultTermId}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.academic_year})
                    {term.is_current ? " — current" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Min section size</span>
              <input
                name="min_section_size"
                type="number"
                min="1"
                max="20"
                defaultValue={2}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </label>
          </div>

          {/* Relax workload caps */}
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
            <input
              type="checkbox"
              name="relax_workload_caps"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
            />
            <span>
              <span className="font-semibold">Relax all teacher workload caps</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Ignore every teacher&rsquo;s max-periods-per-week and
                max-consecutive-periods limit for this run. Answers
                &ldquo;how much fulfillment are the workload caps
                costing us?&rdquo;
              </span>
            </span>
          </label>

          {/* Ignore teacher availability */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">
              Ignore teacher availability constraints
            </legend>
            <p className="text-xs text-slate-500">
              Tick a teacher to treat them as available every period for
              this run. Only teachers with at least one blocked period
              are listed.
            </p>
            {teachersWithConstraints.length === 0 ? (
              <p className="text-xs italic text-slate-500">
                No teachers have availability constraints set.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {teachersWithConstraints.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="ignore_teacher_unavailability"
                      value={t.id}
                      className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                    />
                    <span>
                      {t.name}{" "}
                      <span className="text-xs text-slate-400">
                        ({t.blockedPeriods} blocked)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Ignore student availability */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-slate-900">
              Ignore student availability constraints
            </legend>
            <p className="text-xs text-slate-500">
              Tick a student to treat them as available every period for
              this run. Only students with at least one blocked period
              are listed.
            </p>
            {studentsWithConstraints.length === 0 ? (
              <p className="text-xs italic text-slate-500">
                No students have availability constraints set.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {studentsWithConstraints.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      name="ignore_student_unavailability"
                      value={s.id}
                      className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                    />
                    <span>
                      {s.name}{" "}
                      <span className="text-xs text-slate-400">
                        ({s.blockedPeriods} blocked)
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Run what-if draft
            </button>
            <p className="text-xs text-slate-500">
              Generates a draft and drops you on it. Compare it against
              your baseline draft to see the delta.
            </p>
          </div>
        </form>
      )}
    </div>
  )
}
