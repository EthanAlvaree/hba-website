// lib/scheduler.ts
//
// Schedule-builder data layer. This file holds the read/write helpers for
// the tables that drive the solver: teacher qualifications, teacher
// availability, teacher workload preferences, graduation requirements,
// course→subject mapping, and student course requests.
//
// The solver itself lives in a future module; for now we just need to
// collect the inputs.

import { z } from "zod"
import { siteConfig } from "@/lib/site"
import { sectionPeriodSchema, type SectionPeriod } from "@/lib/sis"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

// ============================================================================
// Teacher qualifications
// ============================================================================

export type TeacherQualificationRecord = {
  id: string
  created_at: string
  updated_at: string
  profile_id: string
  course_id: string
  preference_rank: number
  notes: string | null
}

const teacherQualificationColumns =
  "id, created_at, updated_at, profile_id, course_id, preference_rank, notes"

export type TeacherQualificationWithCourse = TeacherQualificationRecord & {
  course: { id: string; code: string; name: string; subject: string | null } | null
}

export async function listTeacherQualifications(
  profileId: string
): Promise<TeacherQualificationWithCourse[]> {
  const { data, error } = await getSupabase()
    .from("teacher_qualifications")
    .select(
      `${teacherQualificationColumns}, course:courses(id, code, name, subject)`
    )
    .eq("profile_id", profileId)
    .order("preference_rank", { ascending: true })
    .returns<TeacherQualificationWithCourse[]>()

  if (error) {
    throw new Error(`Failed to list teacher qualifications: ${error.message}`)
  }
  return data
}

export const teacherQualificationUpsertSchema = z.object({
  profile_id: z.uuid(),
  course_id: z.uuid(),
  preference_rank: z.coerce.number().int().min(1).default(1),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type TeacherQualificationUpsertInput = z.infer<typeof teacherQualificationUpsertSchema>

export async function upsertTeacherQualification(
  input: TeacherQualificationUpsertInput
): Promise<TeacherQualificationRecord> {
  const { data, error } = await getSupabase()
    .from("teacher_qualifications")
    .upsert(input, { onConflict: "profile_id,course_id" })
    .select(teacherQualificationColumns)
    .single<TeacherQualificationRecord>()

  if (error) {
    throw new Error(`Failed to upsert teacher qualification: ${error.message}`)
  }
  return data
}

// Bulk-rewrites preference_rank for every (profile_id, course_id) in the
// given order: index 0 -> rank 1, index 1 -> rank 2, etc. Used by the
// drag-to-rearrange UI on /faculty-portal/teaching. Silently no-ops if
// a course_id in the input doesn't have an existing qualification (the
// drag UI never produces these, but defensive).
export async function setTeacherQualificationOrder(input: {
  profile_id: string
  ordered_course_ids: string[]
}): Promise<void> {
  const supabase = getSupabase()
  for (let i = 0; i < input.ordered_course_ids.length; i += 1) {
    const courseId = input.ordered_course_ids[i]
    const rank = i + 1
    const { error } = await supabase
      .from("teacher_qualifications")
      .update({ preference_rank: rank })
      .eq("profile_id", input.profile_id)
      .eq("course_id", courseId)
    if (error) {
      throw new Error(
        `Failed to update rank for course ${courseId}: ${error.message}`
      )
    }
  }
}

export async function deleteTeacherQualification(input: {
  profile_id: string
  course_id: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("teacher_qualifications")
    .delete()
    .eq("profile_id", input.profile_id)
    .eq("course_id", input.course_id)

  if (error) {
    throw new Error(`Failed to delete teacher qualification: ${error.message}`)
  }
}

// ============================================================================
// Teacher availability
// ============================================================================

export type TeacherAvailabilityRecord = {
  id: string
  created_at: string
  updated_at: string
  profile_id: string
  period: SectionPeriod
  available: boolean
  notes: string | null
}

const teacherAvailabilityColumns =
  "id, created_at, updated_at, profile_id, period, available, notes"

export async function listTeacherAvailability(
  profileId: string
): Promise<TeacherAvailabilityRecord[]> {
  const { data, error } = await getSupabase()
    .from("teacher_availability")
    .select(teacherAvailabilityColumns)
    .eq("profile_id", profileId)
    .returns<TeacherAvailabilityRecord[]>()

  if (error) {
    throw new Error(`Failed to list teacher availability: ${error.message}`)
  }
  return data
}

// Pre-fills a Map<period, available> with every period defaulting to true.
// Lets the UI render a complete grid without nulls.
export function buildAvailabilityMap(
  records: TeacherAvailabilityRecord[]
): Map<SectionPeriod, boolean> {
  const map = new Map<SectionPeriod, boolean>()
  for (const period of sectionPeriodSchema.options) {
    map.set(period, true) // default = available
  }
  for (const record of records) {
    map.set(record.period, record.available)
  }
  return map
}

export const teacherAvailabilityBatchSchema = z.object({
  profile_id: z.uuid(),
  entries: z.array(
    z.object({
      period: sectionPeriodSchema,
      available: z.coerce.boolean(),
    })
  ),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type TeacherAvailabilityBatchInput = z.infer<typeof teacherAvailabilityBatchSchema>

// Upserts every period row for a teacher in one call. Simpler than letting
// the UI toggle each period independently; one form save covers all 9.
export async function saveTeacherAvailability(
  input: TeacherAvailabilityBatchInput
): Promise<void> {
  const supabase = getSupabase()
  const rows = input.entries.map((entry) => ({
    profile_id: input.profile_id,
    period: entry.period,
    available: entry.available,
    notes: input.notes,
  }))

  const { error } = await supabase
    .from("teacher_availability")
    .upsert(rows, { onConflict: "profile_id,period" })

  if (error) {
    throw new Error(`Failed to save availability: ${error.message}`)
  }
}

// ============================================================================
// Student availability (mirrors teacher_availability)
// ============================================================================

export type StudentAvailabilityRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  period: SectionPeriod
  available: boolean
  notes: string | null
}

const studentAvailabilityColumns =
  "id, created_at, updated_at, student_id, period, available, notes"

export async function listStudentAvailability(
  studentId: string
): Promise<StudentAvailabilityRecord[]> {
  const { data, error } = await getSupabase()
    .from("student_availability")
    .select(studentAvailabilityColumns)
    .eq("student_id", studentId)
    .returns<StudentAvailabilityRecord[]>()

  if (error) {
    throw new Error(`Failed to list student availability: ${error.message}`)
  }
  return data
}

export function buildStudentAvailabilityMap(
  records: StudentAvailabilityRecord[]
): Map<SectionPeriod, boolean> {
  const map = new Map<SectionPeriod, boolean>()
  for (const period of sectionPeriodSchema.options) {
    map.set(period, true) // default = available
  }
  for (const record of records) {
    map.set(record.period, record.available)
  }
  return map
}

export const studentAvailabilityBatchSchema = z.object({
  student_id: z.uuid(),
  entries: z.array(
    z.object({
      period: sectionPeriodSchema,
      available: z.coerce.boolean(),
    })
  ),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type StudentAvailabilityBatchInput = z.infer<
  typeof studentAvailabilityBatchSchema
>

export async function saveStudentAvailability(
  input: StudentAvailabilityBatchInput
): Promise<void> {
  const supabase = getSupabase()
  const rows = input.entries.map((entry) => ({
    student_id: input.student_id,
    period: entry.period,
    available: entry.available,
    notes: input.notes,
  }))

  const { error } = await supabase
    .from("student_availability")
    .upsert(rows, { onConflict: "student_id,period" })

  if (error) {
    throw new Error(`Failed to save student availability: ${error.message}`)
  }
}

// ============================================================================
// Teacher workload preferences
// ============================================================================

export type TeacherWorkloadRecord = {
  profile_id: string
  created_at: string
  updated_at: string
  min_periods_per_week: number | null
  max_periods_per_week: number | null
  max_consecutive_periods: number | null
  notes: string | null
}

const teacherWorkloadColumns =
  "profile_id, created_at, updated_at, min_periods_per_week, max_periods_per_week, max_consecutive_periods, notes"

export async function getTeacherWorkload(
  profileId: string
): Promise<TeacherWorkloadRecord | null> {
  const { data, error } = await getSupabase()
    .from("teacher_workload_preferences")
    .select(teacherWorkloadColumns)
    .eq("profile_id", profileId)
    .maybeSingle<TeacherWorkloadRecord>()

  if (error) {
    throw new Error(`Failed to load workload preferences: ${error.message}`)
  }
  return data
}

const nullableNumber = () =>
  z
    .union([z.coerce.number().int().min(0), z.literal(""), z.null()])
    .optional()
    .transform((value) =>
      value === "" || value === null || value === undefined ? null : value
    )

export const teacherWorkloadUpsertSchema = z
  .object({
    profile_id: z.uuid(),
    min_periods_per_week: nullableNumber(),
    max_periods_per_week: nullableNumber(),
    max_consecutive_periods: z
      .union([z.coerce.number().int().min(1), z.literal(""), z.null()])
      .optional()
      .transform((value) =>
        value === "" || value === null || value === undefined ? null : value
      ),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .refine(
    (data) =>
      data.min_periods_per_week === null ||
      data.max_periods_per_week === null ||
      data.min_periods_per_week <= data.max_periods_per_week,
    {
      message: "Min periods per week must be ≤ max.",
      path: ["max_periods_per_week"],
    }
  )
export type TeacherWorkloadUpsertInput = z.infer<typeof teacherWorkloadUpsertSchema>

export async function upsertTeacherWorkload(
  input: TeacherWorkloadUpsertInput
): Promise<TeacherWorkloadRecord> {
  const { data, error } = await getSupabase()
    .from("teacher_workload_preferences")
    .upsert(input, { onConflict: "profile_id" })
    .select(teacherWorkloadColumns)
    .single<TeacherWorkloadRecord>()

  if (error) {
    throw new Error(`Failed to upsert workload preferences: ${error.message}`)
  }
  return data
}

// ============================================================================
// Graduation requirements
// ============================================================================

// Canonical subject-area identifiers. Stored in the DB as-is; the
// trajectory UI + admin pages render them via subjectAreaLabel().
// Keep in sync with migration 0032's seed.
//
// A course can belong to several of these at once (many-to-many).
// 'elective' is special: a course's membership in 'elective' is what
// makes it Friday-elective-only in the scheduler. Removing it from
// 'elective' makes it weekday-schedulable.
export const subjectAreas = [
  "english",
  "math",
  "science",
  "social_studies",
  "world_languages",
  "visual_performing_arts",
  "physical_education",
  "computer_science",
  "elective",
] as const
export type SubjectArea = (typeof subjectAreas)[number]

export const subjectAreaLabels: Record<SubjectArea, string> = {
  english: "English",
  math: "Math",
  science: "Science",
  social_studies: "Social studies",
  world_languages: "World languages",
  visual_performing_arts: "Visual & performing arts",
  physical_education: "Physical education",
  computer_science: "Computer science",
  elective: "Elective",
}

export function subjectAreaLabel(value: string): string {
  return (subjectAreaLabels as Record<string, string>)[value] ?? value
}

// The subject area whose membership flags a course as Friday-elective-
// only for the scheduler. Single source of truth so the page UI and
// the solver agree.
export const ELECTIVE_SUBJECT_AREA: SubjectArea = "elective"

// One row per subject area. required_credits_basic / _college_bound
// hold the two diploma tracks side by side — the admin page is a card
// per subject with both fields.
export type GraduationRequirementRecord = {
  id: string
  created_at: string
  updated_at: string
  name: string | null
  subject_area: string
  required_credits_basic: number
  required_credits_college_bound: number
  applies_to_grade_levels: string[]
  notes: string | null
}

const graduationRequirementColumns =
  "id, created_at, updated_at, name, subject_area, " +
  "required_credits_basic, required_credits_college_bound, " +
  "applies_to_grade_levels, notes"

// Upsert keyed on subject_area — one requirement row per subject. The
// page never creates duplicates; it edits the single card per area.
export const graduationRequirementUpsertSchema = z.object({
  subject_area: z.string().trim().min(1, "Subject area is required.").max(80),
  required_credits_basic: z.coerce.number().min(0).max(20).default(0),
  required_credits_college_bound: z.coerce.number().min(0).max(20).default(0),
  applies_to_grade_levels: z
    .array(z.string().trim().min(1).max(4))
    .max(10)
    .default([]),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type GraduationRequirementUpsertInput = z.infer<
  typeof graduationRequirementUpsertSchema
>

export async function listGraduationRequirements(): Promise<
  GraduationRequirementRecord[]
> {
  const { data, error } = await getSupabase()
    .from("graduation_requirements")
    .select(graduationRequirementColumns)
    .order("subject_area", { ascending: true })
    .returns<GraduationRequirementRecord[]>()

  if (error) {
    throw new Error(`Failed to list graduation requirements: ${error.message}`)
  }
  return data
}

export async function upsertGraduationRequirement(
  input: GraduationRequirementUpsertInput
): Promise<GraduationRequirementRecord> {
  const { data, error } = await getSupabase()
    .from("graduation_requirements")
    .upsert(
      {
        subject_area: input.subject_area,
        name: subjectAreaLabel(input.subject_area),
        required_credits_basic: input.required_credits_basic,
        required_credits_college_bound: input.required_credits_college_bound,
        applies_to_grade_levels: input.applies_to_grade_levels,
        notes: input.notes,
      },
      { onConflict: "subject_area" }
    )
    .select(graduationRequirementColumns)
    .single<GraduationRequirementRecord>()
  if (error) throw new Error(`Failed to save requirement: ${error.message}`)
  return data
}

// ============================================================================
// Course subject assignments
// ============================================================================

export type CourseSubjectAssignmentRecord = {
  course_id: string
  subject_area: string
  updated_at: string
}

export async function listCourseSubjectAssignments(): Promise<CourseSubjectAssignmentRecord[]> {
  const { data, error } = await getSupabase()
    .from("course_subject_assignments")
    .select("course_id, subject_area, updated_at")
    .returns<CourseSubjectAssignmentRecord[]>()
  if (error) throw new Error(`Failed to list subject assignments: ${error.message}`)
  return data
}

// Many-to-many: a course can satisfy several subject areas. These two
// helpers add / remove a single (course, subject) membership. The
// admin Graduation Requirements page drives both.
export async function addCourseToSubjectArea(input: {
  course_id: string
  subject_area: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("course_subject_assignments")
    .upsert(
      { course_id: input.course_id, subject_area: input.subject_area },
      { onConflict: "course_id,subject_area" }
    )
  if (error) {
    throw new Error(`Failed to add course to subject area: ${error.message}`)
  }
}

export async function removeCourseFromSubjectArea(input: {
  course_id: string
  subject_area: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("course_subject_assignments")
    .delete()
    .eq("course_id", input.course_id)
    .eq("subject_area", input.subject_area)
  if (error) {
    throw new Error(`Failed to remove course from subject area: ${error.message}`)
  }
}

// Course IDs in the 'elective' subject area — the scheduler's
// Friday-elective-only set. A course here is schedulable only in the
// elective_1 / elective_2 (Friday) periods; everything else is
// weekday-only.
export async function listElectiveCourseIds(): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from("course_subject_assignments")
    .select("course_id")
    .eq("subject_area", ELECTIVE_SUBJECT_AREA)
    .returns<Array<{ course_id: string }>>()
  if (error) {
    throw new Error(`Failed to list elective courses: ${error.message}`)
  }
  return new Set((data ?? []).map((r) => r.course_id))
}

// ============================================================================
// Course prerequisites
// ============================================================================

export const coursePrereqKindSchema = z.enum(["hard", "recommended"])
export type CoursePrereqKind = z.infer<typeof coursePrereqKindSchema>

export type CoursePrerequisiteRecord = {
  id: string
  course_id: string
  prerequisite_course_id: string
  kind: CoursePrereqKind
  group_key: string | null
  notes: string | null
}

const coursePrerequisiteColumns =
  "id, course_id, prerequisite_course_id, kind, group_key, notes"

export async function listCoursePrerequisites(): Promise<CoursePrerequisiteRecord[]> {
  const { data, error } = await getSupabase()
    .from("course_prerequisites")
    .select(coursePrerequisiteColumns)
    .returns<CoursePrerequisiteRecord[]>()
  if (error) throw new Error(`Failed to list prerequisites: ${error.message}`)
  return data
}

// ============================================================================
// Student prereq overrides (admin-granted exceptions)
// ============================================================================

export type StudentPrereqOverrideRecord = {
  id: string
  created_at: string
  student_id: string
  course_id: string
  granted_by_email: string
  notes: string | null
}

const studentPrereqOverrideColumns =
  "id, created_at, student_id, course_id, granted_by_email, notes"

export async function listStudentPrereqOverrides(
  studentId: string
): Promise<StudentPrereqOverrideRecord[]> {
  const { data, error } = await getSupabase()
    .from("student_prereq_overrides")
    .select(studentPrereqOverrideColumns)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .returns<StudentPrereqOverrideRecord[]>()
  if (error) throw new Error(`Failed to list overrides: ${error.message}`)
  return data
}

export async function grantStudentPrereqOverride(input: {
  student_id: string
  course_id: string
  granted_by_email: string
  notes?: string | null
}): Promise<StudentPrereqOverrideRecord> {
  const { data, error } = await getSupabase()
    .from("student_prereq_overrides")
    .upsert(
      {
        student_id: input.student_id,
        course_id: input.course_id,
        granted_by_email: input.granted_by_email,
        notes: input.notes ?? null,
      },
      { onConflict: "student_id,course_id" }
    )
    .select(studentPrereqOverrideColumns)
    .single<StudentPrereqOverrideRecord>()
  if (error) throw new Error(`Failed to grant override: ${error.message}`)
  return data
}

export async function revokeStudentPrereqOverride(input: {
  student_id: string
  course_id: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("student_prereq_overrides")
    .delete()
    .eq("student_id", input.student_id)
    .eq("course_id", input.course_id)
  if (error) throw new Error(`Failed to revoke override: ${error.message}`)
}

// ============================================================================
// Student trajectory: completed / in-progress / eligible / blocked per course
// ============================================================================

export type CourseOfferedPattern =
  | "always"
  | "odd_start_year"
  | "even_start_year"
  | "manual"

export type TrajectoryStatus =
  | "completed"      // Took the course in a prior term + earned credit
  | "in_progress"    // Currently enrolled in the course
  | "eligible"       // Prereqs met, course is offered next year, grade band matches
  | "needs_prereq"   // Course exists at the student's grade but prereqs aren't met
  | "wrong_year"     // Course is offered but on the alternating year that doesn't match
  | "grade_locked"   // Course is gated to a later grade level

export type TrajectoryMissingPrereq = {
  course_id: string
  code: string
  name: string
  group_key: string | null
}

export type TrajectoryEntry = {
  course_id: string
  code: string
  name: string
  is_ap: boolean
  is_honors: boolean
  is_elective: boolean
  grade_levels: string[]
  offered_pattern: CourseOfferedPattern
  /** Every subject area this course is tagged with. A course can
   *  count toward more than one (Studio Art = VPA + Elective).
   *  Empty when the course isn't mapped to any subject. */
  subject_areas: SubjectArea[]
  credit_hours: number
  status: TrajectoryStatus
  completed_term_name?: string | null
  completed_grade_letter?: string | null
  in_progress_term_name?: string | null
  missing_prereqs?: TrajectoryMissingPrereq[]
  override_granted?: boolean
  /** For completed / in-progress entries: the grade level the student
   *  was in when they took (or are taking) the course, derived from the
   *  term's academic year vs. the student's current grade. null when it
   *  can't be determined (missing academic_year, non-numeric grade).
   *  Drives the per-year columns in the trajectory tree UI. */
  grade_when_taken?: number | null
}

// Transfer / external coursework that counts toward a subject's
// requirement. Not a TrajectoryEntry — it has no HBA course_id and
// can't be picked — so it renders as a read-only note on the subject
// tree rather than a node in the year columns.
export type TrajectoryTransferEntry = {
  id: string
  title: string
  school_name: string
  academic_year: string | null
  grade_letter: string | null
  credits: number
  /** Counted toward credits_completed? False for failing grades — the
   *  row still shows so the picture is complete, but it earned nothing. */
  counted: boolean
}

export type TrajectorySubjectSummary = {
  subject_area: SubjectArea
  required_credits_basic: number | null
  required_credits_college_bound: number | null
  credits_completed: number
  credits_in_progress: number
  entries: TrajectoryEntry[]
  /** Accepted transfer credit tagged to this subject (non-superseded).
   *  Already folded into credits_completed for the rows where
   *  `counted` is true. */
  transfer_entries: TrajectoryTransferEntry[]
}

export type TrajectoryResult = {
  next_academic_year_start: number | null
  /** Student's current grade as a number (9-12), or null when the
   *  grade isn't a parseable number. Drives the trajectory tree's
   *  "which column is past / next / future" logic. */
  current_grade: number | null
  /** current_grade + 1, or null. The column the student is picking
   *  courses for. */
  next_grade: number | null
  subjects: TrajectorySubjectSummary[]
  unmapped_courses: TrajectoryEntry[]
}

type CourseRow = {
  id: string
  code: string
  name: string
  is_ap: boolean
  is_honors: boolean
  is_elective: boolean
  grade_levels: string[]
  offered_pattern: CourseOfferedPattern
  credit_hours: number
  active: boolean
}

type EnrollmentRow = {
  id: string
  status: string
  final_grade_letter: string | null
  section: {
    course_id: string
    term: {
      name: string
      academic_year: string
      end_date: string
      is_current: boolean
    } | null
  } | null
}

// Pure: required credits for a subject area on a given track. One row
// per subject now, with both track columns — null when no rule row
// exists for the subject at all.
function pickCredits(
  rows: GraduationRequirementRecord[],
  area: SubjectArea,
  track: "basic" | "college_bound"
): number | null {
  const row = rows.find((r) => r.subject_area === area)
  if (!row) return null
  return track === "basic"
    ? Number(row.required_credits_basic)
    : Number(row.required_credits_college_bound)
}

// Pure: extract the calendar year a "2026-2027" academic_year starts in.
function startYear(academicYear: string | null | undefined): number | null {
  if (!academicYear) return null
  const m = academicYear.match(/^(\d{4})/)
  return m ? parseInt(m[1], 10) : null
}

// Pure: is this course offered in the given start year?
function isOfferedInStartYear(
  pattern: CourseOfferedPattern,
  year: number | null
): boolean {
  if (pattern === "always") return true
  if (pattern === "manual") return true // admin will sort it out
  if (year === null) return true // can't tell; assume yes
  if (pattern === "odd_start_year") return year % 2 === 1
  if (pattern === "even_start_year") return year % 2 === 0
  return true
}

// Pure: evaluate prereqs for `course`. Returns the list of missing
// prereqs grouped by group_key (so OR-groups collapse into a single
// blocker if ANY of them is satisfied).
function evaluateMissingPrereqs(
  courseId: string,
  prereqs: CoursePrerequisiteRecord[],
  completedCourseIds: Set<string>,
  coursesById: Map<string, CourseRow>
): TrajectoryMissingPrereq[] {
  // Group prereqs by group_key; null key = standalone AND.
  const buckets = new Map<string, CoursePrerequisiteRecord[]>()
  for (const p of prereqs) {
    if (p.course_id !== courseId) continue
    if (p.kind !== "hard") continue
    const key = p.group_key ?? `_solo_${p.id}`
    const arr = buckets.get(key) ?? []
    arr.push(p)
    buckets.set(key, arr)
  }

  const missing: TrajectoryMissingPrereq[] = []
  for (const bucket of buckets.values()) {
    // ANY satisfied in the bucket = bucket cleared.
    const anySatisfied = bucket.some((p) =>
      completedCourseIds.has(p.prerequisite_course_id)
    )
    if (anySatisfied) continue
    // None satisfied — push every alternative so the UI can show "Calc AB
    // requires Precalc OR Honors Precalc OR AP Precalc".
    for (const p of bucket) {
      const course = coursesById.get(p.prerequisite_course_id)
      if (!course) continue
      missing.push({
        course_id: course.id,
        code: course.code,
        name: course.name,
        group_key: p.group_key,
      })
    }
  }
  return missing
}

export type ComputeTrajectoryOptions = {
  /** Drives which `graduation_requirements` row counts. */
  track?: "basic" | "college_bound"
  /** Override the calendar year used for offering-pattern + grade
   *  eligibility checks. Defaults to "next academic year's start year"
   *  computed from the upcoming term. */
  forStartYear?: number
}

export async function computeStudentTrajectory(
  studentId: string,
  options: ComputeTrajectoryOptions = {}
): Promise<TrajectoryResult> {
  const supabase = getSupabase()

  const [
    { data: student, error: studentError },
    coursesResult,
    assignmentsResult,
    prereqsResult,
    requirementsResult,
    overridesResult,
    enrollmentsResult,
    termsResult,
    academicHistoryResult,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, current_grade")
      .eq("id", studentId)
      .maybeSingle<{ id: string; current_grade: string | null }>(),
    supabase
      .from("courses")
      .select(
        "id, code, name, is_ap, is_honors, is_elective, grade_levels, offered_pattern, credit_hours, active"
      )
      .returns<CourseRow[]>(),
    supabase
      .from("course_subject_assignments")
      .select("course_id, subject_area")
      .returns<Array<{ course_id: string; subject_area: string }>>(),
    listCoursePrerequisites(),
    listGraduationRequirements(),
    listStudentPrereqOverrides(studentId),
    supabase
      .from("enrollments")
      .select(
        `id, status, final_grade_letter,
         section:course_sections(
           course_id,
           term:terms(name, academic_year, end_date, is_current)
         )`
      )
      .eq("student_id", studentId)
      .returns<EnrollmentRow[]>(),
    supabase
      .from("terms")
      .select("start_date, academic_year")
      .order("start_date", { ascending: true })
      .returns<Array<{ start_date: string; academic_year: string }>>(),
    // Transfer / external coursework — counts toward graduation
    // requirement buckets, but isn't an HBA enrollment.
    supabase
      .from("academic_history")
      .select(
        "id, title, school_name, academic_year, subject_area, credits, superseded, grade_letter"
      )
      .eq("student_id", studentId)
      .returns<
        Array<{
          id: string
          title: string
          school_name: string
          academic_year: string | null
          subject_area: string | null
          credits: number
          superseded: boolean
          grade_letter: string | null
        }>
      >(),
  ])

  if (studentError) throw new Error(`Student lookup failed: ${studentError.message}`)
  if (!student) throw new Error("Student not found.")
  if (coursesResult.error) throw new Error(coursesResult.error.message)
  if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
  if (enrollmentsResult.error) throw new Error(enrollmentsResult.error.message)
  if (termsResult.error) throw new Error(termsResult.error.message)
  if (academicHistoryResult.error)
    throw new Error(academicHistoryResult.error.message)

  // Roll transfer credit up by subject area. A row counts toward a
  // requirement bucket when it's mapped to a subject, not superseded
  // by an HBA retake, and carries a passing letter grade. Non-counting
  // rows (failing / ungraded) still surface on the tree so the picture
  // is complete — superseded rows don't (they belong to the retake).
  const transferCreditsByArea = new Map<SubjectArea, number>()
  const transferEntriesByArea = new Map<SubjectArea, TrajectoryTransferEntry[]>()
  for (const row of academicHistoryResult.data ?? []) {
    if (row.superseded) continue
    if (!row.subject_area) continue
    if (!(subjectAreas as readonly string[]).includes(row.subject_area)) continue
    const area = row.subject_area as SubjectArea
    const counted = Boolean(row.grade_letter) && row.grade_letter !== "F"
    if (counted) {
      transferCreditsByArea.set(
        area,
        (transferCreditsByArea.get(area) ?? 0) + Number(row.credits)
      )
    }
    const arr = transferEntriesByArea.get(area) ?? []
    arr.push({
      id: row.id,
      title: row.title,
      school_name: row.school_name,
      academic_year: row.academic_year,
      grade_letter: row.grade_letter,
      credits: Number(row.credits),
      counted,
    })
    transferEntriesByArea.set(area, arr)
  }

  // Determine next academic year start (calendar year). Fall back to
  // the current academic year if there's no future term on file.
  const todayIso = new Date().toISOString().slice(0, 10)
  const upcomingTerm = (termsResult.data ?? []).find(
    (t) => t.start_date > todayIso
  )
  const fallbackTerm = (termsResult.data ?? []).find(
    (t) => t.start_date <= todayIso
  )
  const nextStartYear =
    options.forStartYear ??
    startYear(upcomingTerm?.academic_year ?? null) ??
    startYear(fallbackTerm?.academic_year ?? null)

  // Many-to-many: a course can map to several subject areas.
  const subjectAreasByCourse = new Map<string, SubjectArea[]>()
  for (const a of assignmentsResult.data ?? []) {
    if (!(subjectAreas as readonly string[]).includes(a.subject_area)) continue
    const arr = subjectAreasByCourse.get(a.course_id) ?? []
    arr.push(a.subject_area as SubjectArea)
    subjectAreasByCourse.set(a.course_id, arr)
  }

  const coursesById = new Map((coursesResult.data ?? []).map((c) => [c.id, c]))
  const overrideCourseIds = new Set(overridesResult.map((o) => o.course_id))

  // The academic year "happening now" — used to back-compute which
  // grade a past course was taken in. The latest term that has already
  // started anchors it.
  const currentAcademicYearStart = startYear(
    fallbackTerm?.academic_year ?? upcomingTerm?.academic_year ?? null
  )
  const currentGradeNum = parseInt(student.current_grade ?? "", 10)

  // Pure: given the academic year a course was taken in, what grade
  // was the student in? gradeNow − (yearNow − yearTaken). null when we
  // can't anchor it.
  const gradeWhenTaken = (courseAcademicYear: string | null): number | null => {
    if (!Number.isFinite(currentGradeNum)) return null
    if (currentAcademicYearStart === null) return null
    const taken = startYear(courseAcademicYear)
    if (taken === null) return null
    return currentGradeNum - (currentAcademicYearStart - taken)
  }

  // Bucket enrollments. "completed" = ended-term enrollment in 'enrolled'
  // or 'completed' status. "in progress" = enrollment in 'enrolled' or
  // 'audit' status whose term is current.
  const completedCourseIds = new Set<string>()
  const inProgressCourseIds = new Set<string>()
  const completedMeta = new Map<
    string,
    { term_name: string; grade_letter: string | null; grade_when_taken: number | null }
  >()
  const inProgressMeta = new Map<
    string,
    { term_name: string; grade_when_taken: number | null }
  >()

  for (const e of enrollmentsResult.data ?? []) {
    if (!e.section?.course_id || !e.section.term) continue
    const term = e.section.term
    const isPast = term.end_date < todayIso
    if (e.status === "completed" || (isPast && e.status === "enrolled")) {
      completedCourseIds.add(e.section.course_id)
      completedMeta.set(e.section.course_id, {
        term_name: term.name,
        grade_letter: e.final_grade_letter,
        grade_when_taken: gradeWhenTaken(term.academic_year),
      })
    } else if (
      (e.status === "enrolled" || e.status === "audit") &&
      term.is_current
    ) {
      inProgressCourseIds.add(e.section.course_id)
      inProgressMeta.set(e.section.course_id, {
        term_name: term.name,
        // In-progress = the student's current grade.
        grade_when_taken: Number.isFinite(currentGradeNum)
          ? currentGradeNum
          : null,
      })
    }
  }

  // For prereq-checking we treat in-progress as "completed by next year"
  // since by the time the next term starts they'll have it.
  const completedForPrereq = new Set<string>([
    ...completedCourseIds,
    ...inProgressCourseIds,
  ])

  // The student's grade for next year. Add 1 to their current grade
  // unless it's a final grade like "12" (which graduates).
  const nextGrade = Number.isFinite(currentGradeNum)
    ? String(currentGradeNum + 1)
    : null

  // Build a per-course trajectory entry.
  const entries: TrajectoryEntry[] = []
  for (const c of coursesResult.data ?? []) {
    if (!c.active) continue
    const courseSubjectAreas = subjectAreasByCourse.get(c.id) ?? []
    const hasOverride = overrideCourseIds.has(c.id)

    const base: TrajectoryEntry = {
      course_id: c.id,
      code: c.code,
      name: c.name,
      is_ap: c.is_ap,
      is_honors: c.is_honors,
      is_elective: c.is_elective,
      grade_levels: c.grade_levels,
      offered_pattern: c.offered_pattern,
      subject_areas: courseSubjectAreas,
      credit_hours: Number(c.credit_hours),
      status: "eligible",
    }

    if (completedCourseIds.has(c.id)) {
      const meta = completedMeta.get(c.id)
      entries.push({
        ...base,
        status: "completed",
        completed_term_name: meta?.term_name ?? null,
        completed_grade_letter: meta?.grade_letter ?? null,
        grade_when_taken: meta?.grade_when_taken ?? null,
      })
      continue
    }
    if (inProgressCourseIds.has(c.id)) {
      const meta = inProgressMeta.get(c.id)
      entries.push({
        ...base,
        status: "in_progress",
        in_progress_term_name: meta?.term_name ?? null,
        grade_when_taken: meta?.grade_when_taken ?? null,
      })
      continue
    }

    // Alternating-year filter for next year.
    if (!isOfferedInStartYear(c.offered_pattern, nextStartYear)) {
      entries.push({ ...base, status: "wrong_year" })
      continue
    }

    // Grade-level filter. We're lenient — if the course lists no grades
    // it's available to anyone; otherwise the student's next-year grade
    // must be in the list. Students above the listed range still get the
    // course (we don't lock down "look at lower-grade courses you missed").
    // Students below are blocked.
    if (nextGrade && c.grade_levels.length > 0) {
      const lowest = c.grade_levels
        .map((g) => parseInt(g, 10))
        .filter((n) => Number.isFinite(n))
        .reduce<number | null>(
          (acc, v) => (acc === null || v < acc ? v : acc),
          null
        )
      if (lowest !== null) {
        const nextNum = parseInt(nextGrade, 10)
        if (Number.isFinite(nextNum) && nextNum < lowest) {
          entries.push({ ...base, status: "grade_locked" })
          continue
        }
      }
    }

    // Prereqs (skipped entirely if admin granted an override).
    if (!hasOverride) {
      const missing = evaluateMissingPrereqs(
        c.id,
        prereqsResult,
        completedForPrereq,
        coursesById
      )
      if (missing.length > 0) {
        entries.push({
          ...base,
          status: "needs_prereq",
          missing_prereqs: missing,
        })
        continue
      }
    }

    entries.push({
      ...base,
      status: "eligible",
      override_granted: hasOverride,
    })
  }

  // Group entries by subject area + roll up credits earned / in
  // progress. A course tagged with several subject areas shows up
  // under each — Studio Art counts toward both VPA and Elective.
  const subjects: TrajectorySubjectSummary[] = subjectAreas.map((area) => {
    const areaEntries = entries.filter((e) => e.subject_areas.includes(area))
    // HBA completed credits + accepted transfer credit tagged to this area.
    const credits_completed =
      areaEntries
        .filter((e) => e.status === "completed")
        .reduce((sum, e) => sum + e.credit_hours, 0) +
      (transferCreditsByArea.get(area) ?? 0)
    const credits_in_progress = areaEntries
      .filter((e) => e.status === "in_progress")
      .reduce((sum, e) => sum + e.credit_hours, 0)
    return {
      subject_area: area,
      required_credits_basic: pickCredits(
        requirementsResult,
        area,
        "basic"
      ),
      required_credits_college_bound: pickCredits(
        requirementsResult,
        area,
        "college_bound"
      ),
      credits_completed,
      credits_in_progress,
      entries: areaEntries,
      transfer_entries: transferEntriesByArea.get(area) ?? [],
    }
  })

  const unmappedCourses = entries.filter((e) => e.subject_areas.length === 0)

  return {
    next_academic_year_start: nextStartYear,
    current_grade: Number.isFinite(currentGradeNum) ? currentGradeNum : null,
    next_grade:
      nextGrade !== null && Number.isFinite(parseInt(nextGrade, 10))
        ? parseInt(nextGrade, 10)
        : null,
    subjects,
    unmapped_courses: unmappedCourses,
  }
}

// ============================================================================
// Student course requests
// ============================================================================

export const studentCourseRequestKindSchema = z.enum(["core", "elective", "alternate"])
export type StudentCourseRequestKind = z.infer<typeof studentCourseRequestKindSchema>

export type StudentCourseRequestRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  term_id: string
  course_id: string
  kind: StudentCourseRequestKind
  preference_rank: number
  notes: string | null
  submitted_at: string | null
}

export type StudentCourseRequestWithCourse = StudentCourseRequestRecord & {
  course: { id: string; code: string; name: string; subject: string | null } | null
}

const studentCourseRequestColumns =
  "id, created_at, updated_at, student_id, term_id, course_id, kind, preference_rank, notes, submitted_at"

export async function listStudentCourseRequests(input: {
  student_id: string
  term_id: string
}): Promise<StudentCourseRequestWithCourse[]> {
  const { data, error } = await getSupabase()
    .from("student_course_requests")
    .select(`${studentCourseRequestColumns}, course:courses(id, code, name, subject)`)
    .eq("student_id", input.student_id)
    .eq("term_id", input.term_id)
    .order("kind", { ascending: true })
    .order("preference_rank", { ascending: true })
    .returns<StudentCourseRequestWithCourse[]>()
  if (error) throw new Error(`Failed to list course requests: ${error.message}`)
  return data
}

export const studentCourseRequestUpsertSchema = z.object({
  student_id: z.uuid(),
  term_id: z.uuid(),
  course_id: z.uuid(),
  kind: studentCourseRequestKindSchema,
  preference_rank: z.coerce.number().int().min(1).default(1),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type StudentCourseRequestUpsertInput = z.infer<typeof studentCourseRequestUpsertSchema>

export async function upsertStudentCourseRequest(
  input: StudentCourseRequestUpsertInput
): Promise<StudentCourseRequestRecord> {
  const { data, error } = await getSupabase()
    .from("student_course_requests")
    .upsert(input, { onConflict: "student_id,term_id,course_id" })
    .select(studentCourseRequestColumns)
    .single<StudentCourseRequestRecord>()
  if (error) throw new Error(`Failed to upsert course request: ${error.message}`)
  return data
}

export async function deleteStudentCourseRequest(input: {
  student_id: string
  term_id: string
  course_id: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("student_course_requests")
    .delete()
    .eq("student_id", input.student_id)
    .eq("term_id", input.term_id)
    .eq("course_id", input.course_id)
  if (error) throw new Error(`Failed to delete course request: ${error.message}`)
}

export async function markCourseRequestsSubmitted(input: {
  student_id: string
  term_id: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from("student_course_requests")
    .update({ submitted_at: new Date().toISOString() })
    .eq("student_id", input.student_id)
    .eq("term_id", input.term_id)
  if (error) throw new Error(`Failed to mark requests submitted: ${error.message}`)
}

// ============================================================================
// Bio → qualifications seed
// ============================================================================
//
// One-shot import that walks lib/faculty.ts bios and creates
// teacher_qualifications rows from each bio's coursesTaught list. Matches
// bio → profile by first-name email pattern (e.g. "Ellen Sullivan" maps
// to ellen@highbluffacademy.com), and bio.coursesTaught → courses table
// by exact (case-insensitive) name match. Skips items that don't match,
// and reports counts so admins can fix the mismatches.

export type BioSeedResult = {
  bios_total: number
  bios_matched_to_profile: number
  bios_no_profile: string[]    // bio names with no email match
  courses_inserted: number     // newly inserted qualifications
  courses_skipped_existing: number
  courses_no_match: string[]   // "<bio name>: <course string>" pairs we couldn't resolve
}

export async function seedTeacherQualificationsFromBios(): Promise<BioSeedResult> {
  const supabase = getSupabase()

  // faculty_bios is the source of truth. Each row is already keyed by
  // profile_id, so there's no email-convention matching to do — the
  // only resolution left is courses_taught (names) → course ids.
  const [biosRes, coursesRes] = await Promise.all([
    supabase
      .from("faculty_bios")
      .select("profile_id, name, courses_taught")
      .returns<
        Array<{
          profile_id: string
          name: string | null
          courses_taught: string[] | null
        }>
      >(),
    supabase.from("courses").select("id, name").returns<Array<{ id: string; name: string }>>(),
  ])

  if (biosRes.error) throw new Error(biosRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)

  const bios = biosRes.data ?? []
  const courses = coursesRes.data ?? []

  const coursesByName = new Map<string, string>()
  for (const course of courses) {
    coursesByName.set(course.name.toLowerCase().trim(), course.id)
  }

  const result: BioSeedResult = {
    bios_total: bios.length,
    bios_matched_to_profile: bios.length,
    bios_no_profile: [],
    courses_inserted: 0,
    courses_skipped_existing: 0,
    courses_no_match: [],
  }

  for (const bio of bios) {
    const bioName = bio.name ?? bio.profile_id
    if (!bio.courses_taught || bio.courses_taught.length === 0) continue

    for (const courseName of bio.courses_taught) {
      const courseId = coursesByName.get(courseName.toLowerCase().trim())
      if (!courseId) {
        result.courses_no_match.push(`${bioName}: ${courseName}`)
        continue
      }

      // Check existence first so we can distinguish inserted vs skipped.
      const { data: existing } = await supabase
        .from("teacher_qualifications")
        .select("id")
        .eq("profile_id", bio.profile_id)
        .eq("course_id", courseId)
        .maybeSingle<{ id: string }>()

      if (existing) {
        result.courses_skipped_existing += 1
        continue
      }

      const { error: insertError } = await supabase
        .from("teacher_qualifications")
        .insert({
          profile_id: bio.profile_id,
          course_id: courseId,
          preference_rank: 1,
        })

      if (insertError) {
        throw new Error(
          `Failed to insert qualification for ${bioName} / ${courseName}: ${insertError.message}`
        )
      }
      result.courses_inserted += 1
    }
  }

  return result
}

// ============================================================================
// Display helpers shared by faculty + admin views
// ============================================================================

export const periodDisplayLabel: Record<SectionPeriod, string> = {
  period_1: "Period 1 (Mon-Thu 8:30-9:30)",
  period_2: "Period 2 (Mon-Thu 9:35-10:35)",
  period_3: "Period 3 (Mon-Thu 10:40-11:40)",
  period_4: "Period 4 (Mon-Thu 12:25-1:25)",
  period_5: "Period 5 (Mon/Wed 1:30-3:00, Fri 12:55-1:55)",
  period_6: "Period 6 (Tue/Thu 1:30-3:00, Fri 2:00-3:00)",
  elective_1: "Elective 1 (Fri 8:30-10:15)",
  elective_2: "Elective 2 (Fri 10:20-12:05)",
  async: "Online async (no fixed meeting time)",
}

// ============================================================================
// Bell schedule — structured form of periodDisplayLabel
// ============================================================================
//
// Drives the faculty + student weekly schedule grids. Keep in sync with the
// label strings above so what's rendered visually matches the descriptive
// label. Async periods appear nowhere on the grid.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri"

export const weekdayLabel: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
}

export const weekdayShort: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
}

export const orderedWeekdays: Weekday[] = ["mon", "tue", "wed", "thu", "fri"]

export type PeriodMeeting = {
  day: Weekday
  /** 24-hour HH:MM. */
  start: string
  end: string
}

export const periodMeetings: Record<SectionPeriod, PeriodMeeting[]> = {
  period_1: (["mon", "tue", "wed", "thu"] as Weekday[]).map((day) => ({
    day,
    start: "08:30",
    end: "09:30",
  })),
  period_2: (["mon", "tue", "wed", "thu"] as Weekday[]).map((day) => ({
    day,
    start: "09:35",
    end: "10:35",
  })),
  period_3: (["mon", "tue", "wed", "thu"] as Weekday[]).map((day) => ({
    day,
    start: "10:40",
    end: "11:40",
  })),
  period_4: (["mon", "tue", "wed", "thu"] as Weekday[]).map((day) => ({
    day,
    start: "12:25",
    end: "13:25",
  })),
  period_5: [
    { day: "mon", start: "13:30", end: "15:00" },
    { day: "wed", start: "13:30", end: "15:00" },
    { day: "fri", start: "12:55", end: "13:55" },
  ],
  period_6: [
    { day: "tue", start: "13:30", end: "15:00" },
    { day: "thu", start: "13:30", end: "15:00" },
    { day: "fri", start: "14:00", end: "15:00" },
  ],
  elective_1: [{ day: "fri", start: "08:30", end: "10:15" }],
  elective_2: [{ day: "fri", start: "10:20", end: "12:05" }],
  async: [],
}

export function formatTimeHHMM(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const hour12 = ((h + 11) % 12) + 1
  const period = h < 12 ? "am" : "pm"
  return `${hour12}:${m.toString().padStart(2, "0")}${period}`
}
