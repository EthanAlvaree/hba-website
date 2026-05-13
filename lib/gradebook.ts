// lib/gradebook.ts
//
// Phase B (gradebook scaffolding) data layer. Categories + assignments live
// here; the section/student/profile primitives stay in lib/sis.ts.
//
// Scope today: category + assignment CRUD only. Score entry (the actual
// teacher gradebook UI) is a follow-up. The scores table in the 0003 migration
// is already provisioned so that follow-up doesn't need another migration.

import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

// ============================================================================
// Term-lock guard
// ============================================================================
//
// When a term has is_grades_locked = true, the gradebook for every section in
// that term is read-only. CRUD helpers below call assertSectionEditable
// before they mutate. The UI also surfaces a banner so users see *why* they
// can't edit, but this is the authoritative check.

export async function isSectionTermLocked(sectionId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("course_sections")
    .select("term:terms(is_grades_locked)")
    .eq("id", sectionId)
    .maybeSingle<{ term: { is_grades_locked: boolean } | null }>()

  if (error) {
    throw new Error(`Failed to look up term lock state: ${error.message}`)
  }
  return data?.term?.is_grades_locked === true
}

export async function assertSectionEditable(sectionId: string): Promise<void> {
  if (await isSectionTermLocked(sectionId)) {
    throw new Error(
      "This term is grade-locked. Unlock the term on the Terms tab before editing the gradebook."
    )
  }
}

// Variant for actions that operate on an assignment without knowing its
// section_id upfront — saves an extra round trip in the score-save path.
export async function assertAssignmentEditable(assignmentId: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from("assignments")
    .select("section:course_sections(term:terms(is_grades_locked))")
    .eq("id", assignmentId)
    .maybeSingle<{ section: { term: { is_grades_locked: boolean } | null } | null }>()

  if (error) {
    throw new Error(`Failed to look up term lock state: ${error.message}`)
  }
  if (data?.section?.term?.is_grades_locked) {
    throw new Error(
      "This term is grade-locked. Unlock the term on the Terms tab before editing the gradebook."
    )
  }
}

// ============================================================================
// Assignment categories
// ============================================================================

export type AssignmentCategoryRecord = {
  id: string
  created_at: string
  updated_at: string
  section_id: string
  name: string
  weight: number
  drop_lowest_count: number | null
  sort_order: number
}

const categoryColumns =
  "id, created_at, updated_at, section_id, name, weight, drop_lowest_count, sort_order"

const categoryFields = {
  section_id: z.uuid(),
  name: z.string().trim().min(1, "Name is required.").max(80),
  weight: z.coerce
    .number()
    .min(0, "Weight must be 0 or more.")
    .max(100, "Weight can't exceed 100.")
    .default(0),
  drop_lowest_count: z.coerce
    .number()
    .int()
    .min(0)
    .nullable(),
  sort_order: z.coerce.number().int().min(0).default(0),
}

export const assignmentCategoryCreateSchema = z.object(categoryFields)
export type AssignmentCategoryCreateInput = z.infer<typeof assignmentCategoryCreateSchema>

export const assignmentCategoryUpdateSchema = z.object({
  id: z.uuid(),
  ...categoryFields,
})
export type AssignmentCategoryUpdateInput = z.infer<typeof assignmentCategoryUpdateSchema>

export const assignmentCategoryDeleteSchema = z.object({
  id: z.uuid(),
  section_id: z.uuid(),
})
export type AssignmentCategoryDeleteInput = z.infer<typeof assignmentCategoryDeleteSchema>

export async function listAssignmentCategories(
  sectionId: string
): Promise<AssignmentCategoryRecord[]> {
  const { data, error } = await getSupabase()
    .from("assignment_categories")
    .select(categoryColumns)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .returns<AssignmentCategoryRecord[]>()

  if (error) {
    throw new Error(`Failed to list assignment categories: ${error.message}`)
  }
  return data
}

export async function createAssignmentCategory(
  input: AssignmentCategoryCreateInput
): Promise<AssignmentCategoryRecord> {
  await assertSectionEditable(input.section_id)
  const { data, error } = await getSupabase()
    .from("assignment_categories")
    .insert({
      section_id: input.section_id,
      name: input.name,
      weight: input.weight,
      drop_lowest_count: input.drop_lowest_count,
      sort_order: input.sort_order,
    })
    .select(categoryColumns)
    .single<AssignmentCategoryRecord>()

  if (error) {
    throw new Error(`Failed to create assignment category: ${error.message}`)
  }
  return data
}

export async function updateAssignmentCategory(
  input: AssignmentCategoryUpdateInput
): Promise<AssignmentCategoryRecord> {
  await assertSectionEditable(input.section_id)
  const { data, error } = await getSupabase()
    .from("assignment_categories")
    .update({
      name: input.name,
      weight: input.weight,
      drop_lowest_count: input.drop_lowest_count,
      sort_order: input.sort_order,
    })
    .eq("id", input.id)
    .select(categoryColumns)
    .single<AssignmentCategoryRecord>()

  if (error) {
    throw new Error(`Failed to update assignment category: ${error.message}`)
  }
  return data
}

export async function deleteAssignmentCategory(
  input: AssignmentCategoryDeleteInput
): Promise<void> {
  await assertSectionEditable(input.section_id)
  // Assignments under this category have their category_id set to null by
  // the FK's on delete set null behavior; we don't lose any assignment data.
  const { error } = await getSupabase()
    .from("assignment_categories")
    .delete()
    .eq("id", input.id)
    .eq("section_id", input.section_id)

  if (error) {
    throw new Error(`Failed to delete assignment category: ${error.message}`)
  }
}

// ============================================================================
// Assignments
// ============================================================================

export type AssignmentRecord = {
  id: string
  created_at: string
  updated_at: string
  section_id: string
  category_id: string | null
  title: string
  description: string | null
  assigned_date: string | null
  due_date: string | null
  points_possible: number
  is_published: boolean
  is_extra_credit: boolean
}

export type AssignmentWithCategory = AssignmentRecord & {
  category: { id: string; name: string } | null
}

const assignmentColumns =
  "id, created_at, updated_at, section_id, category_id, title, description, " +
  "assigned_date, due_date, points_possible, is_published, is_extra_credit"

const assignmentWithCategorySelect = `${assignmentColumns}, category:assignment_categories(id, name)`

const dateOrNull = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null))

const assignmentFields = {
  section_id: z.uuid(),
  category_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  title: z.string().trim().min(1, "Title is required.").max(200),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  assigned_date: dateOrNull,
  due_date: dateOrNull,
  points_possible: z.coerce
    .number()
    .min(0, "Points possible must be 0 or more.")
    .default(0),
  is_published: z.coerce.boolean().optional().default(false),
  is_extra_credit: z.coerce.boolean().optional().default(false),
}

export const assignmentCreateSchema = z.object(assignmentFields)
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>

export const assignmentUpdateSchema = z.object({
  id: z.uuid(),
  ...assignmentFields,
})
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>

export const assignmentDeleteSchema = z.object({
  id: z.uuid(),
  section_id: z.uuid(),
})
export type AssignmentDeleteInput = z.infer<typeof assignmentDeleteSchema>

export async function listAssignments(
  sectionId: string
): Promise<AssignmentWithCategory[]> {
  const { data, error } = await getSupabase()
    .from("assignments")
    .select(assignmentWithCategorySelect)
    // Sort: due_date ascending (with nulls last), then created_at ascending so
    // a teacher's draft order is preserved within the same due-date bucket.
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .eq("section_id", sectionId)
    .returns<AssignmentWithCategory[]>()

  if (error) {
    throw new Error(`Failed to list assignments: ${error.message}`)
  }
  return data
}

function assignmentRowFromInput(input: AssignmentCreateInput) {
  return {
    section_id: input.section_id,
    category_id: input.category_id,
    title: input.title,
    description: input.description,
    assigned_date: input.assigned_date,
    due_date: input.due_date,
    points_possible: input.points_possible,
    is_published: input.is_published,
    is_extra_credit: input.is_extra_credit,
  }
}

export async function createAssignment(
  input: AssignmentCreateInput
): Promise<AssignmentRecord> {
  await assertSectionEditable(input.section_id)
  const { data, error } = await getSupabase()
    .from("assignments")
    .insert(assignmentRowFromInput(input))
    .select(assignmentColumns)
    .single<AssignmentRecord>()

  if (error) {
    throw new Error(`Failed to create assignment: ${error.message}`)
  }
  return data
}

export async function updateAssignment(
  input: AssignmentUpdateInput
): Promise<AssignmentRecord> {
  await assertSectionEditable(input.section_id)
  const { id, ...rest } = input
  const { data, error } = await getSupabase()
    .from("assignments")
    .update(assignmentRowFromInput(rest))
    .eq("id", id)
    .select(assignmentColumns)
    .single<AssignmentRecord>()

  if (error) {
    throw new Error(`Failed to update assignment: ${error.message}`)
  }
  return data
}

export async function deleteAssignment(
  input: AssignmentDeleteInput
): Promise<void> {
  await assertSectionEditable(input.section_id)
  // Cascade-deletes the (enrollment, assignment) score rows from the 0003 FK.
  const { error } = await getSupabase()
    .from("assignments")
    .delete()
    .eq("id", input.id)
    .eq("section_id", input.section_id)

  if (error) {
    throw new Error(`Failed to delete assignment: ${error.message}`)
  }
}

// ============================================================================
// Scores
// ============================================================================

export const scoreKindSchema = z.enum([
  "numeric",
  "excused",
  "incomplete",
  "missing",
  "not_counted",
])
export type ScoreKind = z.infer<typeof scoreKindSchema>

export type ScoreRecord = {
  id: string
  created_at: string
  updated_at: string
  enrollment_id: string
  assignment_id: string
  kind: ScoreKind
  points_earned: number | null
  submitted_at: string | null
  graded_at: string | null
  feedback: string | null
}

const scoreColumns =
  "id, created_at, updated_at, enrollment_id, assignment_id, kind, " +
  "points_earned, submitted_at, graded_at, feedback"

export async function getAssignmentWithCategory(
  id: string
): Promise<AssignmentWithCategory | null> {
  const { data, error } = await getSupabase()
    .from("assignments")
    .select(assignmentWithCategorySelect)
    .eq("id", id)
    .maybeSingle<AssignmentWithCategory>()

  if (error) {
    throw new Error(`Failed to load assignment: ${error.message}`)
  }
  return data
}

export async function listScoresForAssignment(
  assignmentId: string
): Promise<ScoreRecord[]> {
  const { data, error } = await getSupabase()
    .from("scores")
    .select(scoreColumns)
    .eq("assignment_id", assignmentId)
    .returns<ScoreRecord[]>()

  if (error) {
    throw new Error(`Failed to list scores: ${error.message}`)
  }
  return data
}

export async function listScoresForEnrollment(
  enrollmentId: string
): Promise<ScoreRecord[]> {
  const { data, error } = await getSupabase()
    .from("scores")
    .select(scoreColumns)
    .eq("enrollment_id", enrollmentId)
    .returns<ScoreRecord[]>()

  if (error) {
    throw new Error(`Failed to list scores for enrollment: ${error.message}`)
  }
  return data
}

const scoreRowInputSchema = z.object({
  enrollment_id: z.uuid(),
  kind: scoreKindSchema,
  points_earned: z.union([z.coerce.number().min(0), z.null()]).default(null),
  feedback: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})

export const saveScoresInputSchema = z.object({
  assignment_id: z.uuid(),
  section_id: z.uuid(),
  rows: z.array(scoreRowInputSchema),
})
export type SaveScoresInput = z.infer<typeof saveScoresInputSchema>

// Treats kind='numeric' + no points + no feedback as an empty row (skipped).
// Anything else is upserted. Non-numeric kinds always clear points_earned so
// "excused" can't carry a stale numeric value.
export async function saveScoresForAssignment(
  input: SaveScoresInput
): Promise<{ saved: number; skipped: number }> {
  await assertSectionEditable(input.section_id)
  const meaningfulRows = input.rows.filter((row) => {
    if (row.kind !== "numeric") return true
    if (row.points_earned !== null) return true
    if (row.feedback) return true
    return false
  })

  const skipped = input.rows.length - meaningfulRows.length

  if (meaningfulRows.length === 0) {
    return { saved: 0, skipped }
  }

  const now = new Date().toISOString()
  const payload = meaningfulRows.map((row) => ({
    enrollment_id: row.enrollment_id,
    assignment_id: input.assignment_id,
    kind: row.kind,
    points_earned: row.kind === "numeric" ? row.points_earned : null,
    feedback: row.feedback,
    graded_at: now,
  }))

  const { error } = await getSupabase()
    .from("scores")
    .upsert(payload, { onConflict: "enrollment_id,assignment_id" })

  if (error) {
    throw new Error(`Failed to save scores: ${error.message}`)
  }

  return { saved: meaningfulRows.length, skipped }
}

// ============================================================================
// Helpers for the gradebook setup UI
// ============================================================================

export function totalCategoryWeight(categories: AssignmentCategoryRecord[]): number {
  return categories.reduce((sum, category) => sum + Number(category.weight), 0)
}

export function defaultCategoryTemplate(): Array<{
  name: string
  weight: number
  sort_order: number
}> {
  return [
    { name: "Homework", weight: 20, sort_order: 1 },
    { name: "Quizzes", weight: 20, sort_order: 2 },
    { name: "Tests", weight: 40, sort_order: 3 },
    { name: "Projects", weight: 15, sort_order: 4 },
    { name: "Participation", weight: 5, sort_order: 5 },
  ]
}

// Batched score fetch for one section. Used by the admin section detail page
// to show a "current grade" per enrolled student without N round trips.
export async function listScoresForAssignmentIds(
  assignmentIds: string[]
): Promise<ScoreRecord[]> {
  if (assignmentIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from("scores")
    .select(scoreColumns)
    .in("assignment_id", assignmentIds)
    .returns<ScoreRecord[]>()

  if (error) {
    throw new Error(`Failed to list scores by assignment ids: ${error.message}`)
  }
  return data
}

// ============================================================================
// Current grade calculation
// ============================================================================
//
// Pure function over (categories, assignments, scores). Same logic feeds the
// admin section roster and the student portal per-section page so the numbers
// can't drift between admin and student views.

export type CategoryBreakdown = {
  category_id: string
  name: string
  weight: number
  graded_count: number     // number of scores that contributed (post-drop)
  dropped_count: number    // number of scores dropped via drop_lowest_count
  earned: number           // sum of points_earned across contributing scores
  possible: number         // sum of points_possible across contributing scores (extra credit excluded)
  percentage: number | null // null when the category has nothing graded yet
}

export type GradeCalculation = {
  overall_percentage: number | null
  letter: string | null
  categories: CategoryBreakdown[]
}

type CalcInput = {
  categories: AssignmentCategoryRecord[]
  assignments: AssignmentRecord[]
  scores: ScoreRecord[]
}

export function calculateCurrentGrade(input: CalcInput): GradeCalculation {
  const scoreByAssignment = new Map<string, ScoreRecord>()
  for (const score of input.scores) {
    scoreByAssignment.set(score.assignment_id, score)
  }

  const assignmentsByCategory = new Map<string, AssignmentRecord[]>()
  for (const assignment of input.assignments) {
    if (!assignment.category_id) continue
    const bucket = assignmentsByCategory.get(assignment.category_id) ?? []
    bucket.push(assignment)
    assignmentsByCategory.set(assignment.category_id, bucket)
  }

  const breakdowns: CategoryBreakdown[] = []

  for (const category of input.categories) {
    const assignments = assignmentsByCategory.get(category.id) ?? []

    // Reduce each assignment to either a "counted" entry (earned/possible/pct)
    // or skip. kind=numeric with null points means "not yet graded".
    type Counted = { earned: number; possible: number; pct: number; isExtra: boolean }
    const counted: Counted[] = []

    for (const assignment of assignments) {
      const score = scoreByAssignment.get(assignment.id)
      const points_possible = Number(assignment.points_possible)

      if (!score) continue

      let earned: number | null = null
      switch (score.kind) {
        case "numeric":
          if (score.points_earned === null) continue
          earned = Number(score.points_earned)
          break
        case "missing":
          earned = 0
          break
        case "excused":
        case "incomplete":
        case "not_counted":
          continue
      }

      if (earned === null) continue

      counted.push({
        earned,
        possible: assignment.is_extra_credit ? 0 : points_possible,
        // pct used only for drop-lowest ordering. Use a stable comparable when
        // points_possible is 0 (otherwise division by zero produces NaN/Inf).
        pct: points_possible > 0 ? earned / points_possible : 0,
        isExtra: assignment.is_extra_credit,
      })
    }

    // Drop-lowest applies only to non-extra-credit scores, and only if there
    // are strictly more than `drop` of them — never drop all of them.
    const dropTarget = category.drop_lowest_count ?? 0
    const extraCredit = counted.filter((c) => c.isExtra)
    const regular = counted.filter((c) => !c.isExtra)
    const actualDrop = dropTarget > 0 && regular.length > dropTarget ? dropTarget : 0

    const keptRegular = [...regular]
      .sort((left, right) => left.pct - right.pct)
      .slice(actualDrop)

    let earned = 0
    let possible = 0
    for (const c of keptRegular) {
      earned += c.earned
      possible += c.possible
    }
    for (const ec of extraCredit) {
      earned += ec.earned
      // possible stays at 0 for extra credit
    }

    const gradedCount = keptRegular.length + extraCredit.length

    breakdowns.push({
      category_id: category.id,
      name: category.name,
      weight: Number(category.weight),
      graded_count: gradedCount,
      dropped_count: actualDrop,
      earned,
      possible,
      percentage: possible > 0 ? (earned / possible) * 100 : null,
    })
  }

  // Renormalize: only categories with a percentage contribute, and their
  // weights are scaled so they sum to 100. This means an empty category does
  // not drag the whole grade down before it has graded work.
  let weightedSum = 0
  let weightTotal = 0
  for (const breakdown of breakdowns) {
    if (breakdown.percentage === null) continue
    weightedSum += breakdown.percentage * breakdown.weight
    weightTotal += breakdown.weight
  }
  const overall = weightTotal > 0 ? weightedSum / weightTotal : null

  return {
    overall_percentage: overall,
    letter: overall === null ? null : letterGrade(overall),
    categories: breakdowns,
  }
}

// Grade-point lookup for a letter grade. Used for GPA calculation.
// Standard +/- US 4.0 scale. F = 0.0.
export function gradePoints(letter: string): number {
  switch (letter) {
    case "A":
      return 4.0
    case "A-":
      return 3.7
    case "B+":
      return 3.3
    case "B":
      return 3.0
    case "B-":
      return 2.7
    case "C+":
      return 2.3
    case "C":
      return 2.0
    case "C-":
      return 1.7
    case "D+":
      return 1.3
    case "D":
      return 1.0
    case "D-":
      return 0.7
    case "F":
      return 0.0
    default:
      return 0.0
  }
}

// Weighted grade-point bonus by course flags. Standard US convention:
// AP +1.0, Honors +0.5. Returns the unweighted points for F regardless of
// flags — failing a weighted course doesn't earn bonus points.
export function weightedGradePoints(
  letter: string,
  flags: { is_ap: boolean; is_honors: boolean }
): number {
  const base = gradePoints(letter)
  if (base === 0) return 0
  if (flags.is_ap) return base + 1.0
  if (flags.is_honors) return base + 0.5
  return base
}

// Standard +/- US grade scale. Hardcoded for now; can be made configurable
// per-school (or per-section) if HBA's grading rubric ever differs.
export function letterGrade(percentage: number): string {
  if (percentage >= 93) return "A"
  if (percentage >= 90) return "A-"
  if (percentage >= 87) return "B+"
  if (percentage >= 83) return "B"
  if (percentage >= 80) return "B-"
  if (percentage >= 77) return "C+"
  if (percentage >= 73) return "C"
  if (percentage >= 70) return "C-"
  if (percentage >= 67) return "D+"
  if (percentage >= 63) return "D"
  if (percentage >= 60) return "D-"
  return "F"
}

// ============================================================================
// Lock / unlock final grades for a section
// ============================================================================
//
// Locking snapshots each enrollment's current calculated grade (over ALL of
// the section's assignments, drafts included — admin computation) into the
// `enrollments.final_grade_percentage` + `final_grade_letter` columns and
// sets `grade_locked = true`. Subsequent edits to assignments/scores don't
// move the locked snapshot — admin must explicitly unlock to recompute.

export type SectionLockResult = {
  locked: number    // number of enrollments whose snapshot was written
  cleared: number   // number of enrollments where the calc produced no grade (still locked, with null)
}

export async function lockSectionFinalGrades(
  sectionId: string
): Promise<SectionLockResult> {
  const supabase = getSupabase()

  // Pull the section's grading inputs in one round trip each.
  const [categoriesRes, assignmentsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from("assignment_categories")
      .select(categoryColumns)
      .eq("section_id", sectionId)
      .returns<AssignmentCategoryRecord[]>(),
    supabase
      .from("assignments")
      .select(assignmentColumns)
      .eq("section_id", sectionId)
      .returns<AssignmentRecord[]>(),
    supabase
      .from("enrollments")
      .select("id, section_id, status")
      .eq("section_id", sectionId)
      .returns<Array<{ id: string; section_id: string; status: string }>>(),
  ])

  if (categoriesRes.error) throw new Error(categoriesRes.error.message)
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
  if (enrollmentsRes.error) throw new Error(enrollmentsRes.error.message)

  const categories = categoriesRes.data ?? []
  const assignments = assignmentsRes.data ?? []
  const enrollments = enrollmentsRes.data ?? []

  // Fetch every score for the section once.
  const allScores = await listScoresForAssignmentIds(assignments.map((a) => a.id))
  const scoresByEnrollment = new Map<string, ScoreRecord[]>()
  for (const score of allScores) {
    const bucket = scoresByEnrollment.get(score.enrollment_id) ?? []
    bucket.push(score)
    scoresByEnrollment.set(score.enrollment_id, bucket)
  }

  let locked = 0
  let cleared = 0

  for (const enrollment of enrollments) {
    const grade = calculateCurrentGrade({
      categories,
      assignments,
      scores: scoresByEnrollment.get(enrollment.id) ?? [],
    })

    const patch: Record<string, unknown> = {
      grade_locked: true,
      final_grade_percentage: grade.overall_percentage,
      final_grade_letter: grade.letter,
    }

    const { error } = await supabase
      .from("enrollments")
      .update(patch)
      .eq("id", enrollment.id)

    if (error) {
      throw new Error(`Failed to lock enrollment ${enrollment.id}: ${error.message}`)
    }

    if (grade.overall_percentage === null) {
      cleared += 1
    } else {
      locked += 1
    }
  }

  return { locked, cleared }
}

export type TermLockResult = {
  sections_locked: number  // sections processed
  enrollments_locked: number
  enrollments_cleared: number
}

// Fan-out helper: lock every section in a term. Useful at term end so the
// admin doesn't have to click into 30 sections one by one. Skips sections
// that contain no enrollments.
export async function lockTermFinalGrades(termId: string): Promise<TermLockResult> {
  const { data: sections, error } = await getSupabase()
    .from("course_sections")
    .select("id")
    .eq("term_id", termId)
    .returns<Array<{ id: string }>>()

  if (error) {
    throw new Error(`Failed to list sections for term: ${error.message}`)
  }

  let enrollments_locked = 0
  let enrollments_cleared = 0
  let sections_locked = 0

  for (const section of sections ?? []) {
    const result = await lockSectionFinalGrades(section.id)
    enrollments_locked += result.locked
    enrollments_cleared += result.cleared
    if (result.locked + result.cleared > 0) {
      sections_locked += 1
    }
  }

  return { sections_locked, enrollments_locked, enrollments_cleared }
}

export async function unlockTermFinalGrades(termId: string): Promise<number> {
  const { data: sections, error } = await getSupabase()
    .from("course_sections")
    .select("id")
    .eq("term_id", termId)
    .returns<Array<{ id: string }>>()

  if (error) {
    throw new Error(`Failed to list sections for term: ${error.message}`)
  }

  let total = 0
  for (const section of sections ?? []) {
    total += await unlockSectionFinalGrades(section.id)
  }
  return total
}

export async function unlockSectionFinalGrades(sectionId: string): Promise<number> {
  // Clear the snapshot. Future renders recompute from scores. We keep this
  // distinct from "edit final grade by hand" — if the admin wants to override
  // the calc, the right move is to fix scores, then lock.
  const { error, count } = await getSupabase()
    .from("enrollments")
    .update(
      {
        grade_locked: false,
        final_grade_percentage: null,
        final_grade_letter: null,
      },
      { count: "exact" }
    )
    .eq("section_id", sectionId)

  if (error) {
    throw new Error(`Failed to unlock section grades: ${error.message}`)
  }
  return count ?? 0
}

// Returns published assignments due in the [dueFrom, dueTo] range across
// every section in `sectionIds`. The result row carries section context so
// the student portal "what's due this week" view can show the course name.
export type UpcomingAssignmentRow = AssignmentWithCategory & {
  section: {
    id: string
    course: { name: string; code: string } | null
  } | null
}
export async function listUpcomingAssignmentsForSections(
  sectionIds: string[],
  dueFrom: string,
  dueTo: string
): Promise<UpcomingAssignmentRow[]> {
  if (sectionIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from("assignments")
    .select(
      `${assignmentColumns}, category:assignment_categories(id, name),
       section:course_sections(id, course:courses(name, code))`
    )
    .in("section_id", sectionIds)
    .eq("is_published", true)
    .gte("due_date", dueFrom)
    .lte("due_date", dueTo)
    .order("due_date", { ascending: true })
    .returns<UpcomingAssignmentRow[]>()
  if (error) throw new Error(`Failed to list upcoming assignments: ${error.message}`)
  return data
}

// Published-only assignment fetch — used by the student/parent portal so
// drafts stay hidden until the teacher publishes.
export async function listPublishedAssignmentsForSection(
  sectionId: string
): Promise<AssignmentWithCategory[]> {
  const { data, error } = await getSupabase()
    .from("assignments")
    .select(assignmentWithCategorySelect)
    .eq("section_id", sectionId)
    .eq("is_published", true)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<AssignmentWithCategory[]>()

  if (error) {
    throw new Error(`Failed to list published assignments: ${error.message}`)
  }
  return data
}
