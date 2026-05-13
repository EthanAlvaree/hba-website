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

// Standard subject-area list. Free-text in the DB so the office can add
// niche ones, but the UI offers these as defaults.
export const subjectAreas = [
  "English",
  "Math",
  "Science",
  "Social Studies",
  "Foreign Language",
  "Arts",
  "PE / Wellness",
  "Elective",
] as const

export type GraduationRequirementRecord = {
  id: string
  created_at: string
  updated_at: string
  name: string
  subject_area: string
  required_credits: number
  applies_to_grade_levels: string[]
  notes: string | null
}

const graduationRequirementColumns =
  "id, created_at, updated_at, name, subject_area, required_credits, applies_to_grade_levels, notes"

export const graduationRequirementUpsertSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  subject_area: z.string().trim().min(1, "Subject area is required.").max(80),
  required_credits: z.coerce.number().min(0).default(0),
  applies_to_grade_levels: z.array(z.string().trim().min(1).max(4)).max(10).default([]),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type GraduationRequirementUpsertInput = z.infer<typeof graduationRequirementUpsertSchema>

export async function listGraduationRequirements(): Promise<GraduationRequirementRecord[]> {
  const { data, error } = await getSupabase()
    .from("graduation_requirements")
    .select(graduationRequirementColumns)
    .order("subject_area", { ascending: true })
    .order("name", { ascending: true })
    .returns<GraduationRequirementRecord[]>()

  if (error) {
    throw new Error(`Failed to list graduation requirements: ${error.message}`)
  }
  return data
}

export async function upsertGraduationRequirement(
  input: GraduationRequirementUpsertInput
): Promise<GraduationRequirementRecord> {
  const supabase = getSupabase()

  if (input.id) {
    const { id, ...rest } = input
    const { data, error } = await supabase
      .from("graduation_requirements")
      .update(rest)
      .eq("id", id)
      .select(graduationRequirementColumns)
      .single<GraduationRequirementRecord>()
    if (error) throw new Error(`Failed to update requirement: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from("graduation_requirements")
    .insert({ ...input, id: undefined })
    .select(graduationRequirementColumns)
    .single<GraduationRequirementRecord>()
  if (error) throw new Error(`Failed to create requirement: ${error.message}`)
  return data
}

export async function deleteGraduationRequirement(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("graduation_requirements")
    .delete()
    .eq("id", id)
  if (error) throw new Error(`Failed to delete requirement: ${error.message}`)
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

export async function setCourseSubjectArea(input: {
  course_id: string
  subject_area: string | null
}): Promise<void> {
  const supabase = getSupabase()
  if (!input.subject_area) {
    const { error } = await supabase
      .from("course_subject_assignments")
      .delete()
      .eq("course_id", input.course_id)
    if (error) throw new Error(`Failed to clear subject area: ${error.message}`)
    return
  }
  const { error } = await supabase
    .from("course_subject_assignments")
    .upsert(
      { course_id: input.course_id, subject_area: input.subject_area },
      { onConflict: "course_id" }
    )
  if (error) throw new Error(`Failed to set subject area: ${error.message}`)
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
  // Import faculty module dynamically to avoid pulling its assets into
  // every page that imports lib/scheduler.ts.
  const { faculty } = await import("@/lib/faculty")

  const supabase = getSupabase()

  // Fetch all profiles + all courses once.
  const [profilesRes, coursesRes] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name").returns<
      Array<{ id: string; email: string; display_name: string | null }>
    >(),
    supabase.from("courses").select("id, name").returns<Array<{ id: string; name: string }>>(),
  ])

  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (coursesRes.error) throw new Error(coursesRes.error.message)

  const profiles = profilesRes.data ?? []
  const courses = coursesRes.data ?? []

  const coursesByName = new Map<string, string>()
  for (const course of courses) {
    coursesByName.set(course.name.toLowerCase().trim(), course.id)
  }

  const result: BioSeedResult = {
    bios_total: faculty.length,
    bios_matched_to_profile: 0,
    bios_no_profile: [],
    courses_inserted: 0,
    courses_skipped_existing: 0,
    courses_no_match: [],
  }

  for (const bio of faculty) {
    // Extract first name from the slug (e.g. "ellen-sullivan" → "ellen").
    const firstName = bio.slug.split("-")[0]?.toLowerCase() ?? ""
    if (!firstName) {
      result.bios_no_profile.push(bio.name)
      continue
    }

    const expectedEmail = `${firstName}@${siteConfig.contact.emailDomain}`
    const profile = profiles.find((p) => p.email === expectedEmail)
    if (!profile) {
      result.bios_no_profile.push(bio.name)
      continue
    }

    result.bios_matched_to_profile += 1

    if (!bio.coursesTaught || bio.coursesTaught.length === 0) continue

    for (const courseName of bio.coursesTaught) {
      const courseId = coursesByName.get(courseName.toLowerCase().trim())
      if (!courseId) {
        result.courses_no_match.push(`${bio.name}: ${courseName}`)
        continue
      }

      // Check existence first so we can distinguish inserted vs skipped.
      const { data: existing } = await supabase
        .from("teacher_qualifications")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("course_id", courseId)
        .maybeSingle<{ id: string }>()

      if (existing) {
        result.courses_skipped_existing += 1
        continue
      }

      const { error: insertError } = await supabase
        .from("teacher_qualifications")
        .insert({
          profile_id: profile.id,
          course_id: courseId,
          preference_rank: 1,
        })

      if (insertError) {
        throw new Error(
          `Failed to insert qualification for ${bio.name} / ${courseName}: ${insertError.message}`
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
