// lib/transcripts.ts
//
// Transcript aggregation: locked enrollments → per-term GPA + cumulative GPA.
// Both unweighted and weighted (AP +1.0 / Honors +0.5) numbers are computed;
// the transcript page shows both side-by-side for college-application use.

import { createClient } from "@supabase/supabase-js"
import { gradePoints, weightedGradePoints } from "@/lib/gradebook"
import type {
  SectionModality,
  SectionPeriod,
  StudentRecord,
} from "@/lib/sis"

// ============================================================================
// Supabase client (lazy, mirrors the other lib modules)
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
// Shape
// ============================================================================

export type TranscriptCourse = {
  enrollment_id: string
  course_code: string
  course_name: string
  credit_hours: number
  is_ap: boolean
  is_honors: boolean
  is_elective: boolean
  modality: SectionModality
  period: SectionPeriod | null
  section_code: string | null
  final_grade_letter: string | null
  final_grade_percentage: number | null
  // Per-course grade points (used in GPA math). Null when no letter grade.
  unweighted_points: number | null
  weighted_points: number | null
}

export type TranscriptTerm = {
  term_id: string
  term_name: string
  academic_year: string
  start_date: string
  end_date: string
  courses: TranscriptCourse[]
  // Term-level rollups: GPA across the term's courses, weighted by credit_hours.
  term_credits_attempted: number
  term_credits_earned: number    // credit_hours where letter ≠ 'F'
  term_gpa: number | null
  term_gpa_weighted: number | null
}

export type Transcript = {
  student: Pick<
    StudentRecord,
    | "id"
    | "legal_first_name"
    | "legal_middle_name"
    | "legal_last_name"
    | "suffix"
    | "preferred_name"
    | "dob"
    | "current_grade"
    | "registered_at_hba"
    | "graduated_at"
    | "status"
  > & { hba_email: string | null }
  terms: TranscriptTerm[]
  cumulative_credits_attempted: number
  cumulative_credits_earned: number
  cumulative_gpa: number | null
  cumulative_gpa_weighted: number | null
  generated_at: string
}

// ============================================================================
// Builder
// ============================================================================

// Returns null when the student doesn't exist. Otherwise always returns a
// Transcript, possibly with zero terms (a new student with no locked grades).
export async function buildTranscriptForStudent(
  studentId: string
): Promise<Transcript | null> {
  const supabase = getSupabase()

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select(
      `id, legal_first_name, legal_middle_name, legal_last_name, suffix,
       preferred_name, dob, current_grade, registered_at_hba, graduated_at, status,
       profile:profiles(email)`
    )
    .eq("id", studentId)
    .maybeSingle<
      Pick<
        StudentRecord,
        | "id"
        | "legal_first_name"
        | "legal_middle_name"
        | "legal_last_name"
        | "suffix"
        | "preferred_name"
        | "dob"
        | "current_grade"
        | "registered_at_hba"
        | "graduated_at"
        | "status"
      > & { profile: { email: string } | null }
    >()

  if (studentError) {
    throw new Error(`Failed to load student for transcript: ${studentError.message}`)
  }
  if (!studentRow) return null

  // Pull all locked enrollments for the student, including the joined course
  // (for code/name/credit_hours/AP/Honors flags) and the term (for
  // grouping + sort order).
  type EnrollmentRow = {
    id: string
    final_grade_letter: string | null
    final_grade_percentage: number | null
    grade_locked: boolean
    section: {
      id: string
      section_code: string | null
      period: SectionPeriod | null
      modality: SectionModality
      course: {
        id: string
        code: string
        name: string
        credit_hours: number
        is_ap: boolean
        is_honors: boolean
        is_elective: boolean
      } | null
      term: {
        id: string
        name: string
        slug: string
        academic_year: string
        start_date: string
        end_date: string
      } | null
    } | null
  }

  const { data: enrollmentRows, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select(
      `id, final_grade_letter, final_grade_percentage, grade_locked,
       section:course_sections(
         id, section_code, period, modality,
         course:courses(id, code, name, credit_hours, is_ap, is_honors, is_elective),
         term:terms(id, name, slug, academic_year, start_date, end_date)
       )`
    )
    .eq("student_id", studentId)
    .eq("grade_locked", true)
    .returns<EnrollmentRow[]>()

  if (enrollmentsError) {
    throw new Error(`Failed to load transcript enrollments: ${enrollmentsError.message}`)
  }

  // Bucket by term.
  type Bucket = TranscriptTerm
  const buckets = new Map<string, Bucket>()

  for (const enrollment of enrollmentRows ?? []) {
    const section = enrollment.section
    const term = section?.term
    const course = section?.course
    if (!section || !term || !course) {
      // Defensive: an enrollment whose section/course/term was deleted is
      // structurally broken. Skip rather than crash the transcript.
      continue
    }

    const letter = enrollment.final_grade_letter
    const unweighted = letter ? gradePoints(letter) : null
    const weighted = letter
      ? weightedGradePoints(letter, { is_ap: course.is_ap, is_honors: course.is_honors })
      : null

    const transcriptCourse: TranscriptCourse = {
      enrollment_id: enrollment.id,
      course_code: course.code,
      course_name: course.name,
      credit_hours: Number(course.credit_hours),
      is_ap: course.is_ap,
      is_honors: course.is_honors,
      is_elective: course.is_elective,
      modality: section.modality,
      period: section.period,
      section_code: section.section_code,
      final_grade_letter: letter,
      final_grade_percentage:
        enrollment.final_grade_percentage === null
          ? null
          : Number(enrollment.final_grade_percentage),
      unweighted_points: unweighted,
      weighted_points: weighted,
    }

    const existing = buckets.get(term.id)
    if (existing) {
      existing.courses.push(transcriptCourse)
    } else {
      buckets.set(term.id, {
        term_id: term.id,
        term_name: term.name,
        academic_year: term.academic_year,
        start_date: term.start_date,
        end_date: term.end_date,
        courses: [transcriptCourse],
        term_credits_attempted: 0,
        term_credits_earned: 0,
        term_gpa: null,
        term_gpa_weighted: null,
      })
    }
  }

  // Compute per-term rollups, then cumulative across all terms.
  let cumWeightedPoints = 0
  let cumWeightedPointsW = 0
  let cumCredits = 0
  let cumCreditsEarned = 0

  for (const bucket of buckets.values()) {
    // Sort courses inside a term for stable display: required courses first
    // by code, then electives.
    bucket.courses.sort((left, right) => {
      if (left.is_elective !== right.is_elective) {
        return left.is_elective ? 1 : -1
      }
      return left.course_code.localeCompare(right.course_code)
    })

    let pointsXCredit = 0
    let pointsXCreditW = 0
    let credits = 0
    let creditsEarned = 0

    for (const course of bucket.courses) {
      if (course.unweighted_points === null) continue
      credits += course.credit_hours
      pointsXCredit += course.unweighted_points * course.credit_hours
      pointsXCreditW += (course.weighted_points ?? course.unweighted_points) * course.credit_hours
      if (course.final_grade_letter !== "F") {
        creditsEarned += course.credit_hours
      }
    }

    bucket.term_credits_attempted = credits
    bucket.term_credits_earned = creditsEarned
    bucket.term_gpa = credits > 0 ? pointsXCredit / credits : null
    bucket.term_gpa_weighted = credits > 0 ? pointsXCreditW / credits : null

    cumWeightedPoints += pointsXCredit
    cumWeightedPointsW += pointsXCreditW
    cumCredits += credits
    cumCreditsEarned += creditsEarned
  }

  const terms = [...buckets.values()].sort((left, right) =>
    left.start_date.localeCompare(right.start_date)
  )

  return {
    student: {
      id: studentRow.id,
      legal_first_name: studentRow.legal_first_name,
      legal_middle_name: studentRow.legal_middle_name,
      legal_last_name: studentRow.legal_last_name,
      suffix: studentRow.suffix,
      preferred_name: studentRow.preferred_name,
      dob: studentRow.dob,
      current_grade: studentRow.current_grade,
      registered_at_hba: studentRow.registered_at_hba,
      graduated_at: studentRow.graduated_at,
      status: studentRow.status,
      hba_email: studentRow.profile?.email ?? null,
    },
    terms,
    cumulative_credits_attempted: cumCredits,
    cumulative_credits_earned: cumCreditsEarned,
    cumulative_gpa: cumCredits > 0 ? cumWeightedPoints / cumCredits : null,
    cumulative_gpa_weighted: cumCredits > 0 ? cumWeightedPointsW / cumCredits : null,
    generated_at: new Date().toISOString(),
  }
}
