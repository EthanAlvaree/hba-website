// lib/academic-history.ts
//
// Transfer / external coursework: classes a student completed at another
// school before (or alongside) HBA. These rows are NOT HBA enrollments —
// the scheduler never sees them, HBA never re-grades them. They exist so
// the HBA transcript can show a true cumulative record.
//
// See db/migrations/0034-academic-history.sql for the table + the retake
// (`superseded`) model.

import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"
import { subjectAreas } from "@/lib/scheduler"

// ============================================================================
// Shape
// ============================================================================

export const academicHistorySources = [
  "transfer",
  "summer",
  "concurrent",
  "other",
] as const
export type AcademicHistorySource = (typeof academicHistorySources)[number]

export const academicHistorySourceLabels: Record<AcademicHistorySource, string> =
  {
    transfer: "Transfer credit",
    summer: "Summer school",
    concurrent: "Concurrent enrollment",
    other: "Other",
  }

// Standard +/- US letters. Mirrors lib/gradebook's gradePoints scale.
export const academicHistoryGradeLetters = [
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
] as const

export type AcademicHistoryRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  title: string
  school_name: string
  academic_year: string | null
  term_label: string | null
  grade_letter: string | null
  credits: number
  subject_area: string | null
  course_id: string | null
  source: AcademicHistorySource
  is_ap: boolean
  is_honors: boolean
  counts_toward_gpa: boolean
  superseded: boolean
  notes: string | null
}

const columns =
  "id, created_at, updated_at, student_id, title, school_name, " +
  "academic_year, term_label, grade_letter, credits, subject_area, " +
  "course_id, source, is_ap, is_honors, counts_toward_gpa, superseded, notes"

// ============================================================================
// Validation
// ============================================================================

// Empty string → null, otherwise trimmed. Form fields submit "" for blank.
const blankToNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()

const gradeLetterField = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine(
    (v) => v === null || (academicHistoryGradeLetters as readonly string[]).includes(v),
    "Grade must be a standard letter (A through F) or left blank."
  )

const subjectAreaField = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine(
    (v) => v === null || (subjectAreas as readonly string[]).includes(v),
    "Pick a valid subject area or leave it unassigned."
  )

const courseIdField = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .refine(
    (v) => v === null || z.uuid().safeParse(v).success,
    "Invalid course reference."
  )

const baseFields = {
  title: z.string().trim().min(1, "Course title is required.").max(200),
  school_name: z.string().trim().min(1, "School name is required.").max(200),
  academic_year: blankToNull(40),
  term_label: blankToNull(60),
  grade_letter: gradeLetterField,
  credits: z.coerce
    .number()
    .min(0, "Credits can't be negative.")
    .max(20, "Credits can't exceed 20."),
  subject_area: subjectAreaField,
  course_id: courseIdField,
  source: z.enum(academicHistorySources).default("transfer"),
  is_ap: z.coerce.boolean().default(false),
  is_honors: z.coerce.boolean().default(false),
  counts_toward_gpa: z.coerce.boolean().default(true),
  superseded: z.coerce.boolean().default(false),
  notes: blankToNull(2000),
}

export const academicHistoryCreateSchema = z.object({
  student_id: z.uuid(),
  ...baseFields,
})

export const academicHistoryUpdateSchema = z.object({
  id: z.uuid(),
  ...baseFields,
})

export const academicHistoryDeleteSchema = z.object({
  id: z.uuid(),
})

export type AcademicHistoryCreateInput = z.infer<
  typeof academicHistoryCreateSchema
>
export type AcademicHistoryUpdateInput = z.infer<
  typeof academicHistoryUpdateSchema
>

// ============================================================================
// CRUD
// ============================================================================

export async function listAcademicHistory(
  studentId: string
): Promise<AcademicHistoryRecord[]> {
  const { data, error } = await getSupabase()
    .from("academic_history")
    .select(columns)
    .eq("student_id", studentId)
    .order("academic_year", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .returns<AcademicHistoryRecord[]>()
  if (error) {
    throw new Error(`Failed to load academic history: ${error.message}`)
  }
  return (data ?? []).map((r) => ({ ...r, credits: Number(r.credits) }))
}

export async function createAcademicHistoryEntry(
  input: AcademicHistoryCreateInput
): Promise<AcademicHistoryRecord> {
  const { data, error } = await getSupabase()
    .from("academic_history")
    .insert(input)
    .select(columns)
    .single<AcademicHistoryRecord>()
  if (error) {
    throw new Error(`Failed to add academic history entry: ${error.message}`)
  }
  return { ...data, credits: Number(data.credits) }
}

export async function updateAcademicHistoryEntry(
  input: AcademicHistoryUpdateInput
): Promise<AcademicHistoryRecord> {
  const { id, ...fields } = input
  const { data, error } = await getSupabase()
    .from("academic_history")
    .update(fields)
    .eq("id", id)
    .select(columns)
    .single<AcademicHistoryRecord>()
  if (error) {
    throw new Error(`Failed to update academic history entry: ${error.message}`)
  }
  return { ...data, credits: Number(data.credits) }
}

export async function deleteAcademicHistoryEntry(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("academic_history")
    .delete()
    .eq("id", id)
  if (error) {
    throw new Error(`Failed to delete academic history entry: ${error.message}`)
  }
}

// Used by the transcript builder. Returns just the student's id for an
// entry — cheap lookup so an admin action can revalidate the right page.
export async function getAcademicHistoryStudentId(
  id: string
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("academic_history")
    .select("student_id")
    .eq("id", id)
    .maybeSingle<{ student_id: string }>()
  if (error) {
    throw new Error(`Failed to look up academic history entry: ${error.message}`)
  }
  return data?.student_id ?? null
}
