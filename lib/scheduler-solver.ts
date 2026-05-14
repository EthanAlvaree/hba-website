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
//     teacher weekly workload cap, student period availability, per-student
//     per-period uniqueness, per-section max enrollment, minimum class
//     size, course offering pattern (alternating-year courses), and hard
//     course prerequisites (with admin-granted per-student overrides).
//
// Inputs are read directly from the database. Output is persisted as a
// schedule_draft row + child rows.

import { sectionPeriodSchema, type SectionPeriod } from "@/lib/sis"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

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

type StudentAvailabilityInput = {
  student_id: string
  period: SectionPeriod
  available: boolean
}

type WorkloadInput = {
  profile_id: string
  min_periods_per_week: number | null
  max_periods_per_week: number | null
  max_consecutive_periods: number | null
}

type CourseOfferedPattern =
  | "always"
  | "odd_start_year"
  | "even_start_year"
  | "manual"

type CourseInput = {
  id: string
  code: string
  name: string
  is_elective: boolean
  offered_pattern: CourseOfferedPattern
}

type FacultyInput = {
  id: string
  display_name: string | null
  email: string
}

type CoursePrereqInput = {
  course_id: string
  prerequisite_course_id: string
  kind: "hard" | "recommended"
  group_key: string | null
}

type StudentPrereqOverrideInput = {
  student_id: string
  course_id: string
}

// Enrollments that count as "course is done" for prereq-checking
// purposes. We pull every enrollment for every student in this
// term's requests, then bucket into "this student has completed
// these courses." Status 'completed' always counts. Status
// 'enrolled' counts when the section's term has already ended
// (the kid finished it; the registrar just hasn't flipped the
// status). We include current-term in-progress courses too so a
// junior taking Precalc this spring is eligible for Calc AB next
// fall.
type CompletedEnrollmentInput = {
  student_id: string
  status: string
  section: {
    course_id: string
    term: { end_date: string; is_current: boolean } | null
  } | null
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
  | {
      // Course's offered_pattern doesn't match the term's academic year
      // (e.g. AP Lang requested for an even-start year). The request is
      // dropped before section construction; admin can either grant an
      // override on the course or wait for the next year.
      kind: "course_not_offered_this_year"
      course_id: string
      course_name: string
      offered_pattern: CourseOfferedPattern
      academic_year_start: number
    }
  | {
      // Student doesn't satisfy a hard prereq for this course, and no
      // admin override exists. The trajectory page surfaces exactly which
      // prereq groups are missing; the solver only needs to drop the
      // request and warn.
      kind: "prereq_not_met"
      student_id: string
      course_id: string
      course_name: string
      request_kind: "core" | "elective" | "alternate"
      missing_prereq_course_ids: string[]
    }
  | {
      // Student is missing a *recommended* prereq for this course. The
      // request still proceeds — the warning is informational so admin
      // can decide whether to talk to the family. (Example: APCSA after
      // APCSP — recommended but not required.)
      kind: "prereq_recommended_missing"
      student_id: string
      course_id: string
      course_name: string
      missing_prereq_course_ids: string[]
    }
  | {
      // Student's availability rules + the periods this course could
      // possibly run in have zero overlap. Surfaces when (for example)
      // Brynn is P1-P4-only and the only qualified teacher for AP CS A
      // is free P5/P6.
      kind: "student_unavailable_all_periods"
      student_id: string
      course_id: string
      course_name: string
      request_kind: "core" | "elective" | "alternate"
    }

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

  // We need to know what calendar year this term anchors to so we can
  // honor `offered_pattern` for alternating-year courses. Pull once,
  // up front; everything else fetches in parallel.
  const { data: term, error: termError } = await supabase
    .from("terms")
    .select("id, academic_year")
    .eq("id", options.term_id)
    .maybeSingle<{ id: string; academic_year: string }>()
  if (termError) throw new Error(termError.message)
  if (!term) throw new Error("Term not found.")
  const termStartYear = parseStartYear(term.academic_year)

  // Pull every input the solver needs in parallel.
  const [
    requestsRes,
    qualificationsRes,
    availabilityRes,
    studentAvailabilityRes,
    workloadRes,
    coursesRes,
    profilesRes,
    prereqsRes,
    overridesRes,
    completedRes,
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
      .from("student_availability")
      .select("student_id, period, available")
      .returns<StudentAvailabilityInput[]>(),
    supabase
      .from("teacher_workload_preferences")
      .select(
        "profile_id, min_periods_per_week, max_periods_per_week, max_consecutive_periods"
      )
      .returns<WorkloadInput[]>(),
    supabase
      .from("courses")
      .select("id, code, name, is_elective, offered_pattern")
      .eq("active", true)
      .returns<CourseInput[]>(),
    supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("active", true)
      .or("roles.cs.{faculty},roles.cs.{admin}")
      .returns<FacultyInput[]>(),
    supabase
      .from("course_prerequisites")
      .select("course_id, prerequisite_course_id, kind, group_key")
      .returns<CoursePrereqInput[]>(),
    supabase
      .from("student_prereq_overrides")
      .select("student_id, course_id")
      .returns<StudentPrereqOverrideInput[]>(),
    supabase
      .from("enrollments")
      .select(
        `student_id, status,
         section:course_sections(
           course_id,
           term:terms(end_date, is_current)
         )`
      )
      .returns<CompletedEnrollmentInput[]>(),
  ])

  if (requestsRes.error) throw new Error(requestsRes.error.message)
  if (qualificationsRes.error) throw new Error(qualificationsRes.error.message)
  if (availabilityRes.error) throw new Error(availabilityRes.error.message)
  if (studentAvailabilityRes.error) throw new Error(studentAvailabilityRes.error.message)
  if (workloadRes.error) throw new Error(workloadRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)
  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (prereqsRes.error) throw new Error(prereqsRes.error.message)
  if (overridesRes.error) throw new Error(overridesRes.error.message)
  if (completedRes.error) throw new Error(completedRes.error.message)

  const requests = requestsRes.data ?? []
  const qualifications = qualificationsRes.data ?? []
  const availability = availabilityRes.data ?? []
  const studentAvailability = studentAvailabilityRes.data ?? []
  const workloads = workloadRes.data ?? []
  const courses = coursesRes.data ?? []
  const faculty = profilesRes.data ?? []
  const prereqs = prereqsRes.data ?? []
  const overrides = overridesRes.data ?? []
  const completedEnrollments = completedRes.data ?? []

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

  // Same shape for students. Default availability = "anything"; only
  // explicit unavailable rows constrain the solver.
  const unavailableByStudent = new Map<string, Set<SectionPeriod>>()
  for (const a of studentAvailability) {
    if (!a.available) {
      const set = unavailableByStudent.get(a.student_id) ?? new Set<SectionPeriod>()
      set.add(a.period)
      unavailableByStudent.set(a.student_id, set)
    }
  }

  // Workload caps. null = no cap. Default cap = 8 periods/week.
  const maxPeriodsByTeacher = new Map<string, number>()
  const maxConsecutiveByTeacher = new Map<string, number>()
  for (const w of workloads) {
    if (typeof w.max_periods_per_week === "number") {
      maxPeriodsByTeacher.set(w.profile_id, w.max_periods_per_week)
    }
    if (typeof w.max_consecutive_periods === "number") {
      maxConsecutiveByTeacher.set(w.profile_id, w.max_consecutive_periods)
    }
  }

  // Bucket prereqs by course (and by group_key within each course so we
  // can evaluate OR-chains: "Calc AB requires Precalc OR Honors Precalc
  // OR AP Precalc" = three rows sharing 'calcab_entry'). A bucket is
  // cleared if ANY of its prerequisite_course_ids appears in the
  // student's completed set. Hard and recommended are bucketed
  // separately so the pre-filter can drop on hard but warn on
  // recommended.
  const hardPrereqsByCourse = new Map<string, Map<string, string[]>>()
  const recommendedPrereqsByCourse = new Map<string, Map<string, string[]>>()
  for (const p of prereqs) {
    const target =
      p.kind === "hard" ? hardPrereqsByCourse : recommendedPrereqsByCourse
    const groups = target.get(p.course_id) ?? new Map<string, string[]>()
    const key = p.group_key ?? `_solo_${p.prerequisite_course_id}`
    const arr = groups.get(key) ?? []
    arr.push(p.prerequisite_course_id)
    groups.set(key, arr)
    target.set(p.course_id, groups)
  }

  // Per-student override set — if course_id is in here, prereqs for that
  // course are waived for that student.
  const overridesByStudent = new Map<string, Set<string>>()
  for (const o of overrides) {
    const set = overridesByStudent.get(o.student_id) ?? new Set<string>()
    set.add(o.course_id)
    overridesByStudent.set(o.student_id, set)
  }

  // Per-student completed course set. Mirrors the trajectory page's
  // logic — past terms in 'completed' or 'enrolled' status, plus
  // current-term in-progress so the kid taking Precalc this spring
  // is treated as having it for next year's Calc AB.
  const todayIso = new Date().toISOString().slice(0, 10)
  const completedByStudent = new Map<string, Set<string>>()
  for (const e of completedEnrollments) {
    const courseId = e.section?.course_id
    if (!courseId) continue
    const t = e.section?.term ?? null
    const isPast = t ? t.end_date < todayIso : false
    const isInProgress = (e.status === "enrolled" || e.status === "audit") && t?.is_current
    if (e.status === "completed" || (isPast && e.status === "enrolled") || isInProgress) {
      const set = completedByStudent.get(e.student_id) ?? new Set<string>()
      set.add(courseId)
      completedByStudent.set(e.student_id, set)
    }
  }

  // Solver state ------------------------------------------------------------

  const warnings: SolverWarning[] = []
  const proposed: ProposedSection[] = []

  // --- Pre-filter: drop requests that can never be fulfilled --------------
  //
  // Course offered_pattern + hard prereqs are hard "no, never" gates: no
  // matter how the greedy pass slices periods, these requests don't
  // belong in section construction at all. Filtering up front keeps the
  // main loop focused and surfaces the exact reason to the admin.

  const droppedCourseIds = new Set<string>()
  const droppedRequestIds = new Set<string>()

  for (const course of courses) {
    if (!isOfferedInStartYear(course.offered_pattern, termStartYear)) {
      droppedCourseIds.add(course.id)
      warnings.push({
        kind: "course_not_offered_this_year",
        course_id: course.id,
        course_name: course.name,
        offered_pattern: course.offered_pattern,
        academic_year_start: termStartYear ?? 0,
      })
    }
  }

  for (const req of requests) {
    if (droppedCourseIds.has(req.course_id)) {
      droppedRequestIds.add(req.id)
      continue
    }
    const course = courseById.get(req.course_id)
    if (!course) continue

    const missingHard = missingGroupedPrereqs({
      studentId: req.student_id,
      courseId: req.course_id,
      groupsByCourse: hardPrereqsByCourse,
      completedByStudent,
      overridesByStudent,
    })
    if (missingHard.length > 0) {
      droppedRequestIds.add(req.id)
      warnings.push({
        kind: "prereq_not_met",
        student_id: req.student_id,
        course_id: req.course_id,
        course_name: course.name,
        request_kind: req.kind,
        missing_prereq_course_ids: missingHard,
      })
      continue
    }

    // Recommended prereqs are informational — admin can talk to the
    // family or override silently. Skip when an admin already granted
    // the override for this (student, course) since they've already
    // signed off.
    if (!overridesByStudent.get(req.student_id)?.has(req.course_id)) {
      const missingRecommended = missingGroupedPrereqs({
        studentId: req.student_id,
        courseId: req.course_id,
        groupsByCourse: recommendedPrereqsByCourse,
        completedByStudent,
        overridesByStudent: new Map(), // we want the raw recommendation, not override-suppressed
      })
      if (missingRecommended.length > 0) {
        warnings.push({
          kind: "prereq_recommended_missing",
          student_id: req.student_id,
          course_id: req.course_id,
          course_name: course.name,
          missing_prereq_course_ids: missingRecommended,
        })
      }
    }
  }

  const eligibleRequests = requests.filter((r) => !droppedRequestIds.has(r.id))

  // Demand: students grouped by course (with their request rows so we know
  // kind + rank). Sorted by (kind preference: core > elective > alternate),
  // then preference_rank ascending, so the greedy pass favors high-priority
  // requests first. Dropped requests are excluded so they never compete
  // for section slots.
  const demandByCourse = new Map<string, RequestInput[]>()
  for (const req of eligibleRequests) {
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
      const maxConsecutive = maxConsecutiveByTeacher.get(teacher.id) ?? null

      // Cap how many sections this teacher can pick up given workload.
      const canTakeMore = () => taken.size < maxLoad

      for (const period of sectionPeriodSchema.options) {
        if (remainingDemand.length === 0) break
        if (!canTakeMore()) break
        if (unavailable.has(period)) continue
        if (taken.has(period)) continue
        if (
          maxConsecutive !== null &&
          wouldBreakConsecutiveCap(taken, period, maxConsecutive)
        ) {
          continue
        }

        // Of the remaining demand, who is free this period AND has capacity?
        // Three filters per student:
        //   1. Period not already taken by another section (existing).
        //   2. Period not blocked by student's availability rules (new).
        //   3. Cap at the section's max size.
        const maxSize = defaultMaxSection
        const studentsForSection: RequestInput[] = []
        for (const req of remainingDemand) {
          if (studentsForSection.length >= maxSize) break
          const studentTaken = studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
          if (studentTaken.has(period)) continue
          const studentBlocked = unavailableByStudent.get(req.student_id)
          if (studentBlocked?.has(period)) continue
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

    // Anyone left over → unfulfilled. Split into two cases for clarity:
    //   - The set of periods the qualified teachers could collectively
    //     cover already excludes everything this student is available
    //     for → it's a student-availability problem, not a "we just
    //     didn't get to it" problem.
    //   - Otherwise, generic unfulfilled (no capacity / no period overlap
    //     with classmates / etc).
    const teachableUnion = new Set<SectionPeriod>()
    for (const tq of teachers) {
      const t = facultyById.get(tq.profile_id)
      if (!t) continue
      const tUnavail = unavailableByTeacher.get(t.id) ?? new Set<SectionPeriod>()
      for (const period of sectionPeriodSchema.options) {
        if (!tUnavail.has(period)) teachableUnion.add(period)
      }
    }

    for (const req of remainingDemand) {
      const studentBlocked =
        unavailableByStudent.get(req.student_id) ?? new Set<SectionPeriod>()
      const overlap = [...teachableUnion].some((p) => !studentBlocked.has(p))
      if (!overlap) {
        warnings.push({
          kind: "student_unavailable_all_periods",
          student_id: req.student_id,
          course_id: courseId,
          course_name: course.name,
          request_kind: req.kind,
        })
        continue
      }
      warnings.push({
        kind: "unfulfilled_request",
        student_id: req.student_id,
        course_id: courseId,
        course_name: course.name,
        request_kind: req.kind,
      })
    }
  }

  // ----- Local search (Pass 2) ---------------------------------------------
  //
  // The greedy first pass leaves cracks: students sometimes go unfulfilled
  // because an earlier course already booked their period, or a section
  // could have held one more body but the greedy didn't loop back. This
  // pass plays "fill the cracks" twice over:
  //
  //   Move A: For each unfulfilled request, try adding the student to an
  //           already-built section of the same course. Free win when
  //           the section has room and the period works.
  //
  //   Move B: For each course still showing >= min_section_size cluster
  //           of unfulfilled students, spawn an additional section in any
  //           (qualified teacher, free period) combination that fits the
  //           cluster. Honors workload + consecutive caps.
  //
  // Each accepted move increments fulfilled count, removes the matching
  // unfulfilled_request warning, and updates the period-tracking maps so
  // subsequent moves see the new state. Both moves only improve the
  // score, so we can run them to fixpoint without risking regression.

  runLocalSearchPass({
    proposed,
    warnings,
    requests,
    demandByCourse,
    studentPeriodTaken,
    teacherPeriodTaken,
    unavailableByTeacher,
    unavailableByStudent,
    maxPeriodsByTeacher,
    maxConsecutiveByTeacher,
    qualifiedTeachersByCourse,
    facultyById,
    courseById,
    courseSectionLetters,
    minSectionSize,
    defaultMaxSection,
  })

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

// ============================================================================
// Pure helpers
// ============================================================================

// "2025-2026" → 2025. Used to decide whether an alternating-year
// course is offered in this term's school year. Returns null when the
// term's academic_year isn't shaped like a year-pair string.
function parseStartYear(academicYear: string | null | undefined): number | null {
  if (!academicYear) return null
  const m = academicYear.match(/^(\d{4})/)
  return m ? parseInt(m[1], 10) : null
}

// Pure: is this course offered in the given start year?
// 'always' / 'manual' always yes. 'odd_start_year' = years 2025, 2027, …
// 'even_start_year' = years 2026, 2028, …
function isOfferedInStartYear(
  pattern: CourseOfferedPattern,
  year: number | null
): boolean {
  if (pattern === "always" || pattern === "manual") return true
  if (year === null) return true // can't tell; assume yes rather than blocking
  if (pattern === "odd_start_year") return year % 2 === 1
  if (pattern === "even_start_year") return year % 2 === 0
  return true
}

// Pure: "consecutive" applies to the regular daily periods 1-6. Friday
// electives + async aren't part of the back-to-back chain (different
// days / no fixed time), so they're excluded from the count.
const consecutiveSequence: SectionPeriod[] = [
  "period_1",
  "period_2",
  "period_3",
  "period_4",
  "period_5",
  "period_6",
]

// Pure: would adding `candidate` to `currentTaken` create a contiguous
// run of period_1..period_6 exceeding `max`? Returns true if the cap
// would be broken.
function wouldBreakConsecutiveCap(
  currentTaken: Set<SectionPeriod>,
  candidate: SectionPeriod,
  max: number
): boolean {
  if (!consecutiveSequence.includes(candidate)) return false
  const proposed = new Set(currentTaken)
  proposed.add(candidate)
  let run = 0
  let longest = 0
  for (const p of consecutiveSequence) {
    if (proposed.has(p)) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }
  return longest > max
}

// Mutates the supplied solver state to improve the greedy result.
// Two phases:
//
//   Phase 1 (deterministic, monotonic): repeatedly applies cheap
//   moves until none improve the schedule. Each move only ADDS
//   fulfillment or keeps things the same — safe to run to fixpoint.
//
//     - Move A (fill-cracks): drop an unfulfilled student into an
//       existing section of the same course where they fit.
//     - Move B (spawn-extra): spawn a new section for a >= min
//       cluster of unfulfilled students.
//     - Move C (swap-to-free): for an unfulfilled request blocked by
//       a period conflict, try moving the student between sections
//       of the conflicting course so the wanted section opens up.
//     - Move D (period rebalance): try shifting an existing section
//       to a different period if all current students stay AND new
//       unfulfilled students can join at the new period.
//
//   Phase 2 (iterated local search): "kick" the schedule by removing
//   the lowest-value section, then re-run Phase 1. If the new score
//   beats the old one, keep it; otherwise revert. Lets us escape
//   simple local optima without the full machinery of simulated
//   annealing — which is overkill for HBA's ~50-student size but
//   useful when the greedy + monotonic passes get stuck.
function runLocalSearchPass(state: LocalSearchState): void {
  runDeterministicPhase(state)

  // Iterated local search: try up to a handful of "remove a section,
  // re-relax" kicks. Bounded because each kick + relax is O(courses ×
  // periods × demand) and we want the solver to stay snappy.
  const MAX_KICKS = 8
  for (let i = 0; i < MAX_KICKS; i++) {
    const accepted = tryKickAndRelax(state)
    if (!accepted) break
  }
}

type LocalSearchState = {
  proposed: ProposedSection[]
  warnings: SolverWarning[]
  requests: RequestInput[]
  demandByCourse: Map<string, RequestInput[]>
  studentPeriodTaken: Map<string, Set<SectionPeriod>>
  teacherPeriodTaken: Map<string, Set<SectionPeriod>>
  unavailableByTeacher: Map<string, Set<SectionPeriod>>
  unavailableByStudent: Map<string, Set<SectionPeriod>>
  maxPeriodsByTeacher: Map<string, number>
  maxConsecutiveByTeacher: Map<string, number>
  qualifiedTeachersByCourse: Map<string, QualificationInput[]>
  facultyById: Map<string, FacultyInput>
  courseById: Map<string, CourseInput>
  courseSectionLetters: Map<string, number>
  minSectionSize: number
  defaultMaxSection: number
}

function runDeterministicPhase(state: LocalSearchState): void {
  const MAX_ITERATIONS = 100
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const a = moveAFillCracks(state)
    const b = moveBSpawnExtra(state)
    const c = moveCSwapToFreeSlot(state)
    const d = moveDRebalancePeriod(state)
    if (!a && !b && !c && !d) break
  }
}

// Returns the indices in `warnings` of pending unfulfilled_request rows
// for which a still-pending request exists. (Once we accept a move
// that fulfills a request, we splice the warning out so it won't be
// considered again.)
function findUnfulfilledIndices(
  warnings: SolverWarning[]
): Array<{ index: number; warning: Extract<SolverWarning, { kind: "unfulfilled_request" }> }> {
  const out: ReturnType<typeof findUnfulfilledIndices> = []
  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i]
    if (w.kind === "unfulfilled_request") {
      out.push({ index: i, warning: w })
    }
  }
  return out
}

function moveAFillCracks(state: Parameters<typeof runLocalSearchPass>[0]): boolean {
  const {
    proposed,
    warnings,
    requests,
    studentPeriodTaken,
    unavailableByStudent,
    defaultMaxSection,
  } = state

  const requestByKey = new Map(
    requests.map((r) => [`${r.student_id}|${r.course_id}`, r])
  )

  let didAnything = false

  // Walk unfulfilled in reverse so splicing doesn't shift the indices
  // we still need to read.
  const unfulfilled = findUnfulfilledIndices(warnings)
  for (let i = unfulfilled.length - 1; i >= 0; i--) {
    const { index, warning } = unfulfilled[i]
    const req = requestByKey.get(`${warning.student_id}|${warning.course_id}`)
    if (!req) continue

    for (const section of proposed) {
      if (section.course_id !== warning.course_id) continue
      if (section.period === null) continue
      if (section.student_ids.length >= defaultMaxSection) continue
      if (section.student_ids.includes(warning.student_id)) continue

      const period = section.period
      const studentTaken =
        studentPeriodTaken.get(warning.student_id) ?? new Set<SectionPeriod>()
      if (studentTaken.has(period)) continue
      const studentBlocked = unavailableByStudent.get(warning.student_id)
      if (studentBlocked?.has(period)) continue

      // Commit the addition.
      section.student_ids.push(warning.student_id)
      section.fulfilled_request_by_student[warning.student_id] = req.id
      studentTaken.add(period)
      studentPeriodTaken.set(warning.student_id, studentTaken)
      warnings.splice(index, 1)
      didAnything = true
      break
    }
  }

  return didAnything
}

function moveBSpawnExtra(state: Parameters<typeof runLocalSearchPass>[0]): boolean {
  const {
    proposed,
    warnings,
    requests,
    studentPeriodTaken,
    teacherPeriodTaken,
    unavailableByTeacher,
    unavailableByStudent,
    maxPeriodsByTeacher,
    maxConsecutiveByTeacher,
    qualifiedTeachersByCourse,
    facultyById,
    courseById,
    courseSectionLetters,
    minSectionSize,
    defaultMaxSection,
  } = state

  // Bucket unfulfilled requests by course_id so we can look for clusters.
  const requestByKey = new Map(
    requests.map((r) => [`${r.student_id}|${r.course_id}`, r])
  )
  const clustersByCourse = new Map<string, RequestInput[]>()
  for (const w of warnings) {
    if (w.kind !== "unfulfilled_request") continue
    const req = requestByKey.get(`${w.student_id}|${w.course_id}`)
    if (!req) continue
    const arr = clustersByCourse.get(w.course_id) ?? []
    arr.push(req)
    clustersByCourse.set(w.course_id, arr)
  }

  let didAnything = false

  for (const [courseId, cluster] of clustersByCourse.entries()) {
    if (cluster.length < minSectionSize) continue
    const course = courseById.get(courseId)
    if (!course) continue
    const teachers = qualifiedTeachersByCourse.get(courseId) ?? []

    for (const tq of teachers) {
      const teacher = facultyById.get(tq.profile_id)
      if (!teacher) continue
      const taken = teacherPeriodTaken.get(teacher.id) ?? new Set<SectionPeriod>()
      const unavail = unavailableByTeacher.get(teacher.id) ?? new Set<SectionPeriod>()
      const maxLoad = maxPeriodsByTeacher.get(teacher.id) ?? sectionPeriodSchema.options.length
      const maxConsec = maxConsecutiveByTeacher.get(teacher.id) ?? null

      if (taken.size >= maxLoad) continue

      for (const period of sectionPeriodSchema.options) {
        if (taken.has(period)) continue
        if (unavail.has(period)) continue
        if (maxConsec !== null && wouldBreakConsecutiveCap(taken, period, maxConsec)) continue

        const eligible: RequestInput[] = []
        for (const req of cluster) {
          if (eligible.length >= defaultMaxSection) break
          const studentTaken =
            studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
          if (studentTaken.has(period)) continue
          const studentBlocked = unavailableByStudent.get(req.student_id)
          if (studentBlocked?.has(period)) continue
          eligible.push(req)
        }

        if (eligible.length < minSectionSize) continue

        // Commit a new section.
        const letterIdx = courseSectionLetters.get(courseId) ?? 0
        const sectionCode =
          letterIdx === 0 ? null : String.fromCharCode(65 + letterIdx)
        courseSectionLetters.set(courseId, letterIdx + 1)

        const fulfilled: Record<string, string> = {}
        const studentIds: string[] = []
        const eligibleStudentIdSet = new Set<string>()
        for (const req of eligible) {
          const studentTaken =
            studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
          studentTaken.add(period)
          studentPeriodTaken.set(req.student_id, studentTaken)
          fulfilled[req.student_id] = req.id
          studentIds.push(req.student_id)
          eligibleStudentIdSet.add(req.student_id)
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

        // Remove the now-fulfilled unfulfilled_request warnings.
        for (let i = warnings.length - 1; i >= 0; i--) {
          const w = warnings[i]
          if (
            w.kind === "unfulfilled_request" &&
            w.course_id === courseId &&
            eligibleStudentIdSet.has(w.student_id)
          ) {
            warnings.splice(i, 1)
          }
        }

        // Strip placed students from the cluster so the next period
        // iteration doesn't double-count them.
        const remaining = cluster.filter(
          (r) => !eligibleStudentIdSet.has(r.student_id)
        )
        clustersByCourse.set(courseId, remaining)
        didAnything = true

        if (remaining.length < minSectionSize) break
      }

      const remainingAfterTeacher = clustersByCourse.get(courseId) ?? []
      if (remainingAfterTeacher.length < minSectionSize) break
    }
  }

  return didAnything
}

// Move C: an unfulfilled request for course X is blocked because
// student S' is already booked at the period an X-section runs in,
// for some other course Y. If there's another section of Y in a
// period S' can attend, move S' between Y's sections so X's period
// opens up. Only triggers when both sides of the swap are legal (no
// availability blocks, no max-size overruns).
function moveCSwapToFreeSlot(state: LocalSearchState): boolean {
  const {
    proposed,
    warnings,
    requests,
    studentPeriodTaken,
    unavailableByStudent,
    defaultMaxSection,
  } = state

  const requestByKey = new Map(
    requests.map((r) => [`${r.student_id}|${r.course_id}`, r])
  )

  // Build lookups fresh; the previous moves may have mutated state.
  const sectionsByCourse = new Map<string, ProposedSection[]>()
  for (const s of proposed) {
    const arr = sectionsByCourse.get(s.course_id) ?? []
    arr.push(s)
    sectionsByCourse.set(s.course_id, arr)
  }

  let didAnything = false
  const unfulfilled = findUnfulfilledIndices(warnings)

  for (let i = unfulfilled.length - 1; i >= 0; i--) {
    const { index, warning } = unfulfilled[i]
    const sPrime = warning.student_id
    const X = warning.course_id

    const xSections = sectionsByCourse.get(X) ?? []
    if (xSections.length === 0) continue

    let acceptedThisWarning = false

    for (const xSection of xSections) {
      if (acceptedThisWarning) break
      if (xSection.period === null) continue
      if (xSection.student_ids.length >= defaultMaxSection) continue
      if (xSection.student_ids.includes(sPrime)) continue

      const P = xSection.period
      if (unavailableByStudent.get(sPrime)?.has(P)) continue

      const sPrimeTaken =
        studentPeriodTaken.get(sPrime) ?? new Set<SectionPeriod>()
      if (!sPrimeTaken.has(P)) {
        // Free at P. Either pass A should have handled it (room ran
        // out by the time A walked over) or the section is full. In
        // either case the swap algorithm has nothing to do here.
        continue
      }

      // Find the section that owns S' at period P.
      const conflictingSection = proposed.find(
        (s) =>
          s.period === P &&
          s.course_id !== X &&
          s.student_ids.includes(sPrime)
      )
      if (!conflictingSection) continue

      const Y = conflictingSection.course_id

      // Try every alternative Y section to move S' into.
      const yAlternatives = (sectionsByCourse.get(Y) ?? []).filter(
        (s) => s !== conflictingSection
      )

      for (const yAlt of yAlternatives) {
        if (yAlt.period === null) continue
        if (yAlt.student_ids.length >= defaultMaxSection) continue
        if (yAlt.student_ids.includes(sPrime)) continue
        const Q = yAlt.period
        if (unavailableByStudent.get(sPrime)?.has(Q)) continue
        if (sPrimeTaken.has(Q)) continue

        // Execute the swap: pull S' from conflictingSection, push
        // into yAlt, and add S' to xSection at P.
        removeStudentFromSection(conflictingSection, sPrime)
        addStudentToSection(yAlt, sPrime, requestByKey)
        addStudentToSection(xSection, sPrime, requestByKey)

        sPrimeTaken.delete(P)
        // P stays taken because xSection now has S'.
        sPrimeTaken.add(P)
        // Q is now taken by yAlt.
        sPrimeTaken.add(Q)
        studentPeriodTaken.set(sPrime, sPrimeTaken)

        warnings.splice(index, 1)
        didAnything = true
        acceptedThisWarning = true
        break
      }
    }
  }

  return didAnything
}

// Helper: pull `studentId` out of `section`'s student_ids +
// fulfilled_request_by_student. Doesn't touch the period-tracking
// maps; the caller updates those.
function removeStudentFromSection(
  section: ProposedSection,
  studentId: string
): void {
  const idx = section.student_ids.indexOf(studentId)
  if (idx >= 0) section.student_ids.splice(idx, 1)
  delete section.fulfilled_request_by_student[studentId]
}

// Helper: append `studentId` into `section`'s student_ids + look up
// the matching request and record it in fulfilled_request_by_student.
function addStudentToSection(
  section: ProposedSection,
  studentId: string,
  requestByKey: Map<string, RequestInput>
): void {
  if (section.student_ids.includes(studentId)) return
  section.student_ids.push(studentId)
  const req = requestByKey.get(`${studentId}|${section.course_id}`)
  if (req) {
    section.fulfilled_request_by_student[studentId] = req.id
  }
}

// Move D: try shifting an existing section to a different period that
// strictly improves coverage. The candidate period has to (a) be free
// for the teacher (excluding this section's current slot), (b) keep
// every current student attending (no one gets kicked), and (c)
// unlock at least one new unfulfilled student for the course. The
// strict-improvement framing means accepting a move never regresses.
function moveDRebalancePeriod(state: LocalSearchState): boolean {
  const {
    proposed,
    warnings,
    requests,
    studentPeriodTaken,
    teacherPeriodTaken,
    unavailableByTeacher,
    unavailableByStudent,
    maxConsecutiveByTeacher,
    facultyById,
    defaultMaxSection,
  } = state

  const requestByKey = new Map(
    requests.map((r) => [`${r.student_id}|${r.course_id}`, r])
  )

  // Pre-bucket unfulfilled per course.
  const unfulfilledByCourse = new Map<string, RequestInput[]>()
  for (const w of warnings) {
    if (w.kind !== "unfulfilled_request") continue
    const req = requestByKey.get(`${w.student_id}|${w.course_id}`)
    if (!req) continue
    const arr = unfulfilledByCourse.get(w.course_id) ?? []
    arr.push(req)
    unfulfilledByCourse.set(w.course_id, arr)
  }

  let didAnything = false

  for (const section of proposed) {
    if (section.period === null) continue
    if (!section.teacher_profile_id) continue
    const teacher = facultyById.get(section.teacher_profile_id)
    if (!teacher) continue

    const courseUnfulfilled = unfulfilledByCourse.get(section.course_id) ?? []
    if (courseUnfulfilled.length === 0) continue

    const currentPeriod = section.period
    const teacherTaken =
      teacherPeriodTaken.get(teacher.id) ?? new Set<SectionPeriod>()
    const teacherUnavail =
      unavailableByTeacher.get(teacher.id) ?? new Set<SectionPeriod>()
    const maxConsec = maxConsecutiveByTeacher.get(teacher.id) ?? null

    for (const candidate of sectionPeriodSchema.options) {
      if (candidate === currentPeriod) continue
      if (teacherUnavail.has(candidate)) continue

      // Teacher has to be free at the candidate AFTER releasing this
      // section's current slot. Build a temp set that simulates that.
      const teacherSimulated = new Set(teacherTaken)
      teacherSimulated.delete(currentPeriod)
      if (teacherSimulated.has(candidate)) continue
      if (
        maxConsec !== null &&
        wouldBreakConsecutiveCap(teacherSimulated, candidate, maxConsec)
      ) {
        continue
      }

      // Every existing student has to be able to attend at `candidate`
      // without conflicting with their other sections (excluding this one).
      let allStay = true
      for (const sid of section.student_ids) {
        if (unavailableByStudent.get(sid)?.has(candidate)) {
          allStay = false
          break
        }
        const sTaken =
          studentPeriodTaken.get(sid) ?? new Set<SectionPeriod>()
        if (sTaken.has(candidate) && !sTaken.has(currentPeriod)) {
          // Shouldn't happen — they should have currentPeriod
          // because they're in this section — but guard anyway.
          allStay = false
          break
        }
        if (
          sTaken.has(candidate) &&
          sTaken.has(currentPeriod) &&
          candidate !== currentPeriod
        ) {
          // They're already booked at both — moving this section to
          // candidate would mean they're double-booked at candidate.
          // The double-book at currentPeriod can't happen except via
          // section reassignment, so this branch is defensive.
          allStay = false
          break
        }
      }
      if (!allStay) continue

      // How many unfulfilled students could join at candidate?
      const room = defaultMaxSection - section.student_ids.length
      const joiners: RequestInput[] = []
      for (const req of courseUnfulfilled) {
        if (joiners.length >= room) break
        if (unavailableByStudent.get(req.student_id)?.has(candidate)) continue
        const sTaken =
          studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
        if (sTaken.has(candidate)) continue
        joiners.push(req)
      }
      if (joiners.length === 0) continue

      // Commit the period move + new students.
      teacherTaken.delete(currentPeriod)
      teacherTaken.add(candidate)
      teacherPeriodTaken.set(teacher.id, teacherTaken)

      for (const sid of section.student_ids) {
        const sTaken =
          studentPeriodTaken.get(sid) ?? new Set<SectionPeriod>()
        sTaken.delete(currentPeriod)
        sTaken.add(candidate)
        studentPeriodTaken.set(sid, sTaken)
      }

      section.period = candidate

      const joinedIds = new Set<string>()
      for (const req of joiners) {
        addStudentToSection(section, req.student_id, requestByKey)
        const sTaken =
          studentPeriodTaken.get(req.student_id) ?? new Set<SectionPeriod>()
        sTaken.add(candidate)
        studentPeriodTaken.set(req.student_id, sTaken)
        joinedIds.add(req.student_id)
      }

      // Remove their unfulfilled_request warnings.
      for (let i = warnings.length - 1; i >= 0; i--) {
        const w = warnings[i]
        if (
          w.kind === "unfulfilled_request" &&
          w.course_id === section.course_id &&
          joinedIds.has(w.student_id)
        ) {
          warnings.splice(i, 1)
        }
      }

      didAnything = true
      break // one rebalance per section per outer iteration
    }
  }

  return didAnything
}

// Iterated local search: snapshot the state, remove the
// lowest-value section, re-run the deterministic phase, and accept
// the result only if the new score beats the snapshot. Helps escape
// local optima where a sacrificial below_min section is blocking a
// teacher's slot that a better section could use.
function tryKickAndRelax(state: LocalSearchState): boolean {
  if (state.proposed.length === 0) return false

  const baseline = scoreState(state)
  const snapshot = snapshotLocalSearchState(state)

  // Pick the lowest-value section. "Value" prefers small + below_min +
  // alternates-only — these are the most likely to be displacing a
  // better section.
  let targetIdx = -1
  let lowest = Infinity
  for (let i = 0; i < state.proposed.length; i++) {
    const s = state.proposed[i]
    let v = s.student_ids.length
    if (s.student_ids.length < state.minSectionSize) v -= 5
    state.requests.forEach((r) => {
      if (s.fulfilled_request_by_student[r.student_id] === r.id) {
        if (r.kind === "alternate") v -= 2
        if (r.kind === "elective") v -= 1
      }
    })
    if (v < lowest) {
      lowest = v
      targetIdx = i
    }
  }
  if (targetIdx === -1) return false

  // Remove the chosen section, freeing every student's period + the
  // teacher's period, and re-add their requests to the relevant
  // unfulfilled_request warnings.
  removeSectionInPlace(state, targetIdx)

  runDeterministicPhase(state)

  const newScore = scoreState(state)
  if (newScore > baseline) {
    return true
  }
  // Worse or same — revert.
  restoreLocalSearchState(state, snapshot)
  return false
}

function scoreState(state: LocalSearchState): number {
  return computeScore({
    sections: state.proposed,
    requests: state.requests,
    warnings: state.warnings,
    minSectionSize: state.minSectionSize,
  })
}

// Mutates `state` to remove the section at index `idx`. Restores the
// students it held back to "unfulfilled_request" warnings (the
// deterministic phase will try to re-place them in something better)
// and clears the teacher's hold on the period.
function removeSectionInPlace(state: LocalSearchState, idx: number): void {
  const section = state.proposed[idx]
  if (!section) return
  if (section.period !== null) {
    if (section.teacher_profile_id) {
      const tTaken = state.teacherPeriodTaken.get(section.teacher_profile_id)
      tTaken?.delete(section.period)
    }
    for (const sid of section.student_ids) {
      const sTaken = state.studentPeriodTaken.get(sid)
      sTaken?.delete(section.period)
    }
  }

  const course = state.courseById.get(section.course_id)
  if (course) {
    for (const sid of section.student_ids) {
      const reqId = section.fulfilled_request_by_student[sid]
      const req = reqId
        ? state.requests.find((r) => r.id === reqId)
        : state.requests.find(
            (r) => r.student_id === sid && r.course_id === section.course_id
          )
      if (req) {
        state.warnings.push({
          kind: "unfulfilled_request",
          student_id: sid,
          course_id: section.course_id,
          course_name: course.name,
          request_kind: req.kind,
        })
      }
    }
  }

  state.proposed.splice(idx, 1)
}

// Snapshot / restore for the iterated-local-search rollback. Cheap
// for HBA-size schedules (low hundreds of section + student rows).
type LocalSearchSnapshot = {
  proposed: ProposedSection[]
  warnings: SolverWarning[]
  studentPeriodTaken: Map<string, Set<SectionPeriod>>
  teacherPeriodTaken: Map<string, Set<SectionPeriod>>
  courseSectionLetters: Map<string, number>
}

function snapshotLocalSearchState(
  state: LocalSearchState
): LocalSearchSnapshot {
  return {
    proposed: state.proposed.map((s) => ({
      ...s,
      student_ids: [...s.student_ids],
      fulfilled_request_by_student: { ...s.fulfilled_request_by_student },
    })),
    warnings: state.warnings.map((w) => ({ ...w })),
    studentPeriodTaken: cloneMapOfSets(state.studentPeriodTaken),
    teacherPeriodTaken: cloneMapOfSets(state.teacherPeriodTaken),
    courseSectionLetters: new Map(state.courseSectionLetters),
  }
}

function restoreLocalSearchState(
  state: LocalSearchState,
  snap: LocalSearchSnapshot
): void {
  state.proposed.length = 0
  for (const s of snap.proposed) state.proposed.push(s)
  state.warnings.length = 0
  for (const w of snap.warnings) state.warnings.push(w)
  state.studentPeriodTaken.clear()
  for (const [k, v] of snap.studentPeriodTaken) state.studentPeriodTaken.set(k, v)
  state.teacherPeriodTaken.clear()
  for (const [k, v] of snap.teacherPeriodTaken) state.teacherPeriodTaken.set(k, v)
  state.courseSectionLetters.clear()
  for (const [k, v] of snap.courseSectionLetters) {
    state.courseSectionLetters.set(k, v)
  }
}

function cloneMapOfSets<K, V>(src: Map<K, Set<V>>): Map<K, Set<V>> {
  const out = new Map<K, Set<V>>()
  for (const [k, v] of src) out.set(k, new Set(v))
  return out
}

// Pure: which prereq alternatives for `courseId` (from the supplied
// grouped map — either hard or recommended) is `studentId` still
// missing? An OR-group (rows sharing a non-null group_key) is cleared
// if ANY member is in completed. Standalone prereqs (group_key null)
// must each be cleared individually. Returns the flat list of course
// IDs the trajectory / admin needs to know about — UI groups them by
// the original group_key for display.
function missingGroupedPrereqs(input: {
  studentId: string
  courseId: string
  groupsByCourse: Map<string, Map<string, string[]>>
  completedByStudent: Map<string, Set<string>>
  overridesByStudent: Map<string, Set<string>>
}): string[] {
  if (input.overridesByStudent.get(input.studentId)?.has(input.courseId)) {
    return []
  }
  const groups = input.groupsByCourse.get(input.courseId)
  if (!groups || groups.size === 0) return []
  const completed = input.completedByStudent.get(input.studentId) ?? new Set<string>()
  const missing: string[] = []
  for (const alternatives of groups.values()) {
    const anySatisfied = alternatives.some((c) => completed.has(c))
    if (anySatisfied) continue
    for (const c of alternatives) {
      if (!missing.includes(c)) missing.push(c)
    }
  }
  return missing
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
  // unfulfilled_request covers the "we ran out of room / periods didn't
  // line up" cases; prereq_not_met and student_unavailable_all_periods
  // also represent un-scheduled requests and deserve the same penalty
  // so the score reflects actual fulfillment.
  for (const warning of input.warnings) {
    if (
      warning.kind !== "unfulfilled_request" &&
      warning.kind !== "prereq_not_met" &&
      warning.kind !== "student_unavailable_all_periods"
    ) {
      continue
    }
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
