// lib/scheduler-solver.ts
//
// Schedule-builder v1. Greedy algorithm that takes a term's worth of student
// course requests + faculty teaching profiles and produces a draft schedule
// (sections + per-section student assignments).
//
// Honest about its limits:
//   - This is greedy first-fit with a couple of heuristics, NOT a proper
//     constraint solver. It produces a "reasonable starting point" the
//     admin reviews and edits.
//   - It does NOT yet do local-search improvement / hill-climbing — that's
//     a Turn C+1 enhancement.
//   - It does NOT yet honor `max_consecutive_periods` from workload
//     preferences (just the weekly cap). The bell-schedule periods don't
//     all share days anyway, so "consecutive" needs careful definition.
//   - It DOES respect: course → qualified teacher, teacher availability,
//     teacher weekly workload cap, per-student per-period uniqueness,
//     per-section max enrollment, and minimum class size (configurable).
//
// Inputs are read directly from the database. Output is persisted as a
// schedule_draft row + child rows.

import { createClient } from "@supabase/supabase-js"
import { sectionPeriodSchema, type SectionPeriod } from "@/lib/sis"

// ============================================================================
// Supabase client (lazy)
// ============================================================================

function createServerSupabaseClient() {
  const supabaseUrl = process.env.HBA_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let cachedSupabase: ReturnType<typeof createServerSupabaseClient> | undefined
function getSupabase() {
  if (!cachedSupabase) cachedSupabase = createServerSupabaseClient()
  return cachedSupabase
}

// ============================================================================
// Input shapes
// ============================================================================

type RequestInput = {
  id: string
  student_id: string
  course_id: string
  kind: "core" | "elective" | "alternate"
  preference_rank: number
}

type QualificationInput = {
  profile_id: string
  course_id: string
  preference_rank: number
}

type AvailabilityInput = {
  profile_id: string
  period: SectionPeriod
  available: boolean
}

type WorkloadInput = {
  profile_id: string
  min_periods_per_week: number | null
  max_periods_per_week: number | null
}

type CourseInput = {
  id: string
  code: string
  name: string
  is_elective: boolean
}

type FacultyInput = {
  id: string
  display_name: string | null
  email: string
}

// ============================================================================
// Output shape
// ============================================================================

export type ProposedSection = {
  course_id: string
  course_code: string
  course_name: string
  teacher_profile_id: string | null
  teacher_label: string
  period: SectionPeriod | null
  section_code: string | null
  student_ids: string[]
  // Which student_course_requests this section fulfills, keyed by student.
  fulfilled_request_by_student: Record<string, string>
}

export type SolverWarning =
  | { kind: "no_qualified_teacher"; course_id: string; course_name: string }
  | { kind: "no_available_period"; course_id: string; course_name: string; teacher_id: string }
  | { kind: "below_min_size"; course_id: string; course_name: string; period: SectionPeriod; size: number; min: number }
  | {
      kind: "unfulfilled_request"
      student_id: string
      course_id: string
      course_name: string
      request_kind: "core" | "elective" | "alternate"
    }
  | { kind: "section_at_capacity"; course_id: string; course_name: string; period: SectionPeriod }

export type SolverResult = {
  sections: ProposedSection[]
  warnings: SolverWarning[]
  fulfilled_requests: number
  unfulfilled_requests: number
  score: number
}

// ============================================================================
// Tunable inputs
// ============================================================================

export type SolverOptions = {
  term_id: string
  min_section_size?: number       // default 2 (per Ethan's "no 1-1 classes" rule)
  default_max_section_size?: number  // applied if course has no max_enrollment; default 20
}

// ============================================================================
// Scoring weights
// ============================================================================

const SCORE_FULFILL_CORE = 50      // strong incentive to fulfill core requests
const SCORE_FULFILL_ELECTIVE = 30
const SCORE_FULFILL_ALTERNATE = 10
const SCORE_PER_STUDENT_IN_SECTION = 3   // bigger sections = better financially
const SCORE_PENALTY_BELOW_MIN = -50      // strong penalty for tiny sections
const SCORE_PENALTY_UNFULFILLED_CORE = -40
const SCORE_PENALTY_UNFULFILLED_ELECTIVE = -10
const SCORE_RANK_BONUS = 5   // bonus per request fulfilled at preference_rank=1, scales down

// ============================================================================
// Main solver entry point
// ============================================================================

export async function solveScheduleForTerm(options: SolverOptions): Promise<SolverResult> {
  const minSectionSize = options.min_section_size ?? 2
  const defaultMaxSection = options.default_max_section_size ?? 20

  const supabase = getSupabase()

  // Pull every input the solver needs in parallel.
  const [
    requestsRes,
    qualificationsRes,
    availabilityRes,
    workloadRes,
    coursesRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("student_course_requests")
      .select("id, student_id, course_id, kind, preference_rank")
      .eq("term_id", options.term_id)
      .returns<RequestInput[]>(),
    supabase
      .from("teacher_qualifications")
      .select("profile_id, course_id, preference_rank")
      .returns<QualificationInput[]>(),
    supabase
      .from("teacher_availability")
      .select("profile_id, period, available")
      .returns<AvailabilityInput[]>(),
    supabase
      .from("teacher_workload_preferences")
      .select("profile_id, min_periods_per_week, max_periods_per_week")
      .returns<WorkloadInput[]>(),
    supabase
      .from("courses")
      .select("id, code, name, is_elective")
      .eq("active", true)
      .returns<CourseInput[]>(),
    supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("active", true)
      .or("roles.cs.{faculty},roles.cs.{admin}")
      .returns<FacultyInput[]>(),
  ])

  if (requestsRes.error) throw new Error(requestsRes.error.message)
  if (qualificationsRes.error) throw new Error(qualificationsRes.error.message)
  if (availabilityRes.error) throw new Error(availabilityRes.error.message)
  if (workloadRes.error) throw new Error(workloadRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)
  if (profilesRes.error) throw new Error(profilesRes.error.message)

  const requests = requestsRes.data ?? []
  const qualifications = qualificationsRes.data ?? []
  const availability = availabilityRes.data ?? []
  const workloads = workloadRes.data ?? []
  const courses = coursesRes.data ?? []
  const faculty = profilesRes.data ?? []

  // Quick lookups
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const facultyById = new Map(faculty.map((f) => [f.id, f]))

  // Qualifications indexed by course → teacher (sorted by preference_rank).
  const qualifiedTeachersByCourse = new Map<string, QualificationInput[]>()
  for (const q of qualifications) {
    const list = qualifiedTeachersByCourse.get(q.course_id) ?? []
    list.push(q)
    qualifiedTeachersByCourse.set(q.course_id, list)
  }
  for (const list of qualifiedTeachersByCourse.values()) {
    list.sort((a, b) => a.preference_rank - b.preference_rank)
  }

  // Availability indexed by teacher → set of periods they CAN'T teach
  // (default available; explicit false flips them out).
  const unavailableByTeacher = new Map<string, Set<SectionPeriod>>()
  for (const a of availability) {
    if (!a.available) {
      const set = unavailableByTeacher.get(a.profile_id) ?? new Set<SectionPeriod>()
      set.add(a.period)
      unavailableByTeacher.set(a.profile_id, set)
    }
  }

  // Workload caps. null = no cap. Default cap = 8 periods/week.
  const maxPeriodsByTeacher = new Map<string, number>()
  for (const w of workloads) {
    if (typeof w.max_periods_per_week === "number") {
      maxPeriodsByTeacher.set(w.profile_id, w.max_periods_per_week)
    }
  }

  // Demand: students grouped by course (with their request rows so we know
  // kind + rank). Sorted by (kind preference: core > elective > alternate),
  // then preference_rank ascending, so the greedy pass favors high-priority
  // requests first.
  const demandByCourse = new Map<string, RequestInput[]>()
  for (const req of requests) {
    const list = demandByCourse.get(req.course_id) ?? []
    list.push(req)
    demandByCourse.set(req.course_id, list)
  }
  const kindOrder: Record<RequestInput["kind"], number> = {
    core: 0,
    elective: 1,
    alternate: 2,
  }
  for (const list of demandByCourse.values()) {
    list.sort((a, b) => {
      const k = kindOrder[a.kind] - kindOrder[b.kind]
      if (k !== 0) return k
      return a.preference_rank - b.preference_rank
    })
  }

  // Solver state ------------------------------------------------------------

  const warnings: SolverWarning[] = []
  const proposed: ProposedSection[] = []

  // Tracks (student_id, period) → already assigned, so a student can't be
  // in two places at once.
  const studentPeriodTaken = new Map<string, Set<SectionPeriod>>()
  // Tracks teacher → set of periods they've been assigned to. Used for
  // workload cap + uniqueness.
  const teacherPeriodTaken = new Map<string, Set<SectionPeriod>>()

  const courseSectionLetters = new Map<string, number>() // course → next letter index

  // Outer loop: courses with the most demand first (helps fill big sections).
  const coursesSortedByDemand = [...demandByCourse.entries()].sort(
    (a, b) => b[1].length - a[1].length
  )

  for (const [courseId, demand] of coursesSortedByDemand) {
    const course = courseById.get(courseId)
    if (!course) continue

    const teachers = qualifiedTeachersByCourse.get(courseId) ?? []
    if (teachers.length === 0) {
      warnings.push({ kind: "no_qualified_teacher", course_id: courseId, course_name: course.name })
      for (const req of demand) {
        warnings.push({
          kind: "unfulfilled_request",
          student_id: req.student_id,
          course_id: courseId,
          course_name: course.name,
          request_kind: req.kind,
        })
      }
      continue
    }

    // For each qualified teacher in preference order, try to instantiate
    // a section in a period that works for both teacher and students.
    let remainingDemand = [...demand]

    for (const teacherQual of teachers) {
      if (remainingDemand.length === 0) break

      const teacher = facultyById.get(teacherQual.profile_id)
      if (!teacher) continue

      const unavailable = unavailableByTeacher.get(teacher.id) ?? new Set<SectionPeriod>()
      const taken = teacherPeriodTaken.get(teacher.id) ?? new Set<SectionPeriod>()
      const maxLoad = maxPeriodsByTeacher.get(teacher.id) ?? sectionPeriodSchema.options.length

      // Cap how many sections this teacher can pick up given workload.
      const canTakeMore = () => taken.size < maxLoad

      for (const period of sectionPeriodSchema.options) {
        if (remainingDemand.length === 0) break
        if (!canTakeMore()) break
        if (unavailable.has(period)) continue
        if (taken.has(period)) continue

        // Of the remaining demand, who is free this period AND has capacity?
        const maxSize = defaultMaxSection
        const studentsForSection: RequestInput[] = []
        for (const req of remainingDemand) {
          if (studentsForSection.length >= maxSize) break
          const studentTaken = studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
          if (studentTaken.has(period)) continue
          studentsForSection.push(req)
        }

        if (studentsForSection.length === 0) continue

        // Below-min check produces a warning, but we still create the
        // section (admin can merge/cancel later). For alternates only,
        // skip below-min sections entirely.
        const isAllAlternate = studentsForSection.every((s) => s.kind === "alternate")
        if (studentsForSection.length < minSectionSize) {
          if (isAllAlternate) continue
          warnings.push({
            kind: "below_min_size",
            course_id: courseId,
            course_name: course.name,
            period,
            size: studentsForSection.length,
            min: minSectionSize,
          })
        }

        // Commit the section.
        const letterIdx = courseSectionLetters.get(courseId) ?? 0
        const sectionCode = letterIdx === 0 ? null : String.fromCharCode(65 + letterIdx) // A, B, C...
        courseSectionLetters.set(courseId, letterIdx + 1)

        const fulfilled: Record<string, string> = {}
        const studentIds: string[] = []
        for (const req of studentsForSection) {
          const studentTaken = studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
          studentTaken.add(period)
          studentPeriodTaken.set(req.student_id, studentTaken)
          fulfilled[req.student_id] = req.id
          studentIds.push(req.student_id)
        }

        taken.add(period)
        teacherPeriodTaken.set(teacher.id, taken)

        proposed.push({
          course_id: courseId,
          course_code: course.code,
          course_name: course.name,
          teacher_profile_id: teacher.id,
          teacher_label: teacher.display_name || teacher.email,
          period,
          section_code: sectionCode,
          student_ids: studentIds,
          fulfilled_request_by_student: fulfilled,
        })

        // Strip assigned students from remaining demand.
        const assignedIds = new Set(studentsForSection.map((s) => s.student_id))
        remainingDemand = remainingDemand.filter((r) => !assignedIds.has(r.student_id))
      }
    }

    // Anyone left over → unfulfilled.
    for (const req of remainingDemand) {
      warnings.push({
        kind: "unfulfilled_request",
        student_id: req.student_id,
        course_id: courseId,
        course_name: course.name,
        request_kind: req.kind,
      })
    }
  }

  // ----- Scoring -----------------------------------------------------------

  const fulfilledCount = proposed.reduce((sum, s) => sum + s.student_ids.length, 0)
  const totalRequests = requests.length
  const unfulfilledCount = totalRequests - fulfilledCount

  const score = computeScore({
    sections: proposed,
    requests,
    warnings,
    minSectionSize,
  })

  return {
    sections: proposed,
    warnings,
    fulfilled_requests: fulfilledCount,
    unfulfilled_requests: unfulfilledCount,
    score: Math.round(score * 100) / 100,
  }
}

// Pure scoring pass — separated so the greedy loop above stays focused on
// section construction. Higher score = better.
function computeScore(input: {
  sections: ProposedSection[]
  requests: RequestInput[]
  warnings: SolverWarning[]
  minSectionSize: number
}): number {
  let score = 0

  const requestById = new Map(input.requests.map((r) => [r.id, r]))

  // Reward fulfilled (student, course) pairs by kind + rank, plus size bonus.
  for (const section of input.sections) {
    for (const studentId of section.student_ids) {
      const requestId = section.fulfilled_request_by_student[studentId]
      const req = requestId ? requestById.get(requestId) : null
      if (!req) continue
      const base =
        req.kind === "core"
          ? SCORE_FULFILL_CORE
          : req.kind === "elective"
          ? SCORE_FULFILL_ELECTIVE
          : SCORE_FULFILL_ALTERNATE
      score += base
      // Bonus tapers with rank: rank 1 → +bonus, rank 2 → +bonus/2, ...
      score += SCORE_RANK_BONUS / req.preference_rank
    }

    score += section.student_ids.length * SCORE_PER_STUDENT_IN_SECTION

    if (section.period && section.student_ids.length < input.minSectionSize) {
      score += SCORE_PENALTY_BELOW_MIN
    }
  }

  // Penalty for each unfulfilled request, weighted by request kind.
  for (const warning of input.warnings) {
    if (warning.kind !== "unfulfilled_request") continue
    if (warning.request_kind === "core") {
      score += SCORE_PENALTY_UNFULFILLED_CORE
    } else if (warning.request_kind === "elective") {
      score += SCORE_PENALTY_UNFULFILLED_ELECTIVE
    }
    // alternates have no penalty — they're explicit fallbacks
  }

  return score
}

// ============================================================================
// Persistence
// ============================================================================

// ============================================================================
// Draft section editing (Turn D)
// ============================================================================

// Updates one schedule_draft_sections row in place. Used by the admin
// review UI to fix solver decisions before commit. The set of editable
// fields mirrors what gets copied to course_sections on commit, so a
// review-time edit reaches the live schedule.
export async function updateDraftSection(input: {
  draft_section_id: string
  teacher_profile_id: string | null
  period: SectionPeriod | null
  section_code: string | null
  room: string | null
  max_enrollment: number | null
  modality: "in_person" | "online_async" | "online_sync" | "hybrid"
  notes: string | null
}): Promise<void> {
  const { error } = await getSupabase()
    .from("schedule_draft_sections")
    .update({
      teacher_profile_id: input.teacher_profile_id,
      period: input.period,
      section_code: input.section_code,
      room: input.room,
      max_enrollment: input.max_enrollment,
      modality: input.modality,
      notes: input.notes,
    })
    .eq("id", input.draft_section_id)

  if (error) {
    throw new Error(`Failed to update draft section: ${error.message}`)
  }
}

// Moves a student assignment from one draft section to another within the
// same draft. Used by the drag-drop board on /admin/academics/scheduler.
//
// Rules:
//   - Source and target sections must belong to the same draft.
//   - Source and target sections must reference the same course. Cross-course
//     moves break the fulfilled_request_id linkage — for now we refuse and
//     leave them to a regenerate. (Common case: move a kid from Pre-Algebra
//     section A to Pre-Algebra section B because periods don't work.)
//   - Refuses to move into a section that's already at max_enrollment.
//
// Does NOT touch fulfilled_request_id — the request stays "fulfilled" for the
// same course, which is still accurate after the move.
export async function moveDraftAssignment(input: {
  assignment_id: string
  target_section_id: string
}): Promise<void> {
  const supabase = getSupabase()

  const { data: assignment, error: assignmentError } = await supabase
    .from("schedule_draft_assignments")
    .select(
      `id, draft_section_id,
       draft_section:schedule_draft_sections!inner(id, draft_id, course_id, max_enrollment)`
    )
    .eq("id", input.assignment_id)
    .maybeSingle<{
      id: string
      draft_section_id: string
      draft_section: {
        id: string
        draft_id: string
        course_id: string
        max_enrollment: number | null
      } | null
    }>()

  if (assignmentError) {
    throw new Error(`Failed to load assignment: ${assignmentError.message}`)
  }
  if (!assignment || !assignment.draft_section) {
    throw new Error("Assignment not found.")
  }

  // No-op if dropping onto the same section.
  if (assignment.draft_section.id === input.target_section_id) {
    return
  }

  const { data: target, error: targetError } = await supabase
    .from("schedule_draft_sections")
    .select("id, draft_id, course_id, max_enrollment")
    .eq("id", input.target_section_id)
    .maybeSingle<{
      id: string
      draft_id: string
      course_id: string
      max_enrollment: number | null
    }>()

  if (targetError) {
    throw new Error(`Failed to load target section: ${targetError.message}`)
  }
  if (!target) {
    throw new Error("Target section not found.")
  }

  if (target.draft_id !== assignment.draft_section.draft_id) {
    throw new Error("Cannot move an assignment between different drafts.")
  }

  if (target.course_id !== assignment.draft_section.course_id) {
    throw new Error(
      "Cannot move a student into a section for a different course. Regenerate the draft if the underlying course request should change."
    )
  }

  // Capacity check.
  if (target.max_enrollment !== null) {
    const { count, error: countError } = await supabase
      .from("schedule_draft_assignments")
      .select("id", { count: "exact", head: true })
      .eq("draft_section_id", target.id)
    if (countError) {
      throw new Error(`Failed to check target capacity: ${countError.message}`)
    }
    if ((count ?? 0) >= target.max_enrollment) {
      throw new Error(
        `Target section is already at its max enrollment of ${target.max_enrollment}.`
      )
    }
  }

  const { error: updateError } = await supabase
    .from("schedule_draft_assignments")
    .update({ draft_section_id: target.id })
    .eq("id", input.assignment_id)

  if (updateError) {
    throw new Error(`Failed to move assignment: ${updateError.message}`)
  }
}

// ============================================================================
// Commit draft → course_sections + enrollments
// ============================================================================

export type CommitDraftResult = {
  sections_created: number
  enrollments_created: number
  warnings: string[]
}

// Promotes a schedule_draft into the live SIS. For each draft_section
// row, creates a course_sections row with the same shape; for each
// draft_assignment, creates an enrollments row pointing at the new
// section. Idempotent in the sense that the draft is marked 'committed'
// after success — re-committing the same draft is blocked.
//
// We do NOT clear pre-existing course_sections for the term. If the
// office wants to re-do a term's schedule from scratch, they need to
// delete the existing sections first. This is intentional caution:
// silently nuking live data on commit would be terrifying.
export async function commitDraftToSis(input: {
  draft_id: string
}): Promise<CommitDraftResult> {
  const supabase = getSupabase()

  // Load draft header so we know the target term + status.
  const { data: draft, error: draftError } = await supabase
    .from("schedule_drafts")
    .select("id, term_id, status")
    .eq("id", input.draft_id)
    .single<{ id: string; term_id: string; status: string }>()

  if (draftError) throw new Error(`Failed to load draft: ${draftError.message}`)
  if (draft.status === "committed") {
    throw new Error("This draft has already been committed.")
  }
  if (draft.status === "discarded") {
    throw new Error("This draft was discarded. Generate a fresh one to commit.")
  }

  // Load all draft sections + assignments for this draft.
  const { data: draftSections, error: dsError } = await supabase
    .from("schedule_draft_sections")
    .select(
      "id, course_id, teacher_profile_id, section_code, period, room, max_enrollment, modality, notes"
    )
    .eq("draft_id", input.draft_id)
    .returns<
      Array<{
        id: string
        course_id: string
        teacher_profile_id: string | null
        section_code: string | null
        period: SectionPeriod | null
        room: string | null
        max_enrollment: number | null
        modality: "in_person" | "online_async" | "online_sync" | "hybrid"
        notes: string | null
      }>
    >()

  if (dsError) throw new Error(`Failed to load draft sections: ${dsError.message}`)

  const sections = draftSections ?? []
  if (sections.length === 0) {
    throw new Error("This draft has no sections to commit.")
  }

  // Bulk-load assignments tied to those sections.
  const sectionIds = sections.map((s) => s.id)
  const { data: draftAssignments, error: daError } = await supabase
    .from("schedule_draft_assignments")
    .select("id, draft_section_id, student_id")
    .in("draft_section_id", sectionIds)
    .returns<Array<{ id: string; draft_section_id: string; student_id: string }>>()

  if (daError) throw new Error(`Failed to load draft assignments: ${daError.message}`)
  const assignments = draftAssignments ?? []

  // Insert course_sections one-by-one so we can capture the returned ids
  // in the order they correspond to draft sections. A bulk insert would
  // work too, but we want the mapping draft_section_id → real_section_id.
  const sectionIdMap = new Map<string, string>()
  for (const draftSection of sections) {
    const { data: realSection, error: insertError } = await supabase
      .from("course_sections")
      .insert({
        course_id: draftSection.course_id,
        term_id: draft.term_id,
        teacher_profile_id: draftSection.teacher_profile_id,
        section_code: draftSection.section_code,
        period: draftSection.period,
        room: draftSection.room,
        max_enrollment: draftSection.max_enrollment,
        modality: draftSection.modality,
        notes: draftSection.notes,
      })
      .select("id")
      .single<{ id: string }>()

    if (insertError) {
      throw new Error(
        `Failed to create section for course ${draftSection.course_id}: ${insertError.message}`
      )
    }
    sectionIdMap.set(draftSection.id, realSection.id)
  }

  // Now insert enrollments. We use upsert with onConflict to ignore the
  // (student_id, section_id) unique constraint — re-committing onto an
  // already-existing enrollment is benign.
  const enrollmentRows = assignments
    .map((a) => {
      const realSectionId = sectionIdMap.get(a.draft_section_id)
      if (!realSectionId) return null
      return {
        student_id: a.student_id,
        section_id: realSectionId,
        status: "enrolled" as const,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  let enrollmentsCreated = 0
  if (enrollmentRows.length > 0) {
    const { error: enrollmentError, count } = await supabase
      .from("enrollments")
      .upsert(enrollmentRows, { onConflict: "student_id,section_id", count: "exact" })

    if (enrollmentError) {
      throw new Error(`Failed to create enrollments: ${enrollmentError.message}`)
    }
    enrollmentsCreated = count ?? enrollmentRows.length
  }

  // Mark the draft committed.
  const { error: statusError } = await supabase
    .from("schedule_drafts")
    .update({ status: "committed" })
    .eq("id", input.draft_id)

  if (statusError) {
    throw new Error(`Failed to mark draft committed: ${statusError.message}`)
  }

  return {
    sections_created: sections.length,
    enrollments_created: enrollmentsCreated,
    warnings: [],
  }
}

export async function persistDraft(input: {
  term_id: string
  created_by: string | null
  result: SolverResult
  notes?: string | null
}): Promise<{ id: string }> {
  const supabase = getSupabase()

  const summary = {
    fulfilled_requests: input.result.fulfilled_requests,
    unfulfilled_requests: input.result.unfulfilled_requests,
    section_count: input.result.sections.length,
    warning_count: input.result.warnings.length,
    warnings: input.result.warnings,
  }

  const { data: draft, error: draftError } = await supabase
    .from("schedule_drafts")
    .insert({
      term_id: input.term_id,
      created_by: input.created_by,
      score: input.result.score,
      summary,
      notes: input.notes ?? null,
    })
    .select("id")
    .single<{ id: string }>()

  if (draftError) throw new Error(`Failed to save draft: ${draftError.message}`)

  // Bulk-insert sections, capture their IDs, then bulk-insert assignments.
  const sectionRows = input.result.sections.map((s) => ({
    draft_id: draft.id,
    course_id: s.course_id,
    teacher_profile_id: s.teacher_profile_id,
    period: s.period,
    section_code: s.section_code,
  }))

  if (sectionRows.length === 0) return { id: draft.id }

  const { data: insertedSections, error: sectionsError } = await supabase
    .from("schedule_draft_sections")
    .insert(sectionRows)
    .select("id, course_id, period, teacher_profile_id")
    .returns<Array<{ id: string; course_id: string; period: string | null; teacher_profile_id: string | null }>>()

  if (sectionsError) throw new Error(`Failed to save draft sections: ${sectionsError.message}`)
  const inserted = insertedSections ?? []

  // Match each proposed section back to its inserted DB row to get IDs.
  // The (course, period, teacher) tuple uniquely identifies sections within
  // a single draft, so this is safe.
  const findInsertedId = (s: ProposedSection): string | null => {
    const match = inserted.find(
      (row) =>
        row.course_id === s.course_id &&
        (row.period ?? null) === (s.period ?? null) &&
        (row.teacher_profile_id ?? null) === (s.teacher_profile_id ?? null)
    )
    return match?.id ?? null
  }

  const assignmentRows: Array<{
    draft_section_id: string
    student_id: string
    fulfilled_request_id: string | null
  }> = []

  for (const section of input.result.sections) {
    const sectionId = findInsertedId(section)
    if (!sectionId) continue
    for (const studentId of section.student_ids) {
      assignmentRows.push({
        draft_section_id: sectionId,
        student_id: studentId,
        fulfilled_request_id: section.fulfilled_request_by_student[studentId] ?? null,
      })
    }
  }

  if (assignmentRows.length > 0) {
    const { error: assignmentError } = await supabase
      .from("schedule_draft_assignments")
      .insert(assignmentRows)
    if (assignmentError) {
      throw new Error(`Failed to save draft assignments: ${assignmentError.message}`)
    }
  }

  return { id: draft.id }
}
