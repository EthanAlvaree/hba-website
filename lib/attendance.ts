// lib/attendance.ts
//
// Per-enrollment, per-day attendance. Phase B introduces the schema (0004
// migration), the admin entry UI, and a read view for the student portal.

import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

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
  if (!cachedSupabase) {
    cachedSupabase = createServerSupabaseClient()
  }
  return cachedSupabase
}

// ============================================================================
// Types + schemas
// ============================================================================

export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "tardy",
  "excused",
  "left_early",
])
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>

export type AttendanceRecord = {
  id: string
  created_at: string
  updated_at: string
  enrollment_id: string
  date: string
  status: AttendanceStatus
  note: string | null
  recorded_by: string | null
}

const attendanceColumns =
  "id, created_at, updated_at, enrollment_id, date, status, note, recorded_by"

export const saveAttendanceInputSchema = z.object({
  section_id: z.uuid(),
  date: z.iso.date(),
  rows: z.array(
    z.object({
      enrollment_id: z.uuid(),
      status: attendanceStatusSchema,
      note: z
        .string()
        .trim()
        .max(2000)
        .optional()
        .nullable()
        .transform((value) => (value && value.length > 0 ? value : null)),
    })
  ),
  recorded_by: z.string().email().optional().nullable(),
})
export type SaveAttendanceInput = z.infer<typeof saveAttendanceInputSchema>

// ============================================================================
// Reads
// ============================================================================

export async function listAttendanceForSectionAndDate(
  sectionId: string,
  date: string
): Promise<AttendanceRecord[]> {
  // Look up via the enrollments that live under this section, then filter
  // attendance to that enrollment set + the date.
  const { data: enrollments, error: enrollmentsError } = await getSupabase()
    .from("enrollments")
    .select("id")
    .eq("section_id", sectionId)
    .returns<Array<{ id: string }>>()

  if (enrollmentsError) {
    throw new Error(`Failed to list enrollments: ${enrollmentsError.message}`)
  }

  const enrollmentIds = (enrollments ?? []).map((e) => e.id)
  if (enrollmentIds.length === 0) return []

  const { data, error } = await getSupabase()
    .from("attendance_records")
    .select(attendanceColumns)
    .in("enrollment_id", enrollmentIds)
    .eq("date", date)
    .returns<AttendanceRecord[]>()

  if (error) {
    throw new Error(`Failed to list attendance: ${error.message}`)
  }
  return data
}

export async function listAttendanceForEnrollment(
  enrollmentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await getSupabase()
    .from("attendance_records")
    .select(attendanceColumns)
    .eq("enrollment_id", enrollmentId)
    .order("date", { ascending: false })
    .returns<AttendanceRecord[]>()

  if (error) {
    throw new Error(`Failed to list attendance for enrollment: ${error.message}`)
  }
  return data
}

export type AttendanceSummary = {
  total: number
  present: number
  absent: number
  tardy: number
  excused: number
  left_early: number
}

export function summarizeAttendance(records: AttendanceRecord[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    total: records.length,
    present: 0,
    absent: 0,
    tardy: 0,
    excused: 0,
    left_early: 0,
  }
  for (const record of records) {
    summary[record.status] += 1
  }
  return summary
}

// ============================================================================
// Writes
// ============================================================================

// Batch upsert one section + one date's worth of attendance. Rows are skipped
// when status='present' AND note is empty AND there's no existing row for
// that (enrollment, date) — saves the admin from having to delete "default"
// present entries they didn't intend to record.
export async function saveAttendanceForSection(
  input: SaveAttendanceInput
): Promise<{ saved: number; skipped: number }> {
  if (input.rows.length === 0) {
    return { saved: 0, skipped: 0 }
  }

  // Existing rows for this date — used to decide whether a "present + no note"
  // row should be skipped (no existing record) or written (updating an existing
  // record).
  const enrollmentIds = input.rows.map((row) => row.enrollment_id)
  const { data: existing, error: existingError } = await getSupabase()
    .from("attendance_records")
    .select("enrollment_id")
    .in("enrollment_id", enrollmentIds)
    .eq("date", input.date)
    .returns<Array<{ enrollment_id: string }>>()

  if (existingError) {
    throw new Error(`Failed to look up existing attendance: ${existingError.message}`)
  }

  const existingEnrollmentIds = new Set((existing ?? []).map((row) => row.enrollment_id))

  const meaningful = input.rows.filter((row) => {
    if (existingEnrollmentIds.has(row.enrollment_id)) return true
    if (row.status !== "present") return true
    if (row.note) return true
    return false
  })

  const skipped = input.rows.length - meaningful.length

  if (meaningful.length === 0) {
    return { saved: 0, skipped }
  }

  const payload = meaningful.map((row) => ({
    enrollment_id: row.enrollment_id,
    date: input.date,
    status: row.status,
    note: row.note,
    recorded_by: input.recorded_by ?? null,
  }))

  const { error } = await getSupabase()
    .from("attendance_records")
    .upsert(payload, { onConflict: "enrollment_id,date" })

  if (error) {
    throw new Error(`Failed to save attendance: ${error.message}`)
  }
  return { saved: meaningful.length, skipped }
}

// ============================================================================
// Display helpers
// ============================================================================

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  tardy: "Tardy",
  excused: "Excused",
  left_early: "Left early",
}

export function attendanceStatusBadgeClass(status: AttendanceStatus): string {
  switch (status) {
    case "present":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "tardy":
      return "border border-amber-200 bg-amber-50 text-amber-800"
    case "left_early":
      return "border border-amber-200 bg-amber-50 text-amber-800"
    case "excused":
      return "border border-sky-200 bg-sky-50 text-sky-700"
    case "absent":
      return "border border-rose-200 bg-rose-50 text-rose-700"
  }
}

// Pacific-time today as ISO yyyy-mm-dd. Used as the default for the date
// picker on the attendance entry page. Done in plain JS instead of pulling
// in a date library — Intl gives us the regional date parts.
export function todayInPacific(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(new Date())
}
