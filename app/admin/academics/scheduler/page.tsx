import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listTerms } from "@/lib/sis"
import { periodDisplayLabel } from "@/lib/scheduler"
import type { SolverWarning } from "@/lib/scheduler-solver"
import { createClient } from "@supabase/supabase-js"
import AcademicsHeader from "../AcademicsHeader"
import { generateScheduleDraftAction, setDraftStatusAction } from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    draft_id?: string
    solver_error?: string
  }>
}

type DraftRow = {
  id: string
  created_at: string
  created_by: string | null
  status: string
  score: number | null
  summary: {
    fulfilled_requests?: number
    unfulfilled_requests?: number
    section_count?: number
    warning_count?: number
    warnings?: SolverWarning[]
  } | null
  notes: string | null
  term: { id: string; name: string; slug: string } | null
}

type DraftSectionRow = {
  id: string
  course_id: string
  teacher_profile_id: string | null
  period: string | null
  section_code: string | null
  course: { id: string; code: string; name: string } | null
  teacher: { id: string; display_name: string | null; first_name: string | null; last_name: string | null; email: string } | null
}

type AssignmentRow = {
  id: string
  draft_section_id: string
  student_id: string
  fulfilled_request_id: string | null
  student: {
    id: string
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
  } | null
}

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

function teacherShortName(t: DraftSectionRow["teacher"]) {
  if (!t) return "Unassigned"
  const full = [t.first_name, t.last_name].filter(Boolean).join(" ").trim()
  return full || t.display_name || t.email
}

function studentDisplay(s: AssignmentRow["student"]) {
  if (!s) return "(unknown)"
  const preferred = s.preferred_name?.trim()
  const legal = `${s.legal_first_name} ${s.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export default async function SchedulerAdminPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
  const adminEmail = session?.user?.email ?? ""

  const raw = await searchParams

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [terms, draftsRes] = await Promise.all([
    listTerms(),
    supabase
      .from("schedule_drafts")
      .select(
        `id, created_at, created_by, status, score, summary, notes,
         term:terms(id, name, slug)`
      )
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<DraftRow[]>(),
  ])

  if (draftsRes.error) throw new Error(draftsRes.error.message)
  const drafts = draftsRes.data ?? []

  // If a specific draft is selected, load its sections + assignments.
  let selectedDraft: DraftRow | null = null
  let selectedSections: DraftSectionRow[] = []
  let assignmentsBySection = new Map<string, AssignmentRow[]>()

  if (raw.draft_id) {
    selectedDraft = drafts.find((d) => d.id === raw.draft_id) ?? null

    // If the requested draft isn't in the latest-20 list, fetch it directly.
    if (!selectedDraft) {
      const { data: standalone } = await supabase
        .from("schedule_drafts")
        .select(
          `id, created_at, created_by, status, score, summary, notes,
           term:terms(id, name, slug)`
        )
        .eq("id", raw.draft_id)
        .maybeSingle<DraftRow>()
      selectedDraft = standalone ?? null
    }

    if (selectedDraft) {
      const [sectionsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("schedule_draft_sections")
          .select(
            `id, course_id, teacher_profile_id, period, section_code,
             course:courses(id, code, name),
             teacher:profiles(id, display_name, first_name, last_name, email)`
          )
          .eq("draft_id", selectedDraft.id)
          .returns<DraftSectionRow[]>(),
        supabase
          .from("schedule_draft_assignments")
          .select(
            `id, draft_section_id, student_id, fulfilled_request_id,
             student:students(id, legal_first_name, legal_last_name, preferred_name),
             draft_section:schedule_draft_sections!inner(draft_id)`
          )
          .eq("draft_section.draft_id", selectedDraft.id)
          .returns<AssignmentRow[]>(),
      ])
      if (sectionsRes.error) throw new Error(sectionsRes.error.message)
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      selectedSections = sectionsRes.data ?? []
      for (const a of assignmentsRes.data ?? []) {
        const list = assignmentsBySection.get(a.draft_section_id) ?? []
        list.push(a)
        assignmentsBySection.set(a.draft_section_id, list)
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AcademicsHeader active="scheduler" adminEmail={adminEmail} />

        {raw.solver_error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">Solver failed.</p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {raw.solver_error}
            </p>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-brand-navy">Scheduler</h2>
          <p className="mt-2 text-sm text-slate-600">
            Generate a proposed schedule from current data — student course
            requests, faculty qualifications/availability/workload, course
            catalog, terms. The solver is greedy v1: it produces a
            <em> reasonable starting point</em>, not a guaranteed-optimal
            schedule. Review the draft below, edit if needed (Turn D — manual
            override + commit lands next), then approve.
          </p>
        </section>

        {/* Generate form */}
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Generate a new draft
          </h3>

          {terms.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No terms exist yet. Create one on the Terms tab first.
            </p>
          ) : (
            <form
              action={generateScheduleDraftAction}
              className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,200px)_auto] sm:items-end"
            >
              <label className="space-y-1 text-xs font-medium text-slate-700">
                <span className="block">Term</span>
                <select
                  name="term_id"
                  required
                  defaultValue={terms.find((t) => t.is_current)?.id ?? terms[0].id}
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

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Generate draft
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Solver runs in the server action — for ~50 students × ~6 requests,
            expect a few seconds. The proposed sections + per-section
            assignments persist as a <code>schedule_drafts</code> row you can
            review below.
          </p>
        </section>

        {/* Drafts list */}
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Recent drafts
          </h3>
          {drafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No drafts yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {drafts.map((draft) => (
                <li key={draft.id}>
                  <Link
                    href={`/admin/academics/scheduler?draft_id=${draft.id}`}
                    className={`block rounded-2xl border px-4 py-3 transition ${
                      selectedDraft?.id === draft.id
                        ? "border-brand-navy bg-brand-navy/5"
                        : "border-slate-200 bg-slate-50 hover:border-slate-400"
                    }`}
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {draft.term?.name ?? "(unknown term)"}{" "}
                          <span className="font-normal text-slate-500">
                            · {formatTimestamp(draft.created_at)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          By {draft.created_by ?? "unknown"} ·{" "}
                          {draft.summary?.section_count ?? 0} sections ·{" "}
                          {draft.summary?.fulfilled_requests ?? 0} fulfilled /{" "}
                          {draft.summary?.unfulfilled_requests ?? 0} unfulfilled
                          requests
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        Score: {draft.score?.toFixed(0) ?? "—"}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          draft.status === "committed"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : draft.status === "discarded"
                            ? "border border-rose-200 bg-rose-50 text-rose-700"
                            : draft.status === "reviewed"
                            ? "border border-sky-200 bg-sky-50 text-sky-700"
                            : "border border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {draft.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Selected draft details */}
        {selectedDraft && (
          <DraftDetail
            draft={selectedDraft}
            sections={selectedSections}
            assignmentsBySection={assignmentsBySection}
          />
        )}
      </div>
    </main>
  )
}

function DraftDetail({
  draft,
  sections,
  assignmentsBySection,
}: {
  draft: DraftRow
  sections: DraftSectionRow[]
  assignmentsBySection: Map<string, AssignmentRow[]>
}) {
  const summary = draft.summary ?? {}
  const warnings = summary.warnings ?? []

  // Group sections by period for a friendlier render.
  const sectionsByPeriod = new Map<string, DraftSectionRow[]>()
  for (const section of sections) {
    const key = section.period ?? "__unscheduled__"
    const list = sectionsByPeriod.get(key) ?? []
    list.push(section)
    sectionsByPeriod.set(key, list)
  }

  const orderedPeriods = [
    "period_1",
    "period_2",
    "period_3",
    "period_4",
    "period_5",
    "period_6",
    "elective_1",
    "elective_2",
    "async",
    "__unscheduled__",
  ]

  return (
    <section className="space-y-4 rounded-[2rem] border border-brand-navy/15 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Draft for {draft.term?.name ?? "(unknown term)"}
          </h3>
          <p className="text-xs text-slate-500">
            Generated {formatTimestamp(draft.created_at)}
            {draft.created_by && <> by {draft.created_by}</>} · Score{" "}
            {draft.score?.toFixed(2) ?? "—"} · Status{" "}
            <code>{draft.status}</code>
          </p>
          {draft.notes && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{draft.notes}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["reviewed", "discarded"] as const).map((status) => (
            <form key={status} action={setDraftStatusAction}>
              <input type="hidden" name="draft_id" value={draft.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                disabled={draft.status === status}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark {status}
              </button>
            </form>
          ))}
          <p className="text-xs text-slate-500">
            Commit-to-SIS lands in Turn D.
          </p>
        </div>
      </div>

      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Sections" value={summary.section_count ?? 0} />
        <Stat label="Requests fulfilled" value={summary.fulfilled_requests ?? 0} />
        <Stat label="Requests unfulfilled" value={summary.unfulfilled_requests ?? 0} />
      </div>

      {/* Sections by period */}
      {sections.length === 0 ? (
        <p className="text-sm text-slate-600">
          No sections proposed. Likely no student course requests or no
          qualified teachers configured for this term yet.
        </p>
      ) : (
        <div className="space-y-4">
          {orderedPeriods.map((period) => {
            const periodSections = sectionsByPeriod.get(period) ?? []
            if (periodSections.length === 0) return null
            const label =
              period === "__unscheduled__"
                ? "Unscheduled"
                : periodDisplayLabel[period as keyof typeof periodDisplayLabel] ?? period
            return (
              <div key={period}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {label}
                </p>
                <ul className="mt-2 space-y-2">
                  {periodSections.map((section) => {
                    const assignments = assignmentsBySection.get(section.id) ?? []
                    return (
                      <li
                        key={section.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {section.course?.name ?? "(deleted course)"}
                          </p>
                          {section.course?.code && (
                            <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                              {section.course.code}
                            </code>
                          )}
                          {section.section_code && (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                              Sec {section.section_code}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            · {teacherShortName(section.teacher)}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            · {assignments.length} student
                            {assignments.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {assignments.length > 0 && (
                          <ul className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                            {assignments.map((a) => (
                              <li key={a.id}>· {studentDisplay(a.student)}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <details className="rounded-2xl border border-amber-200 bg-amber-50/60">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-amber-900">
            {warnings.length} warning{warnings.length === 1 ? "" : "s"} (click
            to expand)
          </summary>
          <ul className="space-y-1 border-t border-amber-200 px-4 py-3 text-xs text-amber-900">
            {warnings.map((w, idx) => (
              <li key={idx}>
                <strong>{w.kind.replace(/_/g, " ")}:</strong>{" "}
                {summarizeWarning(w)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function summarizeWarning(w: SolverWarning): string {
  switch (w.kind) {
    case "no_qualified_teacher":
      return `${w.course_name} — no teacher is qualified for this course yet. Add a qualification on /faculty-portal/teaching or via the bio seed.`
    case "no_available_period":
      return `${w.course_name} — teacher has no open period. Loosen workload caps or expand availability.`
    case "below_min_size":
      return `${w.course_name} (${w.period}) — only ${w.size} student(s), below the min of ${w.min}. Consider canceling or merging.`
    case "unfulfilled_request":
      return `${w.course_name} — ${w.request_kind} request couldn't be placed for student ${w.student_id.slice(0, 8)}.`
    case "section_at_capacity":
      return `${w.course_name} (${w.period}) — section is at max enrollment; later requests will get bumped to alternates.`
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}
