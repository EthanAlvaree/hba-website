import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  facultyLabel,
  listFaculty,
  listTerms,
  sectionModalitySchema,
  sectionPeriodSchema,
  type FacultyOption,
} from "@/lib/sis"
import { periodDisplayLabel } from "@/lib/scheduler"
import type { SolverMetrics, SolverWarning } from "@/lib/scheduler-solver"
import { createClient } from "@supabase/supabase-js"
import AcademicsHeader from "../AcademicsHeader"
import {
  commitDraftAction,
  generateScheduleDraftAction,
  setDraftStatusAction,
  updateDraftNotesAction,
  updateDraftSectionAction,
} from "./actions"
import { DraftAssignmentsBoard, type BoardData } from "./DraftAssignmentsBoard"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{
    draft_id?: string
    solver_error?: string
    commit_error?: string
    committed?: string  // "N_M" — sections_M_enrollments
    section_saved?: string
    notes_saved?: string
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
    metrics?: SolverMetrics
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
  max_enrollment: number | null
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

// Every course request for the draft's term — the demand side. Joined
// against the draft's assignments to build the per-student fulfillment
// report (did each student get their cores? at what rank?).
type StudentRequestRow = {
  id: string
  student_id: string
  course_id: string
  kind: "core" | "elective" | "alternate"
  preference_rank: number
  student: {
    id: string
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
  } | null
  course: { id: string; code: string; name: string } | null
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

  const raw = await searchParams

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [terms, draftsRes, faculty] = await Promise.all([
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
    listFaculty(),
  ])

  if (draftsRes.error) throw new Error(draftsRes.error.message)
  const drafts = draftsRes.data ?? []

  // If a specific draft is selected, load its sections + assignments.
  let selectedDraft: DraftRow | null = null
  let selectedSections: DraftSectionRow[] = []
  let assignmentsBySection = new Map<string, AssignmentRow[]>()
  let selectedDraftRequests: StudentRequestRow[] = []

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
      const draftTermId = selectedDraft.term?.id ?? null
      const [sectionsRes, assignmentsRes, requestsRes] = await Promise.all([
        supabase
          .from("schedule_draft_sections")
          .select(
            `id, course_id, teacher_profile_id, period, section_code, max_enrollment,
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
        draftTermId
          ? supabase
              .from("student_course_requests")
              .select(
                `id, student_id, course_id, kind, preference_rank,
                 student:students(id, legal_first_name, legal_last_name, preferred_name),
                 course:courses(id, code, name)`
              )
              .eq("term_id", draftTermId)
              .returns<StudentRequestRow[]>()
          : Promise.resolve({ data: [] as StudentRequestRow[], error: null }),
      ])
      if (sectionsRes.error) throw new Error(sectionsRes.error.message)
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      if (requestsRes.error) throw new Error(requestsRes.error.message)
      selectedSections = sectionsRes.data ?? []
      selectedDraftRequests = requestsRes.data ?? []
      for (const a of assignmentsRes.data ?? []) {
        const list = assignmentsBySection.get(a.draft_section_id) ?? []
        list.push(a)
        assignmentsBySection.set(a.draft_section_id, list)
      }
    }
  }

  return (
    <div className="space-y-6">
        <AcademicsHeader active="scheduler" />

        {raw.solver_error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">Solver failed.</p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
              {raw.solver_error}
            </p>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold text-brand-navy">Scheduler</h2>
              <p className="mt-2 text-sm text-slate-600">
                Generate a proposed schedule from current data — student course
                requests, faculty qualifications/availability/workload, course
                catalog, terms. The solver is greedy v1: it produces a
                <em> reasonable starting point</em>, not a guaranteed-optimal
                schedule. Review the draft below, edit if needed (Turn D — manual
                override + commit lands next), then approve.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/academics/scheduler/course-requests"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                View course requests →
              </Link>
              <Link
                href="/admin/academics/scheduler/compare"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                Compare drafts →
              </Link>
              <Link
                href="/admin/academics/scheduler/what-if"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                What-if explorer →
              </Link>
            </div>
          </div>
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

        {/* Commit status banners */}
        {raw.commit_error && (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-rose-900">Commit failed.</p>
            <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{raw.commit_error}</p>
          </section>
        )}
        {raw.committed && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">
              Draft committed to the live SIS.
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              {(() => {
                const [sections, enrollments] = raw.committed.split("_")
                return `${sections ?? 0} sections + ${enrollments ?? 0} enrollments created. View them on the Sections tab.`
              })()}
            </p>
          </section>
        )}
        {raw.section_saved === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">Section saved.</p>
          </section>
        )}
        {raw.notes_saved === "1" && (
          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-4 shadow-sm">
            <p className="text-sm font-semibold text-emerald-900">Draft notes saved.</p>
          </section>
        )}

        {/* Selected draft details */}
        {selectedDraft && (
          <DraftDetail
            draft={selectedDraft}
            sections={selectedSections}
            assignmentsBySection={assignmentsBySection}
            requests={selectedDraftRequests}
            faculty={faculty}
          />
        )}
    </div>
  )
}

function DraftDetail({
  draft,
  sections,
  assignmentsBySection,
  requests,
  faculty,
}: {
  draft: DraftRow
  sections: DraftSectionRow[]
  assignmentsBySection: Map<string, AssignmentRow[]>
  requests: StudentRequestRow[]
  faculty: FacultyOption[]
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
          {draft.status !== "committed" && draft.status !== "discarded" && (
            <form action={commitDraftAction}>
              <input type="hidden" name="draft_id" value={draft.id} />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Commit to SIS →
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Sections" value={summary.section_count ?? 0} />
        <Stat label="Requests fulfilled" value={summary.fulfilled_requests ?? 0} />
        <Stat label="Requests unfulfilled" value={summary.unfulfilled_requests ?? 0} />
      </div>

      {/* Multi-objective breakdown */}
      {summary.metrics && <MetricsCard metrics={summary.metrics} />}

      {/* Admin annotations — "why we chose this draft" */}
      <DraftNotesCard draftId={draft.id} notes={draft.notes} />

      <CapacityRollup sections={sections} assignmentsBySection={assignmentsBySection} />

      {/* Drag/drop assignment board */}
      {sections.length > 0 && (
        <DraftAssignmentsBoard
          data={buildBoardData(draft, sections, assignmentsBySection)}
        />
      )}

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
                      <li key={section.id}>
                        <details className="rounded-2xl border border-slate-200 bg-slate-50">
                          <summary className="cursor-pointer list-none px-4 py-3">
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
                              <CapacityBadge
                                count={assignments.length}
                                cap={section.max_enrollment}
                              />
                              <span className="ml-auto inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                                Edit
                              </span>
                            </div>

                            {assignments.length > 0 && (
                              <ul className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                                {assignments.map((a) => (
                                  <li key={a.id}>· {studentDisplay(a.student)}</li>
                                ))}
                              </ul>
                            )}
                          </summary>

                          {draft.status !== "committed" && (
                            <DraftSectionEditForm
                              draft={draft}
                              section={section}
                              faculty={faculty}
                            />
                          )}
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {/* Per-student fulfillment report */}
      <FulfillmentReport
        requests={requests}
        sections={sections}
        assignmentsBySection={assignmentsBySection}
      />

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

// Per-student fulfillment breakdown: did each student get their cores,
// their electives, at what rank, in which period? Collapsed by default
// (it's long) but the summary line shows the headline — how many
// students got every core they asked for.
function FulfillmentReport({
  requests,
  sections,
  assignmentsBySection,
}: {
  requests: StudentRequestRow[]
  sections: DraftSectionRow[]
  assignmentsBySection: Map<string, AssignmentRow[]>
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        No course requests on file for this term — nothing to report.
      </div>
    )
  }

  // request_id → { section, period } for every fulfilled request.
  const fulfilledByRequestId = new Map<
    string,
    { sectionCode: string | null; period: string | null; courseName: string }
  >()
  const sectionById = new Map(sections.map((s) => [s.id, s]))
  for (const list of assignmentsBySection.values()) {
    for (const a of list) {
      if (!a.fulfilled_request_id) continue
      const section = sectionById.get(a.draft_section_id)
      if (!section) continue
      fulfilledByRequestId.set(a.fulfilled_request_id, {
        sectionCode: section.section_code,
        period: section.period,
        courseName: section.course?.name ?? "(course)",
      })
    }
  }

  // Bucket requests by student.
  type StudentBucket = {
    studentId: string
    name: string
    requests: StudentRequestRow[]
  }
  const byStudent = new Map<string, StudentBucket>()
  for (const r of requests) {
    const name = r.student
      ? r.student.preferred_name?.trim() ||
        `${r.student.legal_first_name} ${r.student.legal_last_name}`
      : "(unknown student)"
    const bucket = byStudent.get(r.student_id) ?? {
      studentId: r.student_id,
      name,
      requests: [],
    }
    bucket.requests.push(r)
    byStudent.set(r.student_id, bucket)
  }
  const students = [...byStudent.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  // Headline: how many students got every core they requested?
  let allCoresMet = 0
  let studentsWithCores = 0
  for (const s of students) {
    const cores = s.requests.filter((r) => r.kind === "core")
    if (cores.length === 0) continue
    studentsWithCores += 1
    const allMet = cores.every((c) => fulfilledByRequestId.has(c.id))
    if (allMet) allCoresMet += 1
  }

  return (
    <details className="rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-navy">
        Per-student fulfillment —{" "}
        <span className="font-normal text-slate-600">
          {allCoresMet} of {studentsWithCores} students got every core they
          requested (click to expand)
        </span>
      </summary>
      <div className="space-y-2 border-t border-slate-200 px-4 py-3">
        {students.map((s) => {
          const sorted = [...s.requests].sort((a, b) => {
            const kindOrder = { core: 0, elective: 1, alternate: 2 }
            const k = kindOrder[a.kind] - kindOrder[b.kind]
            if (k !== 0) return k
            return a.preference_rank - b.preference_rank
          })
          const unmetCores = sorted.filter(
            (r) => r.kind === "core" && !fulfilledByRequestId.has(r.id)
          ).length
          return (
            <div
              key={s.studentId}
              className={`rounded-2xl border px-4 py-3 ${
                unmetCores > 0
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">
                {s.name}
                {unmetCores > 0 && (
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700">
                    {unmetCores} core{unmetCores === 1 ? "" : "s"} unmet
                  </span>
                )}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {sorted.map((r) => {
                  const fulfilled = fulfilledByRequestId.get(r.id)
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          r.kind === "core"
                            ? "bg-brand-navy/10 text-brand-navy"
                            : r.kind === "elective"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {r.kind} · rank {r.preference_rank}
                      </span>
                      <span className="text-slate-800">
                        {r.course?.name ?? "(course)"}
                      </span>
                      {fulfilled ? (
                        <span className="text-emerald-700">
                          → {periodLabel(fulfilled.period)}
                          {fulfilled.sectionCode
                            ? ` · Sec ${fulfilled.sectionCode}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-rose-700">→ not placed</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </details>
  )
}

function periodLabel(period: string | null): string {
  if (!period) return "Unscheduled"
  if (period === "async") return "Async"
  if (period.startsWith("period_")) return `Period ${period.slice(7)}`
  if (period.startsWith("elective_")) return `Elective ${period.slice(9)}`
  return period
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
    case "course_not_offered_this_year":
      return `${w.course_name} — offered_pattern is ${w.offered_pattern} but this term starts in ${w.academic_year_start}. No one will be scheduled into it.`
    case "prereq_not_met":
      return `${w.course_name} — student ${w.student_id.slice(0, 8)} is missing prereqs (${w.missing_prereq_course_ids.length} alternative(s)). Grant a per-student override if warranted.`
    case "prereq_recommended_missing":
      return `${w.course_name} — student ${w.student_id.slice(0, 8)} is missing a recommended prereq (${w.missing_prereq_course_ids.length} alternative(s)). Course is still scheduled; check with the family if this is a concern.`
    case "student_unavailable_all_periods":
      return `${w.course_name} — student ${w.student_id.slice(0, 8)}'s availability rules block every period the qualified teachers can teach. Either loosen the student's availability or expand teacher coverage.`
  }
}

function DraftSectionEditForm({
  draft,
  section,
  faculty,
}: {
  draft: DraftRow
  section: DraftSectionRow
  faculty: FacultyOption[]
}) {
  return (
    <form
      action={updateDraftSectionAction}
      className="space-y-3 border-t border-slate-200 px-4 py-3"
    >
      <input type="hidden" name="draft_id" value={draft.id} />
      <input type="hidden" name="draft_section_id" value={section.id} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Teacher</span>
          <select
            name="teacher_profile_id"
            defaultValue={section.teacher_profile_id ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Unassigned</option>
            {faculty.map((option) => (
              <option key={option.id} value={option.id}>
                {facultyLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Period</span>
          <select
            name="period"
            defaultValue={section.period ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Unscheduled</option>
            {sectionPeriodSchema.options.map((option) => (
              <option key={option} value={option}>
                {periodDisplayLabel[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Section code</span>
          <input
            name="section_code"
            defaultValue={section.section_code ?? ""}
            maxLength={20}
            placeholder="A, B, etc."
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Room</span>
          <input
            name="room"
            defaultValue=""
            maxLength={40}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Max enrollment</span>
          <input
            name="max_enrollment"
            type="number"
            min="1"
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Modality</span>
          <select
            name="modality"
            defaultValue="in_person"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {sectionModalitySchema.options.map((option) => (
              <option key={option} value={option}>
                {option.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <p className="text-xs text-slate-500">
        Editing here only changes the draft — the live schedule isn&rsquo;t
        touched until you click Commit to SIS at the top. Student
        assignments per section aren&rsquo;t editable inline yet; for now,
        edit the underlying course requests / availability / qualifications
        and regenerate the draft if you need different placements.
      </p>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Save section
      </button>
    </form>
  )
}

function buildBoardData(
  draft: DraftRow,
  sections: DraftSectionRow[],
  assignmentsBySection: Map<string, AssignmentRow[]>
): BoardData {
  // Same period ordering used by the read-only listing below.
  const orderedPeriods: Array<{ key: string; label: string }> = [
    { key: "period_1", label: periodDisplayLabel.period_1 },
    { key: "period_2", label: periodDisplayLabel.period_2 },
    { key: "period_3", label: periodDisplayLabel.period_3 },
    { key: "period_4", label: periodDisplayLabel.period_4 },
    { key: "period_5", label: periodDisplayLabel.period_5 },
    { key: "period_6", label: periodDisplayLabel.period_6 },
    { key: "elective_1", label: periodDisplayLabel.elective_1 },
    { key: "elective_2", label: periodDisplayLabel.elective_2 },
    { key: "async", label: periodDisplayLabel.async },
    { key: "__unscheduled__", label: "Unscheduled" },
  ]

  return {
    draft_id: draft.id,
    draft_status: draft.status,
    periods: orderedPeriods,
    sections: sections.map((section) => ({
      id: section.id,
      course_id: section.course_id,
      course_name: section.course?.name ?? "(deleted course)",
      course_code: section.course?.code ?? null,
      section_code: section.section_code,
      period: section.period,
      period_label: section.period
        ? periodDisplayLabel[section.period as keyof typeof periodDisplayLabel] ?? section.period
        : "Unscheduled",
      teacher_label: teacherShortName(section.teacher),
      max_enrollment: section.max_enrollment,
      assignments: (assignmentsBySection.get(section.id) ?? []).map((a) => ({
        id: a.id,
        student: a.student,
      })),
    })),
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

// The single "Score" number in the draft header summarizes how well a
// schedule performed. MetricsCard breaks it open: how many cores got
// fulfilled (the high-priority bucket), how often students got their
// rank-1 pick, and a couple teacher-side stats so admin can decide
// whether to commit-or-regenerate based on the dimensions they care
// about most.
function MetricsCard({ metrics }: { metrics: SolverMetrics }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">
        Quality breakdown
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        How this draft performed on the dimensions the score weights together. Use
        these to compare drafts when one has a higher number but
        you&rsquo;re not sure which trade-offs it&rsquo;s making.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricRow
          label="Cores fulfilled"
          primary={`${metrics.cores.fulfilled} / ${metrics.cores.total}`}
          secondary={pct(metrics.cores.rate)}
          tone={metrics.cores.rate >= 0.9 ? "good" : metrics.cores.rate >= 0.7 ? "ok" : "bad"}
        />
        <MetricRow
          label="Electives fulfilled"
          primary={`${metrics.electives.fulfilled} / ${metrics.electives.total}`}
          secondary={pct(metrics.electives.rate)}
          tone={metrics.electives.rate >= 0.8 ? "good" : metrics.electives.rate >= 0.5 ? "ok" : "bad"}
        />
        <MetricRow
          label="Rank-1 student match"
          primary={pct(metrics.rank_1_match_rate)}
          secondary={`${metrics.rank_1_matches} fulfilled at top pick`}
          tone={metrics.rank_1_match_rate >= 0.7 ? "good" : metrics.rank_1_match_rate >= 0.5 ? "ok" : "bad"}
        />
        <MetricRow
          label="Avg section size"
          primary={metrics.avg_section_size.toFixed(1)}
          secondary={`min: ${metrics.min_section_size_actual}${
            metrics.below_min_sections > 0
              ? ` · ${metrics.below_min_sections} below-min`
              : ""
          }`}
          tone={metrics.below_min_sections === 0 ? "good" : "ok"}
        />
        <MetricRow
          label="Teacher rank-1 match"
          primary={pct(metrics.teacher_rank_1_match_rate)}
          secondary={`${metrics.teacher_rank_1_matches} of ${metrics.section_count} sections`}
          tone={metrics.teacher_rank_1_match_rate >= 0.7 ? "good" : metrics.teacher_rank_1_match_rate >= 0.5 ? "ok" : "bad"}
        />
        <MetricRow
          label="Teacher load balance"
          primary={`σ ${metrics.teacher_load_balance_stdev.toFixed(2)}`}
          secondary="lower = more even"
          tone={metrics.teacher_load_balance_stdev < 1.5 ? "good" : metrics.teacher_load_balance_stdev < 2.5 ? "ok" : "bad"}
        />
      </div>
    </div>
  )
}

// Admin-editable notes on a draft. The solver leaves this blank on
// generation; the office fills it in to record the human judgment
// behind a commit decision ("chose this over draft #3 — Tricia's
// load is more even, and APUSH lands P3 like she asked").
function DraftNotesCard({
  draftId,
  notes,
}: {
  draftId: string
  notes: string | null
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-4 shadow-sm">
      <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-brand-orange">
        Draft notes
      </h4>
      <p className="mt-1 text-xs text-slate-500">
        Why this draft, what you tweaked, what to revisit. Saved on the
        draft so the reasoning survives past the decision.
      </p>
      <form action={updateDraftNotesAction} className="mt-3 space-y-2">
        <input type="hidden" name="draft_id" value={draftId} />
        <textarea
          name="notes"
          rows={3}
          maxLength={4000}
          defaultValue={notes ?? ""}
          placeholder="e.g. Committed over draft #3 — better teacher load balance, APUSH lands P3 as requested."
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save notes
        </button>
      </form>
    </div>
  )
}

function MetricRow({
  label,
  primary,
  secondary,
  tone,
}: {
  label: string
  primary: string
  secondary: string
  tone: "good" | "ok" | "bad"
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "ok"
        ? "border-amber-200 bg-amber-50/40"
        : "border-rose-200 bg-rose-50/40"
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{primary}</p>
      <p className="text-[11px] text-slate-600">{secondary}</p>
    </div>
  )
}

// Inline badge for "N students / M cap." Green well under cap, amber at or
// near cap, rose when over cap. cap === null means unlimited (gray).
function CapacityBadge({ count, cap }: { count: number; cap: number | null }) {
  if (cap === null) {
    return (
      <span className="text-xs font-semibold text-slate-700">
        · {count} student{count === 1 ? "" : "s"}
      </span>
    )
  }
  const over = count > cap
  const atOrNear = !over && count >= cap
  const cls = over
    ? "border border-rose-200 bg-rose-50 text-rose-700"
    : atOrNear
    ? "border border-amber-200 bg-amber-50 text-amber-800"
    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${cls}`}
    >
      {count} / {cap}
      {over && " · over"}
      {atOrNear && " · full"}
    </span>
  )
}

// Surfaces "sections over capacity" + "sections at capacity" at the top of
// a draft so the admin sees the problem without scrolling. Solver also
// emits its own capacity warnings, but those don't reflect post-drag/drop
// state. This recomputes from current assignment counts.
function CapacityRollup({
  sections,
  assignmentsBySection,
}: {
  sections: DraftSectionRow[]
  assignmentsBySection: Map<string, AssignmentRow[]>
}) {
  type Row = {
    section: DraftSectionRow
    count: number
    cap: number
  }
  const over: Row[] = []
  const atCap: Row[] = []
  for (const section of sections) {
    if (section.max_enrollment === null) continue
    const count = (assignmentsBySection.get(section.id) ?? []).length
    if (count > section.max_enrollment) {
      over.push({ section, count, cap: section.max_enrollment })
    } else if (count === section.max_enrollment) {
      atCap.push({ section, count, cap: section.max_enrollment })
    }
  }

  if (over.length === 0 && atCap.length === 0) return null

  return (
    <section
      className={`rounded-2xl border px-4 py-3 ${
        over.length > 0
          ? "border-rose-200 bg-rose-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          over.length > 0 ? "text-rose-900" : "text-amber-900"
        }`}
      >
        {over.length > 0
          ? `${over.length} section${over.length === 1 ? " is" : "s are"} over capacity.`
          : `${atCap.length} section${atCap.length === 1 ? " is" : "s are"} at capacity.`}
      </p>
      {over.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-rose-900">
          {over.map(({ section, count, cap }) => (
            <li key={section.id}>
              <strong className="font-semibold">
                {section.course?.name ?? "(deleted course)"}
              </strong>
              {section.section_code ? ` (Sec ${section.section_code})` : ""} —{" "}
              {count} students assigned, cap {cap}.
            </li>
          ))}
        </ul>
      )}
      {atCap.length > 0 && over.length === 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-900">
          {atCap.slice(0, 5).map(({ section, count, cap }) => (
            <li key={section.id}>
              {section.course?.name ?? "(deleted course)"}
              {section.section_code ? ` (Sec ${section.section_code})` : ""} —{" "}
              {count} / {cap}
            </li>
          ))}
          {atCap.length > 5 && <li>… and {atCap.length - 5} more.</li>}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-600">
        Edit a section&rsquo;s cap below, or use the drag/drop board to move
        students into a less-full section.
      </p>
    </section>
  )
}
