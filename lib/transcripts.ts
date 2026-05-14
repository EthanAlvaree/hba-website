// lib/transcripts.ts
//
// Transcript aggregation: locked enrollments → per-term GPA + cumulative GPA.
// Both unweighted and weighted (AP +1.0 / Honors +0.5) numbers are computed;
// the transcript page shows both side-by-side for college-application use.

import { gradePoints, weightedGradePoints } from "@/lib/gradebook"
import {
  listAcademicHistory,
  type AcademicHistorySource,
} from "@/lib/academic-history"
import type {
  SectionModality,
  SectionPeriod,
  StudentRecord,
} from "@/lib/sis"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

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

// One row of transfer / external coursework (from academic_history).
// Not an HBA enrollment — rendered in its own transcript section and
// folded into the cumulative GPA only, never the HBA-only GPA.
export type TransferCourse = {
  id: string
  title: string
  school_name: string
  academic_year: string | null
  term_label: string | null
  source: AcademicHistorySource
  subject_area: string | null
  grade_letter: string | null
  credits: number
  is_ap: boolean
  is_honors: boolean
  counts_toward_gpa: boolean
  // Retaken at HBA — stays visible but excluded from GPA + credit math.
  superseded: boolean
  unweighted_points: number | null
  weighted_points: number | null
}

export type TranscriptTerm = {
  term_id: string
  term_slug: string
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
  // Transfer / external coursework, ordered for display.
  transfer_courses: TransferCourse[]
  // HBA-only rollups — locked HBA enrollments, nothing else.
  hba_credits_attempted: number
  hba_credits_earned: number
  hba_gpa: number | null
  hba_gpa_weighted: number | null
  // Cumulative rollups — HBA enrollments + accepted (non-superseded)
  // transfer credit. Superseded retakes are excluded; credit-only
  // transfer rows count for credit but not GPA.
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

  // Transfer / external coursework. Unioned into the cumulative GPA
  // below; never touches the HBA-only GPA.
  const academicHistory = await listAcademicHistory(studentId)

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
        term_slug: term.slug,
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

  // Compute per-term rollups, then the HBA-only rollup across all terms.
  let hbaPoints = 0
  let hbaPointsW = 0
  let hbaCredits = 0
  let hbaCreditsEarned = 0

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

    hbaPoints += pointsXCredit
    hbaPointsW += pointsXCreditW
    hbaCredits += credits
    hbaCreditsEarned += creditsEarned
  }

  const terms = [...buckets.values()].sort((left, right) =>
    left.start_date.localeCompare(right.start_date)
  )

  // Fold in transfer / external coursework. Three buckets of behavior:
  //  - superseded (retaken at HBA): excluded from GPA and credit, but
  //    still rendered on the transcript.
  //  - counts_toward_gpa = false (credit-only / Pass): earns credit,
  //    skipped in GPA math.
  //  - otherwise: full participation in cumulative GPA + credit.
  // A row with no letter grade is treated as in-progress — rendered,
  // but contributes nothing.
  let transferPoints = 0
  let transferPointsW = 0
  let transferGpaCredits = 0
  let transferCreditsAttempted = 0
  let transferCreditsEarned = 0

  const transfer_courses: TransferCourse[] = academicHistory.map((row) => {
    const letter = row.grade_letter
    const unweighted = letter ? gradePoints(letter) : null
    const weighted = letter
      ? weightedGradePoints(letter, {
          is_ap: row.is_ap,
          is_honors: row.is_honors,
        })
      : null

    if (letter && !row.superseded) {
      transferCreditsAttempted += row.credits
      if (letter !== "F") transferCreditsEarned += row.credits
      if (row.counts_toward_gpa && unweighted !== null) {
        transferPoints += unweighted * row.credits
        transferPointsW += (weighted ?? unweighted) * row.credits
        transferGpaCredits += row.credits
      }
    }

    return {
      id: row.id,
      title: row.title,
      school_name: row.school_name,
      academic_year: row.academic_year,
      term_label: row.term_label,
      source: row.source,
      subject_area: row.subject_area,
      grade_letter: letter,
      credits: row.credits,
      is_ap: row.is_ap,
      is_honors: row.is_honors,
      counts_toward_gpa: row.counts_toward_gpa,
      superseded: row.superseded,
      unweighted_points: unweighted,
      weighted_points: weighted,
    }
  })

  const cumGpaCredits = hbaCredits + transferGpaCredits
  const cumCreditsAttempted = hbaCredits + transferCreditsAttempted
  const cumCreditsEarned = hbaCreditsEarned + transferCreditsEarned

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
    transfer_courses,
    hba_credits_attempted: hbaCredits,
    hba_credits_earned: hbaCreditsEarned,
    hba_gpa: hbaCredits > 0 ? hbaPoints / hbaCredits : null,
    hba_gpa_weighted: hbaCredits > 0 ? hbaPointsW / hbaCredits : null,
    cumulative_credits_attempted: cumCreditsAttempted,
    cumulative_credits_earned: cumCreditsEarned,
    cumulative_gpa:
      cumGpaCredits > 0 ? (hbaPoints + transferPoints) / cumGpaCredits : null,
    cumulative_gpa_weighted:
      cumGpaCredits > 0 ? (hbaPointsW + transferPointsW) / cumGpaCredits : null,
    generated_at: new Date().toISOString(),
  }
}
