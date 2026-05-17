// lib/applications.ts
//
// Applications system: intake form (draft + submit), magic-link resume,
// admin queue. Mirrors the contact-submissions module but with a richer
// data model split across draft-state vs submit-state validation.

import { z } from "zod"
import { randomBytes } from "node:crypto"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

// ============================================================================
// Enum schemas
// ============================================================================

export const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "in_review",
  "info_requested",
  "admit_offered",
  "accepted",
  "declined",
  "withdrawn",
  "enrolled",
  "archived",
])

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>

export const applicationEnrollmentTypeSchema = z.enum([
  "summer",
  "part_time",
  "full_time",
])

export type ApplicationEnrollmentType = z.infer<typeof applicationEnrollmentTypeSchema>

// ============================================================================
// Optional-string helper — turns "" into undefined and keeps validation simple
// ============================================================================

const optionalString = (max: number, name?: string) =>
  z
    .string()
    .trim()
    .max(max, name ? `${name} is too long.` : undefined)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))

const optionalEmail = (max = 320) =>
  z
    .union([z.email("Please enter a valid email address.").max(max), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))

const optionalDate = () =>
  z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))

const optionalBool = () => z.coerce.boolean().optional().default(false)

// ============================================================================
// Prior schools jsonb — array of { name, note? }
// ============================================================================

export const priorSchoolSchema = z.object({
  name: z.string().trim().min(1).max(200),
  note: optionalString(2000),
})

export type PriorSchool = z.infer<typeof priorSchoolSchema>

const priorSchoolsField = z
  .array(priorSchoolSchema)
  .max(10, "Please limit prior schools to ten or fewer.")
  .default([])

// ============================================================================
// Course interest jsonb — array of course identifiers (strings, matched to
// lib/summer-courses by `name`)
// ============================================================================

const courseInterestField = z
  .array(z.string().trim().min(1).max(200))
  .max(20, "Please limit course interest to twenty or fewer.")
  .default([])

// ============================================================================
// Base field shapes — used by both draft and submit schemas
// ============================================================================

const baseFields = {
  enrollment_type: applicationEnrollmentTypeSchema.optional(),

  // Student
  student_first_name: optionalString(80, "First name"),
  student_middle_name: optionalString(80, "Middle name"),
  student_last_name: optionalString(80, "Last name"),
  student_suffix: optionalString(20, "Suffix"),
  student_preferred_name: optionalString(80, "Preferred name"),
  student_dob: optionalDate(),
  student_gender: optionalString(40, "Gender"),
  student_pronouns: optionalString(40, "Pronouns"),
  student_birthplace: optionalString(200, "Birthplace"),
  student_primary_language: optionalString(80, "Primary language"),
  student_secondary_language: optionalString(80, "Secondary language"),
  student_english_proficiency: optionalString(40, "English proficiency"),
  student_current_grade: optionalString(20, "Current grade"),
  student_desired_grade: optionalString(20, "Desired grade"),
  // Class-of year (graduating from 12th). Optional on draft; required
  // on submit so the M365 UPN (f.l.YY) is unambiguous in mid-year /
  // between-grades situations.
  student_graduation_year: z
    .union([z.coerce.number().int().min(1900).max(2100), z.literal("")])
    .optional()
    .transform((value) => (typeof value === "number" ? value : undefined)),
  // Domestic / international flag. Optional on draft; required on
  // submit so we know which tuition table to apply and whether to
  // collect F-1 / passport docs. Form sends "domestic" or
  // "international" strings; mapped to boolean here.
  student_is_international: z
    .union([z.literal("domestic"), z.literal("international"), z.literal("")])
    .optional()
    .transform((value) => {
      if (value === "international") return true
      if (value === "domestic") return false
      return undefined
    }),
  student_personal_email: optionalEmail(),
  student_phone: optionalString(40, "Phone"),
  student_address_line1: optionalString(200, "Street address"),
  student_address_line2: optionalString(200, "Address line 2"),
  student_address_city: optionalString(120, "City"),
  student_address_region: optionalString(120, "State/region"),
  student_address_postal_code: optionalString(40, "Postal code"),
  student_address_country: optionalString(120, "Country"),

  // Guardian 1
  guardian1_name: optionalString(200, "Guardian name"),
  guardian1_relationship: optionalString(80, "Relationship"),
  guardian1_mobile: optionalString(40, "Mobile phone"),
  guardian1_work_phone: optionalString(40, "Work phone"),
  guardian1_email: optionalEmail(),
  guardian1_address_same_as_student: optionalBool(),
  guardian1_address_line1: optionalString(200),
  guardian1_address_line2: optionalString(200),
  guardian1_address_city: optionalString(120),
  guardian1_address_region: optionalString(120),
  guardian1_address_postal_code: optionalString(40),
  guardian1_address_country: optionalString(120),

  // Guardian 2 (optional)
  guardian2_name: optionalString(200),
  guardian2_relationship: optionalString(80),
  guardian2_mobile: optionalString(40),
  guardian2_work_phone: optionalString(40),
  guardian2_email: optionalEmail(),
  guardian2_address_same_as_student: optionalBool(),
  guardian2_address_line1: optionalString(200),
  guardian2_address_line2: optionalString(200),
  guardian2_address_city: optionalString(120),
  guardian2_address_region: optionalString(120),
  guardian2_address_postal_code: optionalString(40),
  guardian2_address_country: optionalString(120),

  // Homestay (optional)
  has_homestay: optionalBool(),
  homestay_name: optionalString(200),
  homestay_relationship: optionalString(80),
  homestay_mobile: optionalString(40),
  homestay_work_phone: optionalString(40),
  homestay_email: optionalEmail(),
  homestay_address_line1: optionalString(200),
  homestay_address_line2: optionalString(200),
  homestay_address_city: optionalString(120),
  homestay_address_region: optionalString(120),
  homestay_address_postal_code: optionalString(40),
  homestay_address_country: optionalString(120),

  // jsonb fields
  course_interest: courseInterestField,
  prior_schools: priorSchoolsField,

  // free text
  how_did_you_hear: optionalString(400),
  notes_from_family: optionalString(4000),
}

// ============================================================================
// Draft schema — fields the magic-link save endpoint accepts.
// Almost everything is optional so partial state is allowed.
// ============================================================================

export const applicationDraftSchema = z.object({
  ...baseFields,
  draft_token: optionalString(128),
  // Email is required when first creating a draft so we can send the magic
  // link; for subsequent updates it can be omitted (already on the row).
  draft_email: optionalEmail(),
  // Spam protection on first-draft creation only.
  turnstile_token: optionalString(2000),
  submitted_at: optionalString(40),
  website: optionalString(200), // honeypot — checked at the route level
})

export type ApplicationDraftInput = z.infer<typeof applicationDraftSchema>

// ============================================================================
// Submit schema — final submission. Required fields enforced here.
// ============================================================================

const requiredString = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max)

export const applicationSubmitSchema = z
  .object({
    ...baseFields,
    enrollment_type: applicationEnrollmentTypeSchema,

    // Required student fields
    student_first_name: requiredString(1, 80, "Please enter the student’s first name."),
    student_last_name: requiredString(1, 80, "Please enter the student’s last name."),
    student_dob: z.iso.date("Please enter the student’s date of birth."),
    student_current_grade: requiredString(1, 20, "Please enter the student’s current grade."),
    student_desired_grade: requiredString(1, 20, "Please enter the student’s desired entry grade."),
    student_primary_language: requiredString(1, 80, "Please enter the student’s primary language."),
    student_english_proficiency: requiredString(1, 40, "Please indicate English proficiency."),
    student_graduation_year: z.coerce
      .number({ message: "Please enter the expected graduation year." })
      .int("Please enter a 4-digit year.")
      .min(new Date().getFullYear(), "Graduation year can't be in the past.")
      .max(new Date().getFullYear() + 12, "Graduation year looks too far out — double-check."),
    student_is_international: z
      .union([z.literal("domestic"), z.literal("international")], {
        message: "Please choose Domestic or International.",
      })
      .transform((value) => value === "international"),

    // Required guardian 1 fields
    guardian1_name: requiredString(2, 200, "Please enter Guardian 1’s name."),
    guardian1_relationship: requiredString(2, 80, "Please enter Guardian 1’s relationship to the student."),
    guardian1_mobile: requiredString(7, 40, "Please enter Guardian 1’s mobile phone."),
    guardian1_email: z.email("Please enter a valid email for Guardian 1.").max(320),

    // Submit-time anti-spam
    turnstile_token: requiredString(1, 2000, "Please complete the spam check."),
    submitted_at: requiredString(1, 40, "Submission metadata is missing."),
    website: optionalString(200), // honeypot — checked at the route level

    // Optional drafted-from token (so we can finalize a saved draft)
    draft_token: optionalString(128),
  })
  .refine(
    (data) =>
      data.enrollment_type !== "summer" || data.course_interest.length > 0,
    {
      message: "Please select at least one summer course.",
      path: ["course_interest"],
    }
  )

export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>

// ============================================================================
// Admin data-edit schema — fixes typos and omissions on a submitted (but
// not-yet-enrolled) application. Distinct from the admin status/notes update
// below: this one mutates the family-provided fields, mostly the same set
// the apply wizard collects.
// ============================================================================

const optionalEditedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

const optionalEditedEmail = () =>
  z
    .union([z.email(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

const optionalEditedDate = () =>
  z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

export const applicationDataUpdateSchema = z.object({
  id: z.uuid(),

  enrollment_type: z
    .union([applicationEnrollmentTypeSchema, z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),

  // Student
  student_first_name: optionalEditedString(80),
  student_middle_name: optionalEditedString(80),
  student_last_name: optionalEditedString(80),
  student_suffix: optionalEditedString(20),
  student_preferred_name: optionalEditedString(80),
  student_dob: optionalEditedDate(),
  student_gender: optionalEditedString(40),
  student_pronouns: optionalEditedString(40),
  student_birthplace: optionalEditedString(200),
  student_primary_language: optionalEditedString(80),
  student_secondary_language: optionalEditedString(80),
  student_english_proficiency: optionalEditedString(40),
  student_current_grade: optionalEditedString(20),
  student_desired_grade: optionalEditedString(20),
  student_graduation_year: z
    .union([z.coerce.number().int().min(1900).max(2100), z.literal(""), z.null()])
    .optional()
    .transform((value) => (typeof value === "number" ? value : null)),
  student_is_international: z
    .union([z.literal("domestic"), z.literal("international"), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "international") return true
      if (value === "domestic") return false
      return null
    }),
  student_personal_email: optionalEditedEmail(),
  student_phone: optionalEditedString(40),
  student_address_line1: optionalEditedString(200),
  student_address_line2: optionalEditedString(200),
  student_address_city: optionalEditedString(120),
  student_address_region: optionalEditedString(120),
  student_address_postal_code: optionalEditedString(40),
  student_address_country: optionalEditedString(120),

  // Guardian 1
  guardian1_name: optionalEditedString(200),
  guardian1_relationship: optionalEditedString(80),
  guardian1_mobile: optionalEditedString(40),
  guardian1_work_phone: optionalEditedString(40),
  guardian1_email: optionalEditedEmail(),
  guardian1_address_same_as_student: z.coerce.boolean().optional().default(false),
  guardian1_address_line1: optionalEditedString(200),
  guardian1_address_line2: optionalEditedString(200),
  guardian1_address_city: optionalEditedString(120),
  guardian1_address_region: optionalEditedString(120),
  guardian1_address_postal_code: optionalEditedString(40),
  guardian1_address_country: optionalEditedString(120),

  // Guardian 2
  guardian2_name: optionalEditedString(200),
  guardian2_relationship: optionalEditedString(80),
  guardian2_mobile: optionalEditedString(40),
  guardian2_work_phone: optionalEditedString(40),
  guardian2_email: optionalEditedEmail(),
  guardian2_address_same_as_student: z.coerce.boolean().optional().default(false),
  guardian2_address_line1: optionalEditedString(200),
  guardian2_address_line2: optionalEditedString(200),
  guardian2_address_city: optionalEditedString(120),
  guardian2_address_region: optionalEditedString(120),
  guardian2_address_postal_code: optionalEditedString(40),
  guardian2_address_country: optionalEditedString(120),

  // Homestay
  has_homestay: z.coerce.boolean().optional().default(false),
  homestay_name: optionalEditedString(200),
  homestay_relationship: optionalEditedString(80),
  homestay_mobile: optionalEditedString(40),
  homestay_work_phone: optionalEditedString(40),
  homestay_email: optionalEditedEmail(),
  homestay_address_line1: optionalEditedString(200),
  homestay_address_line2: optionalEditedString(200),
  homestay_address_city: optionalEditedString(120),
  homestay_address_region: optionalEditedString(120),
  homestay_address_postal_code: optionalEditedString(40),
  homestay_address_country: optionalEditedString(120),

  how_did_you_hear: optionalEditedString(400),
  notes_from_family: optionalEditedString(4000),
})
export type ApplicationDataUpdateInput = z.infer<typeof applicationDataUpdateSchema>

export async function updateApplicationData(input: ApplicationDataUpdateInput) {
  const { id, ...rest } = input

  const { data, error } = await getSupabase()
    .from("applications")
    .update(rest)
    .eq("id", id)
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to update application data: ${error.message}`)
  }

  return data
}

// ============================================================================
// Admin update schema
// ============================================================================

export const applicationAdminUpdateSchema = z.object({
  id: z.uuid(),
  status: applicationStatusSchema,
  enrollment_type: applicationEnrollmentTypeSchema.optional(),
  internal_notes: optionalString(4000),
  assigned_to: optionalString(200),
})

export type ApplicationAdminUpdate = z.infer<typeof applicationAdminUpdateSchema>

// ============================================================================
// DB row type — mirrors the applications table 1:1
// ============================================================================

export type ApplicationRecord = {
  id: string
  created_at: string
  updated_at: string
  status: ApplicationStatus
  enrollment_type: ApplicationEnrollmentType | null

  draft_token: string | null
  draft_email: string | null
  draft_expires_at: string | null

  student_first_name: string | null
  student_middle_name: string | null
  student_last_name: string | null
  student_suffix: string | null
  student_preferred_name: string | null
  student_dob: string | null
  student_gender: string | null
  student_pronouns: string | null
  student_birthplace: string | null
  student_primary_language: string | null
  student_secondary_language: string | null
  student_english_proficiency: string | null
  student_current_grade: string | null
  student_desired_grade: string | null
  student_graduation_year: number | null
  student_is_international: boolean | null
  student_personal_email: string | null
  student_phone: string | null
  student_address_line1: string | null
  student_address_line2: string | null
  student_address_city: string | null
  student_address_region: string | null
  student_address_postal_code: string | null
  student_address_country: string | null

  guardian1_name: string | null
  guardian1_relationship: string | null
  guardian1_mobile: string | null
  guardian1_work_phone: string | null
  guardian1_email: string | null
  guardian1_address_same_as_student: boolean
  guardian1_address_line1: string | null
  guardian1_address_line2: string | null
  guardian1_address_city: string | null
  guardian1_address_region: string | null
  guardian1_address_postal_code: string | null
  guardian1_address_country: string | null

  guardian2_name: string | null
  guardian2_relationship: string | null
  guardian2_mobile: string | null
  guardian2_work_phone: string | null
  guardian2_email: string | null
  guardian2_address_same_as_student: boolean
  guardian2_address_line1: string | null
  guardian2_address_line2: string | null
  guardian2_address_city: string | null
  guardian2_address_region: string | null
  guardian2_address_postal_code: string | null
  guardian2_address_country: string | null

  has_homestay: boolean
  homestay_name: string | null
  homestay_relationship: string | null
  homestay_mobile: string | null
  homestay_work_phone: string | null
  homestay_email: string | null
  homestay_address_line1: string | null
  homestay_address_line2: string | null
  homestay_address_city: string | null
  homestay_address_region: string | null
  homestay_address_postal_code: string | null
  homestay_address_country: string | null

  course_interest: string[]
  prior_schools: PriorSchool[]

  how_did_you_hear: string | null
  notes_from_family: string | null

  internal_notes: string | null
  assigned_to: string | null
  admit_decision_at: string | null
  archived_at: string | null

  source: string
  spam_provider: string | null
  spam_verified: boolean

  /** Set by the Stripe webhook when the $350 registration fee clears.
   *  Until this is non-null, the application is "submitted but not
   *  paid" — it doesn't trigger admin notifications and stays out of
   *  the active queue. */
  fee_paid_at: string | null
  stripe_session_id: string | null
}

export type ApplicationSummary = {
  draftCount: number
  submittedCount: number
  inReviewCount: number
  infoRequestedCount: number
  admitOfferedCount: number
  acceptedCount: number
  declinedCount: number
  withdrawnCount: number
  enrolledCount: number
  archivedCount: number
  activeCount: number
}

// ============================================================================
// Magic-link draft tokens
// ============================================================================

const draftTokenBytes = 32
const draftTtlMs = 1000 * 60 * 60 * 24 * 30 // 30 days

export function generateDraftToken() {
  return randomBytes(draftTokenBytes).toString("hex")
}

function nextDraftExpiry() {
  return new Date(Date.now() + draftTtlMs).toISOString()
}

const applicationSelectColumns =
  "id, created_at, updated_at, status, enrollment_type, " +
  "draft_token, draft_email, draft_expires_at, " +
  "student_first_name, student_middle_name, student_last_name, student_suffix, " +
  "student_preferred_name, student_dob, student_gender, student_pronouns, " +
  "student_birthplace, student_primary_language, student_secondary_language, " +
  "student_english_proficiency, student_current_grade, student_desired_grade, " +
  "student_graduation_year, student_is_international, " +
  "student_personal_email, student_phone, " +
  "student_address_line1, student_address_line2, student_address_city, " +
  "student_address_region, student_address_postal_code, student_address_country, " +
  "guardian1_name, guardian1_relationship, guardian1_mobile, guardian1_work_phone, " +
  "guardian1_email, guardian1_address_same_as_student, " +
  "guardian1_address_line1, guardian1_address_line2, guardian1_address_city, " +
  "guardian1_address_region, guardian1_address_postal_code, guardian1_address_country, " +
  "guardian2_name, guardian2_relationship, guardian2_mobile, guardian2_work_phone, " +
  "guardian2_email, guardian2_address_same_as_student, " +
  "guardian2_address_line1, guardian2_address_line2, guardian2_address_city, " +
  "guardian2_address_region, guardian2_address_postal_code, guardian2_address_country, " +
  "has_homestay, homestay_name, homestay_relationship, homestay_mobile, " +
  "homestay_work_phone, homestay_email, " +
  "homestay_address_line1, homestay_address_line2, homestay_address_city, " +
  "homestay_address_region, homestay_address_postal_code, homestay_address_country, " +
  "course_interest, prior_schools, how_did_you_hear, notes_from_family, " +
  "internal_notes, assigned_to, admit_decision_at, archived_at, " +
  "source, spam_provider, spam_verified, " +
  "fee_paid_at, stripe_session_id"

// Reduce a parsed input into the snake_case payload Supabase expects.
// Strips the meta-fields (turnstile_token, submitted_at, website, draft_token)
// that aren't columns.
function toApplicationRow(
  input: Partial<ApplicationDraftInput & ApplicationSubmitInput>
): Record<string, unknown> {
  const {
    turnstile_token: _turnstileToken,
    submitted_at: _submittedAt,
    website: _website,
    draft_token: _draftToken,
    ...rest
  } = input as Record<string, unknown>

  return rest
}

// ============================================================================
// CRUD: draft lifecycle
// ============================================================================

export async function createApplicationDraft(input: ApplicationDraftInput) {
  if (!input.draft_email) {
    throw new Error("A parent/guardian email is required to save a draft.")
  }

  const token = generateDraftToken()

  const { data, error } = await getSupabase()
    .from("applications")
    .insert({
      ...toApplicationRow(input),
      status: "draft",
      draft_token: token,
      draft_email: input.draft_email,
      draft_expires_at: nextDraftExpiry(),
      source: "apply-page",
      spam_provider: "cloudflare-turnstile",
      spam_verified: true,
    })
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to create application draft: ${error.message}`)
  }

  return data
}

export async function updateApplicationDraft(
  draftToken: string,
  input: ApplicationDraftInput
) {
  const existing = await getApplicationByDraftToken(draftToken)

  if (!existing) {
    throw new Error("That draft link has expired or is no longer valid.")
  }

  const { data, error } = await getSupabase()
    .from("applications")
    .update({
      ...toApplicationRow(input),
      draft_expires_at: nextDraftExpiry(),
    })
    .eq("id", existing.id)
    .eq("status", "draft")
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to update application draft: ${error.message}`)
  }

  return data
}

export async function getApplicationByDraftToken(token: string) {
  const { data, error } = await getSupabase()
    .from("applications")
    .select(applicationSelectColumns)
    .eq("draft_token", token)
    .eq("status", "draft")
    .maybeSingle<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to load draft: ${error.message}`)
  }

  if (!data) {
    return null
  }

  if (data.draft_expires_at && new Date(data.draft_expires_at).getTime() < Date.now()) {
    return null
  }

  return data
}

// ============================================================================
// CRUD: submit
// ============================================================================

export async function submitApplication(input: ApplicationSubmitInput) {
  const payload = {
    ...toApplicationRow(input),
    status: "submitted" as const,
    draft_token: null,
    draft_email: null,
    draft_expires_at: null,
    source: "apply-page",
    spam_provider: "cloudflare-turnstile",
    spam_verified: true,
  }

  if (input.draft_token) {
    const existing = await getApplicationByDraftToken(input.draft_token)

    if (existing) {
      const { data, error } = await getSupabase()
        .from("applications")
        .update(payload)
        .eq("id", existing.id)
        .select(applicationSelectColumns)
        .single<ApplicationRecord>()

      if (error) {
        throw new Error(`Failed to submit application: ${error.message}`)
      }

      return data
    }
  }

  const { data, error } = await getSupabase()
    .from("applications")
    .insert(payload)
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to submit application: ${error.message}`)
  }

  return data
}

// ============================================================================
// Registration-fee payment
// ============================================================================

/** Mark an application as having paid the registration fee. Called from
 *  the Stripe webhook (`checkout.session.completed`). Idempotent: a
 *  second call with the same session_id is a no-op. Returns the
 *  application if this call was the one that flipped it from unpaid to
 *  paid (so the caller knows whether to send the "thanks, we got it"
 *  family confirmation + the admin notification), or null if it was
 *  already paid. */
export async function markApplicationPaid(input: {
  application_id: string
  stripe_session_id: string
}): Promise<ApplicationRecord | null> {
  const existing = await getApplicationById(input.application_id)
  if (!existing) {
    throw new Error(`Application ${input.application_id} not found.`)
  }
  if (existing.fee_paid_at) {
    // Already paid — webhook re-delivery or admin re-marked. No-op.
    return null
  }

  const { data, error } = await getSupabase()
    .from("applications")
    .update({
      fee_paid_at: new Date().toISOString(),
      stripe_session_id: input.stripe_session_id,
    })
    .eq("id", input.application_id)
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to mark application paid: ${error.message}`)
  }

  return data
}

// ============================================================================
// Admin reads + writes
// ============================================================================

export async function listApplications(filters?: {
  view?: "active" | "archived" | "drafts" | "all"
  status?: ApplicationStatus | "all"
  enrollmentType?: ApplicationEnrollmentType | "all"
  paid?: "all" | "paid" | "unpaid"
}) {
  let query = getSupabase()
    .from("applications")
    .select(applicationSelectColumns)
    .order("created_at", { ascending: false })

  const view = filters?.view ?? "active"

  if (view === "active") {
    query = query.not("status", "in", '("draft","archived")')
  } else if (view === "archived") {
    query = query.eq("status", "archived")
  } else if (view === "drafts") {
    query = query.eq("status", "draft")
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters?.enrollmentType && filters.enrollmentType !== "all") {
    query = query.eq("enrollment_type", filters.enrollmentType)
  }

  if (filters?.paid === "paid") {
    query = query.not("fee_paid_at", "is", null)
  } else if (filters?.paid === "unpaid") {
    query = query.is("fee_paid_at", null)
  }

  const { data, error } = await query.returns<ApplicationRecord[]>()

  if (error) {
    throw new Error(`Failed to load applications: ${error.message}`)
  }

  return data
}

export async function getApplicationById(id: string) {
  const { data, error } = await getSupabase()
    .from("applications")
    .select(applicationSelectColumns)
    .eq("id", id)
    .maybeSingle<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to load application: ${error.message}`)
  }

  return data
}

export async function updateApplicationStatus(input: ApplicationAdminUpdate) {
  const patch: Record<string, unknown> = {
    status: input.status,
    internal_notes: input.internal_notes ?? null,
    assigned_to: input.assigned_to ?? null,
  }

  if (input.enrollment_type !== undefined) {
    patch.enrollment_type = input.enrollment_type
  }

  if (input.status === "archived") {
    patch.archived_at = new Date().toISOString()
  } else {
    patch.archived_at = null
  }

  if (
    input.status === "admit_offered" ||
    input.status === "declined" ||
    input.status === "accepted"
  ) {
    patch.admit_decision_at = new Date().toISOString()
  }

  const { data, error } = await getSupabase()
    .from("applications")
    .update(patch)
    .eq("id", input.id)
    .select(applicationSelectColumns)
    .single<ApplicationRecord>()

  if (error) {
    throw new Error(`Failed to update application: ${error.message}`)
  }

  return data
}

export async function deleteApplication(id: string) {
  // Used to require status='archived' as a sanity gate, but the
  // detail page now calls this directly from a Confirm modal and an
  // archived-only restriction forced admin through a redundant
  // Archive-then-Delete dance for test cleanup. The confirmation
  // modal is the safety affordance; this is a clean hard delete.
  //
  // Cascades: enrollment+student records reference applications via
  // application_id with on-delete-set-null, so an enrolled student
  // survives this delete (their student row stays, just loses the
  // back-pointer to the original application).
  const { error, count } = await getSupabase()
    .from("applications")
    .delete({ count: "exact" })
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to delete application: ${error.message}`)
  }

  if (!count) {
    throw new Error("Application not found.")
  }
}

export async function getApplicationSummary() {
  const { data, error } = await getSupabase()
    .from("applications")
    .select("status")
    .returns<Array<Pick<ApplicationRecord, "status">>>()

  if (error) {
    throw new Error(`Failed to load application summary: ${error.message}`)
  }

  const summary: ApplicationSummary = {
    draftCount: 0,
    submittedCount: 0,
    inReviewCount: 0,
    infoRequestedCount: 0,
    admitOfferedCount: 0,
    acceptedCount: 0,
    declinedCount: 0,
    withdrawnCount: 0,
    enrolledCount: 0,
    archivedCount: 0,
    activeCount: 0,
  }

  for (const row of data ?? []) {
    switch (row.status) {
      case "draft":
        summary.draftCount += 1
        break
      case "submitted":
        summary.submittedCount += 1
        summary.activeCount += 1
        break
      case "in_review":
        summary.inReviewCount += 1
        summary.activeCount += 1
        break
      case "info_requested":
        summary.infoRequestedCount += 1
        summary.activeCount += 1
        break
      case "admit_offered":
        summary.admitOfferedCount += 1
        summary.activeCount += 1
        break
      case "accepted":
        summary.acceptedCount += 1
        summary.activeCount += 1
        break
      case "declined":
        summary.declinedCount += 1
        break
      case "withdrawn":
        summary.withdrawnCount += 1
        break
      case "enrolled":
        summary.enrolledCount += 1
        break
      case "archived":
        summary.archivedCount += 1
        break
    }
  }

  return summary
}
