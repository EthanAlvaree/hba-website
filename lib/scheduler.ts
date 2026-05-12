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
