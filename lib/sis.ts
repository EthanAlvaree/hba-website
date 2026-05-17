// lib/sis.ts
//
// Phase B SIS data layer. Profiles, students, and parent_links.
//
// Pattern mirrors lib/applications.ts: lazy service-role Supabase client,
// Zod schemas for any external input, typed row types matching the DB 1:1.

import { z } from "zod"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"
import {
  getApplicationById,
  type ApplicationEnrollmentType,
  type ApplicationRecord,
} from "@/lib/applications"
import { isHbaEmail } from "@/lib/admin"

// ============================================================================
// Enums + shared types
// ============================================================================

export const profileRoleSchema = z.enum(["student", "parent", "faculty", "admin"])
export type ProfileRole = z.infer<typeof profileRoleSchema>

export const studentStatusSchema = z.enum(["active", "graduated", "withdrawn"])
export type StudentStatus = z.infer<typeof studentStatusSchema>

// ============================================================================
// Row types — match the 0002-sis-core.sql migration 1:1
// ============================================================================

export type ProfileRecord = {
  id: string
  created_at: string
  updated_at: string
  entra_oid: string | null
  email: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  display_name: string | null
  roles: ProfileRole[]
  personal_email: string | null
  mobile_phone: string | null
  work_phone: string | null
  address_line1: string | null
  address_line2: string | null
  address_city: string | null
  address_region: string | null
  address_postal_code: string | null
  address_country: string | null
  active: boolean
  photo_path: string | null
}

export type StudentRecord = {
  id: string
  created_at: string
  updated_at: string
  profile_id: string
  application_id: string | null

  legal_first_name: string
  legal_middle_name: string | null
  legal_last_name: string
  suffix: string | null
  preferred_name: string | null

  dob: string | null
  gender: string | null
  pronouns: string | null
  birthplace: string | null
  primary_language: string | null
  secondary_language: string | null
  english_proficiency: string | null

  address_line1: string | null
  address_line2: string | null
  address_city: string | null
  address_region: string | null
  address_postal_code: string | null
  address_country: string | null

  enrollment_type: ApplicationEnrollmentType | null
  current_grade: string | null
  graduation_year: number | null
  is_international: boolean | null
  status: StudentStatus

  registered_at_hba: string | null
  graduated_at: string | null
  withdrawn_at: string | null
  withdrawn_reason: string | null

  internal_notes: string | null
  assigned_to: string | null
}

export type ParentLinkRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  parent_profile_id: string
  relationship: string | null
  is_primary: boolean
  is_homestay: boolean
  is_emergency_contact: boolean
  can_view_grades: boolean
  can_view_attendance: boolean
  can_receive_communications: boolean
}

const profileColumns =
  "id, created_at, updated_at, entra_oid, email, first_name, middle_name, " +
  "last_name, display_name, roles, personal_email, mobile_phone, work_phone, " +
  "address_line1, address_line2, address_city, address_region, " +
  "address_postal_code, address_country, active, photo_path"

const studentColumns =
  "id, created_at, updated_at, profile_id, application_id, " +
  "legal_first_name, legal_middle_name, legal_last_name, suffix, preferred_name, " +
  "dob, gender, pronouns, birthplace, primary_language, secondary_language, " +
  "english_proficiency, address_line1, address_line2, address_city, " +
  "address_region, address_postal_code, address_country, " +
  "enrollment_type, current_grade, graduation_year, is_international, status, " +
  "registered_at_hba, graduated_at, withdrawn_at, withdrawn_reason, " +
  "internal_notes, assigned_to"

const parentLinkColumns =
  "id, created_at, updated_at, student_id, parent_profile_id, relationship, " +
  "is_primary, is_homestay, is_emergency_contact, " +
  "can_view_grades, can_view_attendance, can_receive_communications"

// ============================================================================
// Profile helpers
// ============================================================================

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function splitName(fullName: string): { first: string | null; last: string | null } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return { first: null, last: null }
  if (parts.length === 1) return { first: parts[0], last: null }
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  }
}

export async function getProfileByEmail(email: string) {
  const normalized = normalizeEmail(email)
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(profileColumns)
    .eq("email", normalized)
    .maybeSingle<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to look up profile by email: ${error.message}`)
  }

  return data
}

export async function getProfileById(id: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select(profileColumns)
    .eq("id", id)
    .maybeSingle<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to look up profile by id: ${error.message}`)
  }

  return data
}

type FindOrCreateProfileInput = {
  email: string
  role: ProfileRole
  first_name?: string | null
  last_name?: string | null
  display_name?: string | null
  mobile_phone?: string | null
  work_phone?: string | null
  personal_email?: string | null
  address_line1?: string | null
  address_line2?: string | null
  address_city?: string | null
  address_region?: string | null
  address_postal_code?: string | null
  address_country?: string | null
}

// Returns the profile row, creating it if missing. If the profile exists but
// doesn't have the requested role, adds it. Fills in null name fields when the
// caller supplies values, but never overwrites non-null values.
export async function findOrCreateProfile(
  input: FindOrCreateProfileInput
): Promise<{ profile: ProfileRecord; created: boolean }> {
  const email = normalizeEmail(input.email)
  const existing = await getProfileByEmail(email)

  if (existing) {
    const needsRole = !existing.roles.includes(input.role)
    const patch: Record<string, unknown> = {}

    if (needsRole) {
      patch.roles = [...existing.roles, input.role]
    }
    if (!existing.first_name && input.first_name) patch.first_name = input.first_name
    if (!existing.last_name && input.last_name) patch.last_name = input.last_name
    if (!existing.display_name && input.display_name) patch.display_name = input.display_name
    if (!existing.mobile_phone && input.mobile_phone) patch.mobile_phone = input.mobile_phone
    if (!existing.work_phone && input.work_phone) patch.work_phone = input.work_phone
    if (!existing.personal_email && input.personal_email) {
      patch.personal_email = input.personal_email
    }
    if (!existing.address_line1 && input.address_line1) patch.address_line1 = input.address_line1
    if (!existing.address_line2 && input.address_line2) patch.address_line2 = input.address_line2
    if (!existing.address_city && input.address_city) patch.address_city = input.address_city
    if (!existing.address_region && input.address_region) patch.address_region = input.address_region
    if (!existing.address_postal_code && input.address_postal_code) {
      patch.address_postal_code = input.address_postal_code
    }
    if (!existing.address_country && input.address_country) {
      patch.address_country = input.address_country
    }

    if (Object.keys(patch).length === 0) {
      return { profile: existing, created: false }
    }

    const { data, error } = await getSupabase()
      .from("profiles")
      .update(patch)
      .eq("id", existing.id)
      .select(profileColumns)
      .single<ProfileRecord>()

    if (error) {
      throw new Error(`Failed to update profile ${existing.id}: ${error.message}`)
    }

    return { profile: data, created: false }
  }

  const { data, error } = await getSupabase()
    .from("profiles")
    .insert({
      email,
      roles: [input.role],
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      display_name: input.display_name ?? null,
      mobile_phone: input.mobile_phone ?? null,
      work_phone: input.work_phone ?? null,
      personal_email: input.personal_email ?? null,
      address_line1: input.address_line1 ?? null,
      address_line2: input.address_line2 ?? null,
      address_city: input.address_city ?? null,
      address_region: input.address_region ?? null,
      address_postal_code: input.address_postal_code ?? null,
      address_country: input.address_country ?? null,
    })
    .select(profileColumns)
    .single<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to create profile for ${email}: ${error.message}`)
  }

  return { profile: data, created: true }
}

// ============================================================================
// Student helpers
// ============================================================================

export async function getStudentByApplicationId(applicationId: string) {
  const { data, error } = await getSupabase()
    .from("students")
    .select(studentColumns)
    .eq("application_id", applicationId)
    .maybeSingle<StudentRecord>()

  if (error) {
    throw new Error(`Failed to look up student by application: ${error.message}`)
  }

  return data
}

export async function getStudentByProfileId(profileId: string) {
  const { data, error } = await getSupabase()
    .from("students")
    .select(studentColumns)
    .eq("profile_id", profileId)
    .maybeSingle<StudentRecord>()

  if (error) {
    throw new Error(`Failed to look up student by profile: ${error.message}`)
  }

  return data
}

export async function getStudentById(
  studentId: string
): Promise<StudentRecord | null> {
  const { data, error } = await getSupabase()
    .from("students")
    .select(studentColumns)
    .eq("id", studentId)
    .maybeSingle<StudentRecord>()
  if (error) {
    throw new Error(`Failed to look up student: ${error.message}`)
  }
  return data
}

/** Students this parent profile is linked to (via parent_links). Used by
 *  /admin/profiles to render "Linked students" on the parent profile
 *  card so the admin can jump to each child's detail page. */
export async function listStudentsLinkedToParent(
  parentProfileId: string
): Promise<
  Array<{
    student_id: string
    relationship: string | null
    is_primary: boolean
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
    status: StudentStatus
  }>
> {
  type Row = {
    relationship: string | null
    is_primary: boolean
    student: {
      id: string
      legal_first_name: string
      legal_last_name: string
      preferred_name: string | null
      status: StudentStatus
    } | null
  }
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(
      `relationship, is_primary,
       student:students(id, legal_first_name, legal_last_name, preferred_name, status)`
    )
    .eq("parent_profile_id", parentProfileId)
    .returns<Row[]>()
  if (error) {
    throw new Error(`Failed to list students linked to parent: ${error.message}`)
  }
  return (data ?? [])
    .filter((row): row is Row & { student: NonNullable<Row["student"]> } =>
      Boolean(row.student)
    )
    .map((row) => ({
      student_id: row.student.id,
      relationship: row.relationship,
      is_primary: row.is_primary,
      legal_first_name: row.student.legal_first_name,
      legal_last_name: row.student.legal_last_name,
      preferred_name: row.student.preferred_name,
      status: row.student.status,
    }))
}

/** Bulk variant: which of the supplied profile IDs already have an
 *  associated students row, and what is that row's id? Used by
 *  /admin/profiles to link a profile card straight to the student's
 *  detail page. Returns an empty Map when given an empty input. */
export async function listProfileIdsWithStudentRecord(
  profileIds: string[]
): Promise<Map<string, string>> {
  if (profileIds.length === 0) return new Map()
  const { data, error } = await getSupabase()
    .from("students")
    .select("id, profile_id")
    .in("profile_id", profileIds)
    .returns<Array<{ id: string; profile_id: string }>>()
  if (error) {
    throw new Error(`Failed to look up student records: ${error.message}`)
  }
  return new Map((data ?? []).map((r) => [r.profile_id, r.id]))
}

/** Manual onboarding path for the case where a person already exists
 *  as a profile (typically because they signed in via M365 first) but
 *  never went through the apply flow. Inserts a minimal students row
 *  using the profile's name as the legal name fallback; admin can
 *  fill demographics in afterwards. Refuses to run if a students row
 *  already exists for this profile. */
export async function createStudentFromExistingProfile(
  profileId: string
): Promise<StudentRecord> {
  const existing = await getStudentByProfileId(profileId)
  if (existing) {
    throw new Error("This profile already has a student record.")
  }

  const { data: profile, error: profileError } = await getSupabase()
    .from("profiles")
    .select(profileColumns)
    .eq("id", profileId)
    .maybeSingle<ProfileRecord>()
  if (profileError) {
    throw new Error(`Failed to look up profile: ${profileError.message}`)
  }
  if (!profile) {
    throw new Error("Profile not found.")
  }

  // Best-effort legal-name fallback: prefer first_name/last_name, fall
  // back to splitting display_name, then to the email local-part.
  let firstName = profile.first_name?.trim() || null
  let lastName = profile.last_name?.trim() || null
  if (!firstName && !lastName && profile.display_name) {
    const parts = profile.display_name.trim().split(/\s+/)
    firstName = parts[0] ?? null
    lastName = parts.slice(1).join(" ") || null
  }
  if (!firstName) {
    firstName = profile.email.split("@")[0] ?? "Unknown"
  }
  if (!lastName) {
    lastName = "Unknown"
  }

  const { data, error } = await getSupabase()
    .from("students")
    .insert({
      profile_id: profileId,
      application_id: null,
      legal_first_name: firstName,
      legal_last_name: lastName,
      status: "active",
      registered_at_hba: new Date().toISOString().slice(0, 10),
    })
    .select(studentColumns)
    .single<StudentRecord>()

  if (error) {
    throw new Error(`Failed to create student record: ${error.message}`)
  }

  // Make sure the profile carries the student role too — otherwise the
  // student portal won't let them sign in even though the SIS row exists.
  if (!profile.roles.includes("student")) {
    const nextRoles = Array.from(new Set([...profile.roles, "student"]))
    await getSupabase()
      .from("profiles")
      .update({ roles: nextRoles })
      .eq("id", profileId)
  }

  return data
}

// ============================================================================
// Enroll an accepted application
// ============================================================================

export const enrollApplicationSchema = z.object({
  application_id: z.uuid(),
  student_hba_email: z
    .email("Please enter a valid HBA email for the student.")
    .max(320),
  registered_at_hba: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
})

export type EnrollApplicationInput = z.infer<typeof enrollApplicationSchema>

export type EnrollApplicationResult = {
  student: StudentRecord
  studentProfile: ProfileRecord
  parentLinks: ParentLinkRecord[]
}

// Converts an accepted application into a full SIS record set:
//   - profile (student)        — created from the HBA email the admin supplies
//   - students row             — demographics copied from application
//   - profile + parent_links   — one per guardian / homestay with an email
//   - applications.status      — flipped to 'enrolled'
//
// Idempotent: if the application already has a student row, returns it
// instead of inserting a duplicate (still ensures status='enrolled' and the
// parent_links are present).
export async function enrollAcceptedApplication(
  input: EnrollApplicationInput
): Promise<EnrollApplicationResult> {
  const application = await getApplicationById(input.application_id)

  if (!application) {
    throw new Error("Application not found.")
  }

  if (application.status !== "accepted" && application.status !== "enrolled") {
    throw new Error(
      "Only accepted applications can be enrolled. Move the application to 'Accepted' first."
    )
  }

  const existingStudent = await getStudentByApplicationId(application.id)

  let student: StudentRecord
  let studentProfile: ProfileRecord

  if (existingStudent) {
    // Already partially enrolled — re-use the existing rows and continue with
    // the remaining steps to make this safely retryable.
    student = existingStudent
    const { data, error } = await getSupabase()
      .from("profiles")
      .select(profileColumns)
      .eq("id", existingStudent.profile_id)
      .single<ProfileRecord>()

    if (error) {
      throw new Error(`Failed to load existing student profile: ${error.message}`)
    }

    studentProfile = data
  } else {
    studentProfile = (
      await findOrCreateProfile({
        email: input.student_hba_email,
        role: "student",
        first_name: application.student_first_name,
        last_name: application.student_last_name,
        display_name: buildStudentDisplayName(application),
        personal_email: application.student_personal_email,
        mobile_phone: application.student_phone,
      })
    ).profile

    // Refuse to attach this profile to a second student record. Catches the
    // case where an admin re-uses an HBA email by mistake.
    const conflict = await getStudentByProfileId(studentProfile.id)
    if (conflict) {
      throw new Error(
        `That HBA email already belongs to another student record (${conflict.id}). ` +
          "Use a different email or update the existing student instead."
      )
    }

    student = await insertStudentFromApplication({
      application,
      profileId: studentProfile.id,
      registeredAt: input.registered_at_hba,
    })
  }

  const parentLinks = await ensureParentLinks(application, student.id)

  if (application.status !== "enrolled") {
    const { error } = await getSupabase()
      .from("applications")
      .update({ status: "enrolled" })
      .eq("id", application.id)

    if (error) {
      throw new Error(`Failed to mark application enrolled: ${error.message}`)
    }
  }

  return { student, studentProfile, parentLinks }
}

function buildStudentDisplayName(app: ApplicationRecord): string | null {
  const preferred = app.student_preferred_name?.trim()
  if (preferred) return preferred
  const parts = [app.student_first_name, app.student_last_name]
    .map((p) => p?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : null
}

async function insertStudentFromApplication(args: {
  application: ApplicationRecord
  profileId: string
  registeredAt?: string
}): Promise<StudentRecord> {
  const { application, profileId, registeredAt } = args

  if (!application.student_first_name || !application.student_last_name) {
    throw new Error(
      "Application is missing the student's legal name. Edit the application before enrolling."
    )
  }

  const { data, error } = await getSupabase()
    .from("students")
    .insert({
      profile_id: profileId,
      application_id: application.id,
      legal_first_name: application.student_first_name,
      legal_middle_name: application.student_middle_name,
      legal_last_name: application.student_last_name,
      suffix: application.student_suffix,
      preferred_name: application.student_preferred_name,
      dob: application.student_dob,
      gender: application.student_gender,
      pronouns: application.student_pronouns,
      birthplace: application.student_birthplace,
      primary_language: application.student_primary_language,
      secondary_language: application.student_secondary_language,
      english_proficiency: application.student_english_proficiency,
      address_line1: application.student_address_line1,
      address_line2: application.student_address_line2,
      address_city: application.student_address_city,
      address_region: application.student_address_region,
      address_postal_code: application.student_address_postal_code,
      address_country: application.student_address_country,
      enrollment_type: application.enrollment_type,
      // student_current_grade is "the grade they're in right now" — the
      // scheduler reads this as the just-finished/in-progress grade and
      // adds +1 to pick courses for the upcoming term. Storing the
      // desired_grade here would push the trajectory tree one year ahead
      // (e.g. an 8→9 student would get prompted to pick 10th-grade courses).
      current_grade: application.student_current_grade ?? application.student_desired_grade,
      graduation_year: application.student_graduation_year,
      is_international: application.student_is_international,
      status: "active",
      registered_at_hba: registeredAt ?? new Date().toISOString().slice(0, 10),
    })
    .select(studentColumns)
    .single<StudentRecord>()

  if (error) {
    throw new Error(`Failed to create student record: ${error.message}`)
  }

  return data
}

type GuardianSlot = {
  prefix: "guardian1" | "guardian2" | "homestay"
  isPrimary: boolean
  isHomestay: boolean
}

const guardianSlots: GuardianSlot[] = [
  { prefix: "guardian1", isPrimary: true, isHomestay: false },
  { prefix: "guardian2", isPrimary: false, isHomestay: false },
  { prefix: "homestay", isPrimary: false, isHomestay: true },
]

// Patches the contact fields that we treat as "freshest from the most
// recent application": address + phones. Skips fields that are blank on
// the incoming application (no clobbering a populated DB value with an
// empty form input). Leaves names/email alone — those are handled by
// findOrCreateProfile's fill-nulls semantics.
async function refreshParentProfileFromApplication(
  profile: ProfileRecord,
  incoming: {
    mobile_phone: string | null
    work_phone: string | null
    address_line1: string | null
    address_line2: string | null
    address_city: string | null
    address_region: string | null
    address_postal_code: string | null
    address_country: string | null
  }
): Promise<void> {
  const patch: Record<string, unknown> = {}
  const maybeSet = (
    key: keyof typeof incoming,
    existing: string | null
  ) => {
    const next = incoming[key]
    if (next && next !== existing) {
      patch[key] = next
    }
  }
  maybeSet("mobile_phone", profile.mobile_phone)
  maybeSet("work_phone", profile.work_phone)
  maybeSet("address_line1", profile.address_line1)
  maybeSet("address_line2", profile.address_line2)
  maybeSet("address_city", profile.address_city)
  maybeSet("address_region", profile.address_region)
  maybeSet("address_postal_code", profile.address_postal_code)
  maybeSet("address_country", profile.address_country)

  if (Object.keys(patch).length === 0) return

  const { error } = await getSupabase()
    .from("profiles")
    .update(patch)
    .eq("id", profile.id)
  if (error) {
    throw new Error(
      `Failed to refresh parent profile ${profile.id} from application: ${error.message}`
    )
  }
}

async function ensureParentLinks(
  application: ApplicationRecord,
  studentId: string
): Promise<ParentLinkRecord[]> {
  const links: ParentLinkRecord[] = []

  for (const slot of guardianSlots) {
    const email = readGuardianField(application, slot.prefix, "email")
    if (!email) continue
    if (slot.isHomestay && !application.has_homestay) continue

    const name = readGuardianField(application, slot.prefix, "name") ?? ""
    const { first, last } = splitName(name)

    // Resolve guardian address. The application form supports a
    // "same as student" checkbox for guardian1 and guardian2 (not for
    // homestay, since homestay is by definition a separate household).
    // When that's set we copy from the student address fields.
    const sameAsStudent =
      slot.prefix !== "homestay" &&
      Boolean(
        application[
          `${slot.prefix}_address_same_as_student` as keyof ApplicationRecord
        ]
      )
    const addrPrefix = sameAsStudent ? "student" : slot.prefix
    const readAddr = (field: string) => {
      const key = `${addrPrefix}_${field}` as keyof ApplicationRecord
      const value = application[key]
      return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null
    }

    const guardianMobile = readGuardianField(application, slot.prefix, "mobile")
    const guardianWorkPhone = readGuardianField(application, slot.prefix, "work_phone")
    const guardianAddress = {
      address_line1: readAddr("address_line1"),
      address_line2: readAddr("address_line2"),
      address_city: readAddr("address_city"),
      address_region: readAddr("address_region"),
      address_postal_code: readAddr("address_postal_code"),
      address_country: readAddr("address_country"),
    }

    const { profile } = await findOrCreateProfile({
      email,
      role: "parent",
      first_name: first,
      last_name: last,
      display_name: name || null,
      mobile_phone: guardianMobile,
      work_phone: guardianWorkPhone,
      ...guardianAddress,
    })

    // Refresh address + phones from the new application — these are the
    // fields most likely to be stale on the profile (move, new carrier).
    // Name fields stay sticky: admin may have cleaned up a legal-name
    // edit ("Jones-Smith" after marriage) that a casual sibling-app form
    // shouldn't overwrite.
    await refreshParentProfileFromApplication(profile, {
      mobile_phone: guardianMobile,
      work_phone: guardianWorkPhone,
      ...guardianAddress,
    })

    const existing = await getParentLink(studentId, profile.id)
    if (existing) {
      links.push(existing)
      continue
    }

    const { data, error } = await getSupabase()
      .from("parent_links")
      .insert({
        student_id: studentId,
        parent_profile_id: profile.id,
        relationship: readGuardianField(application, slot.prefix, "relationship"),
        is_primary: slot.isPrimary,
        is_homestay: slot.isHomestay,
      })
      .select(parentLinkColumns)
      .single<ParentLinkRecord>()

    if (error) {
      throw new Error(`Failed to create parent link for ${email}: ${error.message}`)
    }

    links.push(data)
  }

  return links
}

async function getParentLink(studentId: string, parentProfileId: string) {
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(parentLinkColumns)
    .eq("student_id", studentId)
    .eq("parent_profile_id", parentProfileId)
    .maybeSingle<ParentLinkRecord>()

  if (error) {
    throw new Error(`Failed to look up parent link: ${error.message}`)
  }

  return data
}

// ============================================================================
// Terms
// ============================================================================

export const termKindSchema = z.enum(["fall", "spring", "summer"])
export type TermKind = z.infer<typeof termKindSchema>

export type TermRecord = {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  kind: TermKind
  academic_year: string
  start_date: string
  end_date: string
  is_current: boolean
  is_grades_locked: boolean
}

const termColumns =
  "id, created_at, updated_at, name, slug, kind, academic_year, " +
  "start_date, end_date, is_current, is_grades_locked"

// Lowercased, hyphenated, alphanumeric-only. Matches the existing pattern
// for slug-like keys elsewhere on the site.
const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, and hyphens only.")

const academicYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}$/, "Academic year must look like 2025-2026.")

const termFields = {
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: slugSchema,
  kind: termKindSchema,
  academic_year: academicYearSchema,
  start_date: z.iso.date("Start date is required."),
  end_date: z.iso.date("End date is required."),
  is_current: z.coerce.boolean().optional().default(false),
  is_grades_locked: z.coerce.boolean().optional().default(false),
}

const dateOrderRefinement = (data: { start_date: string; end_date: string }) =>
  data.start_date < data.end_date

const dateOrderMessage = {
  message: "End date must be after start date.",
  path: ["end_date"],
}

export const termCreateSchema = z.object(termFields).refine(dateOrderRefinement, dateOrderMessage)
export type TermCreateInput = z.infer<typeof termCreateSchema>

export const termUpdateSchema = z
  .object({ id: z.uuid(), ...termFields })
  .refine(dateOrderRefinement, dateOrderMessage)
export type TermUpdateInput = z.infer<typeof termUpdateSchema>

export async function listTerms(): Promise<TermRecord[]> {
  const { data, error } = await getSupabase()
    .from("terms")
    .select(termColumns)
    .order("start_date", { ascending: false })
    .returns<TermRecord[]>()

  if (error) {
    throw new Error(`Failed to list terms: ${error.message}`)
  }
  return data
}

export async function createTerm(input: TermCreateInput): Promise<TermRecord> {
  // The 0002 migration installs a partial unique index that allows at most
  // one term with is_current=true. Clear other current flags first so the
  // admin can switch the current term without hitting a constraint error.
  if (input.is_current) {
    await clearCurrentTerms()
  }

  const { data, error } = await getSupabase()
    .from("terms")
    .insert({
      name: input.name,
      slug: input.slug,
      kind: input.kind,
      academic_year: input.academic_year,
      start_date: input.start_date,
      end_date: input.end_date,
      is_current: input.is_current ?? false,
      is_grades_locked: input.is_grades_locked ?? false,
    })
    .select(termColumns)
    .single<TermRecord>()

  if (error) {
    throw new Error(`Failed to create term: ${error.message}`)
  }
  return data
}

export async function updateTerm(input: TermUpdateInput): Promise<TermRecord> {
  if (input.is_current) {
    await clearCurrentTerms(input.id)
  }

  const { data, error } = await getSupabase()
    .from("terms")
    .update({
      name: input.name,
      slug: input.slug,
      kind: input.kind,
      academic_year: input.academic_year,
      start_date: input.start_date,
      end_date: input.end_date,
      is_current: input.is_current ?? false,
      is_grades_locked: input.is_grades_locked ?? false,
    })
    .eq("id", input.id)
    .select(termColumns)
    .single<TermRecord>()

  if (error) {
    throw new Error(`Failed to update term: ${error.message}`)
  }
  return data
}

async function clearCurrentTerms(exceptId?: string) {
  let query = getSupabase().from("terms").update({ is_current: false }).eq("is_current", true)
  if (exceptId) {
    query = query.neq("id", exceptId)
  }
  const { error } = await query
  if (error) {
    throw new Error(`Failed to clear current term flag: ${error.message}`)
  }
}

// ============================================================================
// Courses
// ============================================================================

export type CourseRecord = {
  id: string
  created_at: string
  updated_at: string
  code: string
  name: string
  subject: string | null
  department: string | null
  description: string | null
  grade_levels: string[]
  is_ap: boolean
  is_honors: boolean
  is_elective: boolean
  credit_hours: number
  active: boolean
  /** UC A-G subject area (A-G) for college reporting, or null. */
  uc_category: string | null
}

const courseColumns =
  "id, created_at, updated_at, code, name, subject, department, description, " +
  "grade_levels, is_ap, is_honors, is_elective, credit_hours, active, uc_category"

const courseCodeSchema = z
  .string()
  .trim()
  .min(1, "Course code is required.")
  .max(40)
  .regex(/^[A-Z0-9-]+$/, "Course code must be uppercase letters, digits, and hyphens only.")

const gradeLevelsSchema = z
  .array(z.string().trim().min(1).max(4))
  .max(10)
  .default([])

const courseFields = {
  code: courseCodeSchema,
  name: z.string().trim().min(1, "Name is required.").max(120),
  subject: z.string().trim().max(80).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  grade_levels: gradeLevelsSchema,
  is_ap: z.coerce.boolean().optional().default(false),
  is_honors: z.coerce.boolean().optional().default(false),
  is_elective: z.coerce.boolean().optional().default(false),
  credit_hours: z.coerce
    .number()
    .min(0, "Credit hours must be 0 or more.")
    .max(20, "Credit hours seems too high; double-check.")
    .default(1.0),
  active: z.coerce.boolean().optional().default(true),
  uc_category: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : null))
    .refine(
      (v) => v === null || ["A", "B", "C", "D", "E", "F", "G"].includes(v),
      "UC category must be a single letter A–G, or left blank."
    ),
}

export const courseCreateSchema = z.object(courseFields)
export type CourseCreateInput = z.infer<typeof courseCreateSchema>

export const courseUpdateSchema = z.object({ id: z.uuid(), ...courseFields })
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>

export async function listCourses(): Promise<CourseRecord[]> {
  const { data, error } = await getSupabase()
    .from("courses")
    .select(courseColumns)
    .order("active", { ascending: false })
    .order("code", { ascending: true })
    .returns<CourseRecord[]>()

  if (error) {
    throw new Error(`Failed to list courses: ${error.message}`)
  }
  return data
}

function courseRowFromInput(input: CourseCreateInput) {
  return {
    code: input.code,
    name: input.name,
    subject: input.subject?.trim() || null,
    department: input.department?.trim() || null,
    description: input.description?.trim() || null,
    grade_levels: input.grade_levels,
    is_ap: input.is_ap,
    is_honors: input.is_honors,
    is_elective: input.is_elective,
    credit_hours: input.credit_hours,
    active: input.active,
    uc_category: input.uc_category ?? null,
  }
}

export async function createCourse(input: CourseCreateInput): Promise<CourseRecord> {
  const { data, error } = await getSupabase()
    .from("courses")
    .insert(courseRowFromInput(input))
    .select(courseColumns)
    .single<CourseRecord>()

  if (error) {
    throw new Error(`Failed to create course: ${error.message}`)
  }
  return data
}

export async function updateCourse(input: CourseUpdateInput): Promise<CourseRecord> {
  const { id, ...rest } = input
  const { data, error } = await getSupabase()
    .from("courses")
    .update(courseRowFromInput(rest))
    .eq("id", id)
    .select(courseColumns)
    .single<CourseRecord>()

  if (error) {
    throw new Error(`Failed to update course: ${error.message}`)
  }
  return data
}

// ============================================================================
// Course sections
// ============================================================================

export const sectionPeriodSchema = z.enum([
  "period_1",
  "period_2",
  "period_3",
  "period_4",
  "period_5",
  "period_6",
  "elective_1",
  "elective_2",
  "async",
])
export type SectionPeriod = z.infer<typeof sectionPeriodSchema>

export const sectionModalitySchema = z.enum([
  "in_person",
  "online_async",
  "online_sync",
  "hybrid",
])
export type SectionModality = z.infer<typeof sectionModalitySchema>

export type CourseSectionRecord = {
  id: string
  created_at: string
  updated_at: string
  course_id: string
  term_id: string
  teacher_profile_id: string | null
  section_code: string | null
  period: SectionPeriod | null
  room: string | null
  max_enrollment: number | null
  modality: SectionModality
  notes: string | null
  course: { id: string; code: string; name: string }
  term: { id: string; name: string; slug: string; academic_year: string }
  teacher:
    | {
        id: string
        display_name: string | null
        first_name: string | null
        last_name: string | null
        email: string
        photo_path: string | null
      }
    | null
}

const courseSectionSelect = `
  id, created_at, updated_at, course_id, term_id, teacher_profile_id,
  section_code, period, room, max_enrollment, modality, notes,
  course:courses(id, code, name),
  term:terms(id, name, slug, academic_year),
  teacher:profiles(id, display_name, first_name, last_name, email, photo_path)
`

const sectionFields = {
  course_id: z.uuid("Pick a course."),
  term_id: z.uuid("Pick a term."),
  teacher_profile_id: z.uuid().nullable(),
  section_code: z.string().trim().max(20).nullable(),
  period: sectionPeriodSchema.nullable(),
  room: z.string().trim().max(40).nullable(),
  max_enrollment: z.coerce
    .number()
    .int()
    .positive("Max enrollment must be a positive whole number.")
    .nullable(),
  modality: sectionModalitySchema.default("in_person"),
  notes: z.string().trim().max(2000).nullable(),
}

export const sectionCreateSchema = z.object(sectionFields)
export type SectionCreateInput = z.infer<typeof sectionCreateSchema>

export const sectionUpdateSchema = z.object({ id: z.uuid(), ...sectionFields })
export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>

export async function listCourseSections(): Promise<CourseSectionRecord[]> {
  const { data, error } = await getSupabase()
    .from("course_sections")
    .select(courseSectionSelect)
    .order("created_at", { ascending: false })
    .returns<CourseSectionRecord[]>()

  if (error) {
    throw new Error(`Failed to list course sections: ${error.message}`)
  }
  return data
}

function sectionRowFromInput(input: SectionCreateInput) {
  return {
    course_id: input.course_id,
    term_id: input.term_id,
    teacher_profile_id: input.teacher_profile_id,
    section_code: input.section_code?.trim() || null,
    period: input.period,
    room: input.room?.trim() || null,
    max_enrollment: input.max_enrollment,
    modality: input.modality,
    notes: input.notes?.trim() || null,
  }
}

export async function createCourseSection(
  input: SectionCreateInput
): Promise<CourseSectionRecord> {
  const { data, error } = await getSupabase()
    .from("course_sections")
    .insert(sectionRowFromInput(input))
    .select(courseSectionSelect)
    .single<CourseSectionRecord>()

  if (error) {
    throw new Error(`Failed to create course section: ${error.message}`)
  }
  return data
}

export async function updateCourseSection(
  input: SectionUpdateInput
): Promise<CourseSectionRecord> {
  const { id, ...rest } = input
  const { data, error } = await getSupabase()
    .from("course_sections")
    .update(sectionRowFromInput(rest))
    .eq("id", id)
    .select(courseSectionSelect)
    .single<CourseSectionRecord>()

  if (error) {
    throw new Error(`Failed to update course section: ${error.message}`)
  }
  return data
}

export async function getCourseSectionById(
  id: string
): Promise<CourseSectionRecord | null> {
  const { data, error } = await getSupabase()
    .from("course_sections")
    .select(courseSectionSelect)
    .eq("id", id)
    .maybeSingle<CourseSectionRecord>()

  if (error) {
    throw new Error(`Failed to load course section: ${error.message}`)
  }
  return data
}

// ============================================================================
// Enrollments (a student in a course section)
// ============================================================================

export const enrollmentStatusSchema = z.enum([
  "enrolled",
  "dropped",
  "withdrawn",
  "completed",
  "audit",
])
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>

export type EnrollmentRecord = {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  section_id: string
  status: EnrollmentStatus
  enrolled_at: string
  dropped_at: string | null
  final_grade_percentage: number | null
  final_grade_letter: string | null
  grade_locked: boolean
  student: {
    id: string
    legal_first_name: string
    legal_last_name: string
    preferred_name: string | null
    current_grade: string | null
    status: StudentStatus
    profile: {
      id: string
      email: string
      display_name: string | null
      photo_path: string | null
    } | null
  } | null
}

const enrollmentSelect = `
  id, created_at, updated_at, student_id, section_id, status,
  enrolled_at, dropped_at, final_grade_percentage, final_grade_letter, grade_locked,
  student:students(
    id, legal_first_name, legal_last_name, preferred_name, current_grade, status,
    profile:profiles(id, email, display_name, photo_path)
  )
`

export const enrollStudentSchema = z.object({
  section_id: z.uuid(),
  student_id: z.uuid(),
  status: enrollmentStatusSchema.default("enrolled"),
})
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>

export const updateEnrollmentStatusInputSchema = z.object({
  enrollment_id: z.uuid(),
  status: enrollmentStatusSchema,
})
export type UpdateEnrollmentStatusInput = z.infer<typeof updateEnrollmentStatusInputSchema>

export async function listEnrollmentsForSection(
  sectionId: string
): Promise<EnrollmentRecord[]> {
  const { data, error } = await getSupabase()
    .from("enrollments")
    .select(enrollmentSelect)
    .eq("section_id", sectionId)
    .order("enrolled_at", { ascending: true })
    .returns<EnrollmentRecord[]>()

  if (error) {
    throw new Error(`Failed to list enrollments: ${error.message}`)
  }
  return data
}

// Idempotent: if (student, section) already has an enrollment row, return it
// instead of inserting a duplicate (which would hit the unique constraint).
// Useful when the admin clicks "Add" twice or re-adds a student after a drop.
export async function enrollStudentInSection(
  input: EnrollStudentInput
): Promise<{ enrollment: EnrollmentRecord; created: boolean }> {
  const { data: existing, error: lookupError } = await getSupabase()
    .from("enrollments")
    .select(enrollmentSelect)
    .eq("section_id", input.section_id)
    .eq("student_id", input.student_id)
    .maybeSingle<EnrollmentRecord>()

  if (lookupError) {
    throw new Error(`Failed to look up existing enrollment: ${lookupError.message}`)
  }

  if (existing) {
    return { enrollment: existing, created: false }
  }

  const { data, error } = await getSupabase()
    .from("enrollments")
    .insert({
      section_id: input.section_id,
      student_id: input.student_id,
      status: input.status,
    })
    .select(enrollmentSelect)
    .single<EnrollmentRecord>()

  if (error) {
    throw new Error(`Failed to enroll student: ${error.message}`)
  }
  return { enrollment: data, created: true }
}

export async function updateEnrollmentStatus(
  input: UpdateEnrollmentStatusInput
): Promise<EnrollmentRecord> {
  const patch: Record<string, unknown> = { status: input.status }

  // Track when a student leaves a section. Re-enrolling clears the timestamp.
  if (input.status === "dropped" || input.status === "withdrawn") {
    patch.dropped_at = new Date().toISOString()
  } else if (input.status === "enrolled") {
    patch.dropped_at = null
  }

  const { data, error } = await getSupabase()
    .from("enrollments")
    .update(patch)
    .eq("id", input.enrollment_id)
    .select(enrollmentSelect)
    .single<EnrollmentRecord>()

  if (error) {
    throw new Error(`Failed to update enrollment: ${error.message}`)
  }
  return data
}

// ============================================================================
// Student directory + detail
// ============================================================================

export type StudentDirectoryRow = {
  id: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
  current_grade: string | null
  enrollment_type: ApplicationEnrollmentType | null
  status: StudentStatus
  registered_at_hba: string | null
  application_id: string | null
  updated_at: string
  profile: {
    id: string
    email: string
    display_name: string | null
    photo_path: string | null
  } | null
}

export async function listStudentsForDirectory(filters?: {
  status?: StudentStatus | "all"
  enrollmentType?: ApplicationEnrollmentType | "all"
  /** Free-text search across legal/preferred name, profile email, and grade. */
  search?: string
  /** Filter by current_grade string (e.g. "9", "10", "K"). */
  grade?: string | "all"
}): Promise<StudentDirectoryRow[]> {
  let query = getSupabase()
    .from("students")
    .select(
      `id, legal_first_name, legal_last_name, preferred_name, current_grade,
       enrollment_type, status, registered_at_hba, application_id, updated_at,
       profile:profiles(id, email, display_name, photo_path)`
    )
    .order("legal_last_name", { ascending: true })
    .order("legal_first_name", { ascending: true })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters?.enrollmentType && filters.enrollmentType !== "all") {
    query = query.eq("enrollment_type", filters.enrollmentType)
  }
  if (filters?.grade && filters.grade !== "all") {
    query = query.eq("current_grade", filters.grade)
  }
  if (filters?.search && filters.search.trim().length > 0) {
    const term = filters.search.trim()
    // ILIKE search across the three name columns. Profile email search isn't
    // supported in the same query without a join filter, so we do that in
    // app code after fetching.
    query = query.or(
      [
        `legal_first_name.ilike.%${term}%`,
        `legal_last_name.ilike.%${term}%`,
        `preferred_name.ilike.%${term}%`,
      ].join(",")
    )
  }

  const { data, error } = await query.returns<StudentDirectoryRow[]>()
  if (error) {
    throw new Error(`Failed to list students: ${error.message}`)
  }
  // If searching, also include matches by profile email (post-filter).
  // This is approximate — Supabase's PostgREST .or() doesn't filter joined
  // tables. We re-fetch a separate query by email and merge if the search
  // looks like an email substring.
  if (filters?.search && filters.search.includes("@")) {
    const term = filters.search.trim()
    const { data: byEmail } = await getSupabase()
      .from("students")
      .select(
        `id, legal_first_name, legal_last_name, preferred_name, current_grade,
         enrollment_type, status, registered_at_hba, application_id, updated_at,
         profile:profiles!inner(id, email, display_name, photo_path)`
      )
      .ilike("profile.email", `%${term}%`)
      .returns<StudentDirectoryRow[]>()
    if (byEmail) {
      const seen = new Set(data.map((s) => s.id))
      for (const row of byEmail) {
        if (!seen.has(row.id)) data.push(row)
      }
    }
  }
  return data
}

export type StudentDetailParentLink = {
  id: string
  relationship: string | null
  is_primary: boolean
  is_homestay: boolean
  is_emergency_contact: boolean
  can_view_grades: boolean
  can_view_attendance: boolean
  can_receive_communications: boolean
  parent: {
    id: string
    personal_email: string | null
    email: string
    display_name: string | null
    first_name: string | null
    last_name: string | null
    mobile_phone: string | null
    work_phone: string | null
  } | null
}

export type StudentDetailEnrollment = {
  id: string
  status: EnrollmentStatus
  enrolled_at: string
  dropped_at: string | null
  final_grade_percentage: number | null
  final_grade_letter: string | null
  grade_locked: boolean
  section: {
    id: string
    section_code: string | null
    period: SectionPeriod | null
    room: string | null
    modality: SectionModality
    course: { id: string; code: string; name: string } | null
    term: { id: string; name: string; slug: string; academic_year: string; start_date: string } | null
    teacher:
      | {
          id: string
          display_name: string | null
          first_name: string | null
          last_name: string | null
          email: string
          photo_path: string | null
        }
      | null
  } | null
}

export type StudentDetailRecord = StudentRecord & {
  profile: ProfileRecord | null
  parent_links: StudentDetailParentLink[]
  enrollments: StudentDetailEnrollment[]
}

export async function getStudentDetail(
  id: string
): Promise<StudentDetailRecord | null> {
  const { data: student, error: studentError } = await getSupabase()
    .from("students")
    .select(
      `${studentColumns},
       profile:profiles(${profileColumns})`
    )
    .eq("id", id)
    .maybeSingle<StudentRecord & { profile: ProfileRecord | null }>()

  if (studentError) {
    throw new Error(`Failed to load student: ${studentError.message}`)
  }
  if (!student) {
    return null
  }

  const [parentLinksResult, enrollmentsResult] = await Promise.all([
    getSupabase()
      .from("parent_links")
      .select(
        `id, relationship, is_primary, is_homestay, is_emergency_contact,
         can_view_grades, can_view_attendance, can_receive_communications,
         parent:profiles(id, email, display_name, first_name, last_name, mobile_phone, work_phone, personal_email)`
      )
      .eq("student_id", id)
      .order("is_primary", { ascending: false })
      .order("is_homestay", { ascending: true })
      .returns<StudentDetailParentLink[]>(),
    getSupabase()
      .from("enrollments")
      .select(
        `id, status, enrolled_at, dropped_at, final_grade_percentage,
         final_grade_letter, grade_locked,
         section:course_sections(
           id, section_code, period, room, modality,
           course:courses(id, code, name),
           term:terms(id, name, slug, academic_year, start_date),
           teacher:profiles(id, display_name, first_name, last_name, email, photo_path)
         )`
      )
      .eq("student_id", id)
      .order("enrolled_at", { ascending: false })
      .returns<StudentDetailEnrollment[]>(),
  ])

  if (parentLinksResult.error) {
    throw new Error(`Failed to load parent links: ${parentLinksResult.error.message}`)
  }
  if (enrollmentsResult.error) {
    throw new Error(`Failed to load student enrollments: ${enrollmentsResult.error.message}`)
  }

  return {
    ...student,
    parent_links: parentLinksResult.data ?? [],
    enrollments: enrollmentsResult.data ?? [],
  }
}

export const studentAdminUpdateSchema = z.object({
  id: z.uuid(),
  status: studentStatusSchema,
  current_grade: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  registered_at_hba: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  internal_notes: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  assigned_to: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
})
export type StudentAdminUpdateInput = z.infer<typeof studentAdminUpdateSchema>

// Family-provided demographic fields. Originally captured by the application,
// editable here so admin can fix typos / fill omissions without re-doing the
// whole application.
const optionalShortString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

export const studentDemographicsUpdateSchema = z.object({
  id: z.uuid(),
  legal_first_name: z.string().trim().min(1, "Legal first name is required.").max(80),
  legal_middle_name: optionalShortString(80),
  legal_last_name: z.string().trim().min(1, "Legal last name is required.").max(80),
  suffix: optionalShortString(20),
  preferred_name: optionalShortString(80),
  dob: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  gender: optionalShortString(40),
  pronouns: optionalShortString(40),
  birthplace: optionalShortString(200),
  primary_language: optionalShortString(80),
  secondary_language: optionalShortString(80),
  english_proficiency: optionalShortString(40),
  enrollment_type: z
    .union([z.enum(["summer", "part_time", "full_time"]), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  is_international: z
    .union([z.literal("domestic"), z.literal("international"), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "international") return true
      if (value === "domestic") return false
      return null
    }),
  address_line1: optionalShortString(200),
  address_line2: optionalShortString(200),
  address_city: optionalShortString(120),
  address_region: optionalShortString(120),
  address_postal_code: optionalShortString(40),
  address_country: optionalShortString(120),
})
export type StudentDemographicsUpdateInput = z.infer<typeof studentDemographicsUpdateSchema>

export async function updateStudentDemographics(
  input: StudentDemographicsUpdateInput
): Promise<StudentRecord> {
  const { id, ...rest } = input
  const { data, error } = await getSupabase()
    .from("students")
    .update(rest)
    .eq("id", id)
    .select(studentColumns)
    .single<StudentRecord>()

  if (error) {
    throw new Error(`Failed to update student demographics: ${error.message}`)
  }
  return data
}

export const withdrawStudentInputSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1, "Reason is required.").max(2000),
  /** When true, also mark every current-status enrollment as
   *  withdrawn. Default true — withdrawing a student usually means
   *  they're not attending anything anymore. */
  withdraw_enrollments: z.coerce.boolean().default(true),
})
export type WithdrawStudentInput = z.infer<typeof withdrawStudentInputSchema>

export type WithdrawStudentResult = {
  student: StudentRecord
  enrollments_withdrawn: number
}

export async function withdrawStudent(
  input: WithdrawStudentInput
): Promise<WithdrawStudentResult> {
  const today = new Date().toISOString().slice(0, 10)
  const supabase = getSupabase()
  const { data: student, error } = await supabase
    .from("students")
    .update({
      status: "withdrawn",
      withdrawn_at: today,
      withdrawn_reason: input.reason,
    })
    .eq("id", input.id)
    .select(studentColumns)
    .single<StudentRecord>()

  if (error || !student) {
    throw new Error(`Failed to withdraw student: ${error?.message ?? "no row"}`)
  }

  let enrollmentsWithdrawn = 0
  if (input.withdraw_enrollments) {
    const { data: updated, error: enrollErr } = await supabase
      .from("enrollments")
      .update({
        status: "withdrawn",
        dropped_at: new Date().toISOString(),
      })
      .eq("student_id", input.id)
      .in("status", ["enrolled", "audit"])
      .select("id")
    if (enrollErr) {
      // Log but don't roll back — the student status is the source
      // of truth; enrollments can be cleaned up manually if needed.
      console.error(
        `withdrawStudent: enrollment-flip failed for ${input.id}: ${enrollErr.message}`
      )
    } else {
      enrollmentsWithdrawn = updated?.length ?? 0
    }
  }

  return { student, enrollments_withdrawn: enrollmentsWithdrawn }
}

export type DeleteStudentResult = {
  student_id: string
  profile_deleted: boolean
  profile_email: string | null
  /** Returned so the caller can hand it to the Graph delete API. We don't
   *  call Graph from here so this module stays DB-only. */
  student_hba_email: string | null
}

// Hard delete a student record. Requires the student to already be in
// 'withdrawn' status — a deliberate two-step gate so admins don't lose
// data with one stray click. The students FK cascades clean up
// parent_links, post-enrollment data, schedule draft requests, and
// incidents. enrollments_id → students has on-delete-restrict, so
// students with active course-section enrollments are refused; the
// admin must drop those first (usually via withdraw_enrollments=true
// during the withdraw step).
//
// When `deleteProfile` is true, also removes the student's @hba profile
// row, BUT only if it isn't referenced as a parent on any other
// student. (Wouldn't happen for a typical student, but a sibling
// enrolling under the same M365 mail somehow would.)
export async function deleteStudent(input: {
  id: string
  deleteProfile: boolean
}): Promise<DeleteStudentResult> {
  const supabase = getSupabase()

  const { data: student, error: loadError } = await supabase
    .from("students")
    .select("id, profile_id, status, profile:profiles(email)")
    .eq("id", input.id)
    .maybeSingle<{
      id: string
      profile_id: string
      status: StudentStatus
      profile: { email: string } | null
    }>()

  if (loadError) {
    throw new Error(`Failed to load student before delete: ${loadError.message}`)
  }
  if (!student) {
    throw new Error("Student not found.")
  }
  if (student.status !== "withdrawn") {
    throw new Error(
      "Only withdrawn students can be deleted. Withdraw first, then come back to delete."
    )
  }

  const studentHbaEmail = student.profile?.email ?? null
  const profileId = student.profile_id

  const { error: deleteError } = await supabase
    .from("students")
    .delete()
    .eq("id", input.id)
  if (deleteError) {
    // Most likely failure: enrollments still exist (on-delete-restrict).
    throw new Error(
      `Failed to delete student: ${deleteError.message}. ` +
        `If this mentions enrollments, drop or complete them first.`
    )
  }

  let profileDeleted = false
  if (input.deleteProfile && profileId) {
    // Refuse if the profile is referenced as a parent on any other
    // student — wouldn't be normal for an @hba student profile, but
    // also wouldn't be recoverable, so we check.
    const { count: parentLinkCount, error: countError } = await supabase
      .from("parent_links")
      .select("id", { count: "exact", head: true })
      .eq("parent_profile_id", profileId)
    if (countError) {
      throw new Error(
        `Failed to verify profile is safe to delete: ${countError.message}`
      )
    }
    if ((parentLinkCount ?? 0) > 0) {
      // Leave the profile in place — student delete already succeeded,
      // surface this to the caller via the result rather than throwing.
      return {
        student_id: input.id,
        profile_deleted: false,
        profile_email: studentHbaEmail,
        student_hba_email: studentHbaEmail,
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId)
    if (profileError) {
      throw new Error(`Failed to delete student profile: ${profileError.message}`)
    }
    profileDeleted = true
  }

  return {
    student_id: input.id,
    profile_deleted: profileDeleted,
    profile_email: studentHbaEmail,
    student_hba_email: studentHbaEmail,
  }
}

export async function updateStudentAdmin(
  input: StudentAdminUpdateInput
): Promise<StudentRecord> {
  const patch: Record<string, unknown> = {
    status: input.status,
    current_grade: input.current_grade,
    registered_at_hba: input.registered_at_hba,
    internal_notes: input.internal_notes,
    assigned_to: input.assigned_to,
  }

  // Track the date the student left HBA. Only set it when transitioning into
  // graduated/withdrawn (don't overwrite an existing date if we're just
  // patching notes on an already-graduated student).
  if (input.status === "graduated" || input.status === "withdrawn") {
    const dateColumn = input.status === "graduated" ? "graduated_at" : "withdrawn_at"
    const existing = await getSupabase()
      .from("students")
      .select(`status, ${dateColumn}`)
      .eq("id", input.id)
      .single<{ status: StudentStatus } & Record<string, string | null>>()
    if (existing.error) {
      throw new Error(`Failed to look up student before status update: ${existing.error.message}`)
    }
    if (!existing.data?.[dateColumn]) {
      patch[dateColumn] = new Date().toISOString().slice(0, 10)
    }
  }

  const { data, error } = await getSupabase()
    .from("students")
    .update(patch)
    .eq("id", input.id)
    .select(studentColumns)
    .single<StudentRecord>()

  if (error) {
    throw new Error(`Failed to update student: ${error.message}`)
  }
  return data
}

// ============================================================================
// Students lister — for the "add student to section" dropdown.
// ============================================================================

export type StudentOption = {
  id: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
  current_grade: string | null
  status: StudentStatus
  profile: {
    id: string
    email: string
    display_name: string | null
  } | null
}

export async function listStudents(filters?: {
  includeWithdrawn?: boolean
  includeGraduated?: boolean
}): Promise<StudentOption[]> {
  let query = getSupabase()
    .from("students")
    .select(
      `id, legal_first_name, legal_last_name, preferred_name, current_grade, status,
       profile:profiles(id, email, display_name, photo_path)`
    )
    .order("legal_last_name", { ascending: true })
    .order("legal_first_name", { ascending: true })

  // Active by default; admin can opt into the broader pool when re-enrolling
  // a withdrawn student or auditing a graduate.
  const statuses: StudentStatus[] = ["active"]
  if (filters?.includeWithdrawn) statuses.push("withdrawn")
  if (filters?.includeGraduated) statuses.push("graduated")
  query = query.in("status", statuses)

  const { data, error } = await query.returns<StudentOption[]>()

  if (error) {
    throw new Error(`Failed to list students: ${error.message}`)
  }
  return data
}

export function studentLabel(option: StudentOption): string {
  const preferred = option.preferred_name?.trim()
  const legal = `${option.legal_first_name} ${option.legal_last_name}`.trim()
  const display = preferred ? `${preferred} (${legal})` : legal
  if (option.current_grade) {
    return `${display} — grade ${option.current_grade}`
  }
  return display
}

// ============================================================================
// Faculty lister — for the teacher dropdown on course_sections.
// Returns active profiles whose roles include 'faculty' OR 'admin' (admins
// at HBA also teach). Ordered by last name when available, falling back to
// display name / email.
// ============================================================================

export type FacultyOption = {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  roles: ProfileRole[]
}

export async function listFaculty(): Promise<FacultyOption[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, email, display_name, first_name, last_name, roles")
    .eq("active", true)
    .or("roles.cs.{faculty},roles.cs.{admin}")
    .returns<FacultyOption[]>()

  if (error) {
    throw new Error(`Failed to list faculty: ${error.message}`)
  }

  const compareKey = (option: FacultyOption) =>
    (option.last_name ||
      option.display_name ||
      option.first_name ||
      option.email)
      .toLowerCase()

  return [...(data ?? [])].sort((left, right) =>
    compareKey(left).localeCompare(compareKey(right))
  )
}

export function facultyLabel(option: FacultyOption): string {
  const fullName = [option.first_name, option.last_name].filter(Boolean).join(" ").trim()
  if (fullName) return `${fullName} (${option.email})`
  if (option.display_name) return `${option.display_name} (${option.email})`
  return option.email
}

// ============================================================================
// M365 sync (called from /admin/profiles "Sync from M365" action)
// ============================================================================

export type M365SyncRow = {
  email: string
  entra_oid: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  active: boolean
}

export type M365SyncResult = {
  created: number
  updated: number
  skipped: number  // existing rows we left fully untouched (no fields to patch)
}

// Upserts a single M365 user into the profiles table. Strategy:
//   - If no profile exists for this email: insert with role defaulted to
//     'admin' for bootstrap-list emails, else empty. Empty-role profiles
//     get backfilled to 'faculty' on first sign-in (the existing
//     bootstrapProfileForSignIn logic handles that). Students get role
//     'student' set explicitly by enrollAcceptedApplication, so we don't
//     guess from M365 alone.
//   - If a profile exists: never touch the roles array. Patch entra_oid
//     when null. Patch first/last/display name when null. Always sync the
//     active flag from M365's accountEnabled (so disabled M365 accounts
//     can't sign in here either).
async function upsertProfileFromM365(row: M365SyncRow): Promise<"created" | "updated" | "skipped"> {
  const supabase = getSupabase()
  const existing = await getProfileByEmail(row.email)

  if (!existing) {
    // New M365 profiles start with no roles. Admins promote from /admin/profiles.
    const defaultRoles: ProfileRole[] = []
    const { error } = await supabase.from("profiles").insert({
      email: row.email,
      entra_oid: row.entra_oid,
      display_name: row.display_name,
      first_name: row.first_name,
      last_name: row.last_name,
      roles: defaultRoles,
      active: row.active,
    })
    if (error) {
      throw new Error(`M365 sync: failed to insert ${row.email}: ${error.message}`)
    }
    return "created"
  }

  const patch: Record<string, unknown> = {}
  if (!existing.entra_oid && row.entra_oid) patch.entra_oid = row.entra_oid
  if (!existing.display_name && row.display_name) patch.display_name = row.display_name
  if (!existing.first_name && row.first_name) patch.first_name = row.first_name
  if (!existing.last_name && row.last_name) patch.last_name = row.last_name
  // Always sync active from M365 — that's the source of truth for "is this
  // person still on staff." We don't preserve a local override here on
  // purpose; if you deactivate someone in SIS but they're still in M365,
  // they'll be reactivated on the next sync. The right move is to disable
  // them in M365.
  if (existing.active !== row.active) patch.active = row.active

  if (Object.keys(patch).length === 0) {
    return "skipped"
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", existing.id)
  if (error) {
    throw new Error(`M365 sync: failed to update ${row.email}: ${error.message}`)
  }
  return "updated"
}

export async function syncProfilesFromM365(rows: M365SyncRow[]): Promise<M365SyncResult> {
  const result: M365SyncResult = { created: 0, updated: 0, skipped: 0 }
  for (const row of rows) {
    const outcome = await upsertProfileFromM365(row)
    result[outcome] += 1
  }
  return result
}

// ============================================================================
// Profile directory + role management (admin)
// ============================================================================

export const profileListFilterSchema = z.object({
  role: z.union([profileRoleSchema, z.literal("all")]).optional().default("all"),
  search: z.string().trim().max(200).optional().default(""),
  include_inactive: z.coerce.boolean().optional().default(false),
})
export type ProfileListFilter = z.infer<typeof profileListFilterSchema>

export async function listProfiles(filter: ProfileListFilter): Promise<ProfileRecord[]> {
  let query = getSupabase()
    .from("profiles")
    .select(profileColumns)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true, nullsFirst: false })
    .order("email", { ascending: true })

  if (!filter.include_inactive) {
    query = query.eq("active", true)
  }

  if (filter.role !== "all") {
    // Postgres array-contains operator. roles @> '{admin}' matches when admin
    // is one of the profile's roles.
    query = query.contains("roles", [filter.role])
  }

  if (filter.search.length > 0) {
    // Case-insensitive match across email + name fields.
    const pattern = `%${filter.search}%`
    query = query.or(
      `email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},display_name.ilike.${pattern}`
    )
  }

  const { data, error } = await query.returns<ProfileRecord[]>()
  if (error) {
    throw new Error(`Failed to list profiles: ${error.message}`)
  }
  return data
}

export const profileRolesUpdateSchema = z.object({
  id: z.uuid(),
  roles: z
    .array(profileRoleSchema)
    .min(0)
    .max(4),
})
export type ProfileRolesUpdateInput = z.infer<typeof profileRolesUpdateSchema>

// Hard-deletes a profile after checking that no SIS data depends on it.
// Safety rules (refuses delete + throws if any apply):
//   - profile has a student record (would orphan all academic data)
//   - profile has parent_links rows (would orphan parent-child relationships)
//   - profile is currently active (force admin to deactivate first as an
//     intentional double-check)
//   - profile is the only active admin (last-admin guard)
//
// Course_sections referencing this profile as teacher get teacher_profile_id
// set to null automatically by the existing FK (on delete set null), so
// teaching history isn't lost; the section just shows "unassigned" until
// re-staffed.
export async function deleteProfile(profileId: string): Promise<void> {
  const supabase = getSupabase()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, active, roles")
    .eq("id", profileId)
    .single<{ id: string; email: string; active: boolean; roles: ProfileRole[] }>()

  if (profileError) {
    throw new Error(`Failed to load profile before delete: ${profileError.message}`)
  }

  // We used to require profile.active === false as a sanity gate, but
  // the FK guards below (student record, parent_links, last-admin) are
  // the load-bearing checks — anything that gets past them is genuinely
  // orphan and safe to remove. Forcing a deactivate-then-delete dance
  // just added clicks for the common case of cleaning up a parent
  // profile after their last student was deleted.

  if (profile.roles.includes("admin")) {
    const adminCount = await countActiveAdminProfiles()
    if (adminCount <= 1) {
      throw new Error("Can't delete the last admin profile.")
    }
  }

  // Student record check.
  const { count: studentCount, error: studentError } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
  if (studentError) {
    throw new Error(`Failed to check students: ${studentError.message}`)
  }
  if (studentCount && studentCount > 0) {
    throw new Error(
      `This profile is linked to a student record (${profile.email}). Delete the student record first if you really want this gone — or just leave the profile inactive.`
    )
  }

  // Parent links check.
  const { count: parentLinkCount, error: parentError } = await supabase
    .from("parent_links")
    .select("id", { count: "exact", head: true })
    .eq("parent_profile_id", profileId)
  if (parentError) {
    throw new Error(`Failed to check parent links: ${parentError.message}`)
  }
  if (parentLinkCount && parentLinkCount > 0) {
    throw new Error(
      `This profile is linked as a parent to ${parentLinkCount} student(s). Detach those links first.`
    )
  }

  const { error: deleteError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId)
  if (deleteError) {
    throw new Error(`Failed to delete profile: ${deleteError.message}`)
  }
}

// Counts how many active profiles have 'admin' in their roles. Used by the
// last-admin guard below.
export async function countActiveAdminProfiles(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("active", true)
    .contains("roles", ["admin"])

  if (error) {
    throw new Error(`Failed to count active admin profiles: ${error.message}`)
  }
  return count ?? 0
}

export async function updateProfileRoles(input: ProfileRolesUpdateInput): Promise<ProfileRecord> {
  // Last-admin protection: refuse to strip 'admin' if this profile is
  // currently the only active admin in the directory. The bootstrap
  // admin list in lib/admin.ts is a separate safety net — even if this
  // check is bypassed by a direct SQL edit, those four founder emails
  // still have admin access at the auth layer.
  const supabase = getSupabase()

  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("id, email, roles, active")
    .eq("id", input.id)
    .single<{ id: string; email: string; roles: ProfileRole[]; active: boolean }>()

  if (currentError) {
    throw new Error(`Failed to load profile before role update: ${currentError.message}`)
  }

  const wasAdmin = current.roles.includes("admin") && current.active
  const willBeAdmin = input.roles.includes("admin")

  if (wasAdmin && !willBeAdmin) {
    const adminCount = await countActiveAdminProfiles()
    if (adminCount <= 1) {
      throw new Error(
        "Can't remove admin from this profile — at least one active admin must always exist. Promote another profile to admin first, then revisit this change."
      )
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ roles: input.roles })
    .eq("id", input.id)
    .select(profileColumns)
    .single<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to update profile roles: ${error.message}`)
  }
  return data
}

export const profileActiveUpdateSchema = z.object({
  id: z.uuid(),
  active: z.coerce.boolean(),
})
export type ProfileActiveUpdateInput = z.infer<typeof profileActiveUpdateSchema>

export async function updateProfileActive(
  input: ProfileActiveUpdateInput
): Promise<ProfileRecord> {
  const supabase = getSupabase()

  // Last-admin protection mirrors updateProfileRoles: refuse to deactivate
  // the only remaining active admin.
  if (!input.active) {
    const { data: current, error: currentError } = await supabase
      .from("profiles")
      .select("id, roles, active")
      .eq("id", input.id)
      .single<{ id: string; roles: ProfileRole[]; active: boolean }>()

    if (currentError) {
      throw new Error(`Failed to load profile before active update: ${currentError.message}`)
    }

    if (current.roles.includes("admin") && current.active) {
      const adminCount = await countActiveAdminProfiles()
      if (adminCount <= 1) {
        throw new Error(
          "Can't deactivate this profile — it's the only active admin. Promote another profile to admin first, then revisit."
        )
      }
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ active: input.active })
    .eq("id", input.id)
    .select(profileColumns)
    .single<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to update profile active state: ${error.message}`)
  }
  return data
}

// Inline edit of contact details for a profile (used both by the profiles
// directory and the parent-edit form on the student detail page).
//
// Each field transform preserves undefined-vs-null so partial forms (a
// "name + phone only" editor) can submit only the fields they show and
// updateProfileContact below will skip the missing keys instead of
// wiping populated columns the form didn't expose. Explicit blanks
// (user cleared the input) still come through as null and overwrite.
const optionalProfileField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined
      if (value === null || value.length === 0) return null
      return value
    })

export const profileContactUpdateSchema = z.object({
  id: z.uuid(),
  first_name: optionalProfileField(80),
  last_name: optionalProfileField(80),
  display_name: optionalProfileField(160),
  personal_email: z
    .union([z.email(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined
      if (value === null || value.length === 0) return null
      return value
    }),
  mobile_phone: optionalProfileField(40),
  work_phone: optionalProfileField(40),
  address_line1: optionalProfileField(200),
  address_line2: optionalProfileField(200),
  address_city: optionalProfileField(120),
  address_region: optionalProfileField(120),
  address_postal_code: optionalProfileField(40),
  address_country: optionalProfileField(120),
})
export type ProfileContactUpdateInput = z.infer<typeof profileContactUpdateSchema>

export async function updateProfileContact(
  input: ProfileContactUpdateInput
): Promise<ProfileRecord> {
  const { id, ...rest } = input
  // Only patch fields the caller explicitly included. The schema's
  // .optional() transform turns missing keys into undefined; we drop
  // those from the update payload so a small "edit name + phone"
  // form can't accidentally wipe address fields it didn't show.
  // Explicit nulls (user blanked the input) are still written.
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) patch[key] = value
  }
  if (Object.keys(patch).length === 0) {
    const existing = await getProfileById(id)
    if (!existing) {
      throw new Error("Profile not found.")
    }
    return existing
  }

  const { data, error } = await getSupabase()
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(profileColumns)
    .single<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to update profile contact: ${error.message}`)
  }
  return data
}

// Edit of relationship + portal permissions on a parent_link row. Separate
// from the parent profile contact edit so admin can change e.g. "primary
// guardian" without touching the parent's name/phone.
export const parentLinkUpdateSchema = z.object({
  id: z.uuid(),
  relationship: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  is_primary: z.coerce.boolean().optional().default(false),
  is_homestay: z.coerce.boolean().optional().default(false),
  is_emergency_contact: z.coerce.boolean().optional().default(true),
  can_view_grades: z.coerce.boolean().optional().default(true),
  can_view_attendance: z.coerce.boolean().optional().default(true),
  can_receive_communications: z.coerce.boolean().optional().default(true),
})
export type ParentLinkUpdateInput = z.infer<typeof parentLinkUpdateSchema>

export async function updateParentLink(input: ParentLinkUpdateInput) {
  const { id, ...rest } = input
  const { error } = await getSupabase()
    .from("parent_links")
    .update(rest)
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to update parent link: ${error.message}`)
  }
}

// Manually attach a parent/guardian to a student. The Enroll workflow
// builds parent_links from an application's guardian fields, but most
// HBA students enrolled years ago with no application on file — this
// is how the office adds guardian info for them. Find-or-creates the
// parent profile by email (adding the 'parent' role if missing), then
// inserts the link. Refuses a duplicate (student, parent) pair.
export const createParentLinkSchema = z.object({
  student_id: z.uuid(),
  parent_email: z.string().trim().email().toLowerCase(),
  parent_first_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  parent_last_name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  parent_mobile_phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  relationship: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  is_primary: z.coerce.boolean().optional().default(false),
  is_homestay: z.coerce.boolean().optional().default(false),
  is_emergency_contact: z.coerce.boolean().optional().default(true),
  can_view_grades: z.coerce.boolean().optional().default(true),
  can_view_attendance: z.coerce.boolean().optional().default(true),
  can_receive_communications: z.coerce.boolean().optional().default(true),
})
export type CreateParentLinkInput = z.infer<typeof createParentLinkSchema>

export async function createParentLinkForStudent(
  input: CreateParentLinkInput
): Promise<ParentLinkRecord> {
  const displayName = [input.parent_first_name, input.parent_last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  const { profile } = await findOrCreateProfile({
    email: input.parent_email,
    role: "parent",
    first_name: input.parent_first_name,
    last_name: input.parent_last_name,
    display_name: displayName.length > 0 ? displayName : null,
    mobile_phone: input.parent_mobile_phone,
  })

  const existing = await getParentLink(input.student_id, profile.id)
  if (existing) {
    throw new Error(
      "That person is already linked to this student. Edit the existing link instead."
    )
  }

  const { data, error } = await getSupabase()
    .from("parent_links")
    .insert({
      student_id: input.student_id,
      parent_profile_id: profile.id,
      relationship: input.relationship,
      is_primary: input.is_primary,
      is_homestay: input.is_homestay,
      is_emergency_contact: input.is_emergency_contact,
      can_view_grades: input.can_view_grades,
      can_view_attendance: input.can_view_attendance,
      can_receive_communications: input.can_receive_communications,
    })
    .select(parentLinkColumns)
    .single<ParentLinkRecord>()

  if (error) {
    throw new Error(`Failed to create parent link: ${error.message}`)
  }
  return data
}

// ============================================================================
// Parent → students lookup (parent portal)
// ============================================================================

export type ParentStudentLink = {
  link_id: string
  student: StudentRecord
  /** Thin slice of the student's profile for avatar rendering on the
   *  parent picker. Full profile lives on /parent/students/[id] pages. */
  student_profile: {
    id: string
    display_name: string | null
    email: string
    photo_path: string | null
  } | null
  parent_link: {
    relationship: string | null
    is_primary: boolean
    is_homestay: boolean
    can_view_grades: boolean
    can_view_attendance: boolean
    can_receive_communications: boolean
  }
}

// Returns each (parent_link, student) pair for the signed-in parent profile.
// One row per kid; if a parent is linked to two students, two rows.
export async function listStudentsForParent(
  parentProfileId: string
): Promise<ParentStudentLink[]> {
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(
      `id, relationship, is_primary, is_homestay, can_view_grades,
       can_view_attendance, can_receive_communications,
       student:students(
         ${studentColumns},
         profile:profiles(id, display_name, email, photo_path)
       )`
    )
    .eq("parent_profile_id", parentProfileId)
    .returns<
      Array<{
        id: string
        relationship: string | null
        is_primary: boolean
        is_homestay: boolean
        can_view_grades: boolean
        can_view_attendance: boolean
        can_receive_communications: boolean
        student:
          | (StudentRecord & {
              profile: {
                id: string
                display_name: string | null
                email: string
                photo_path: string | null
              } | null
            })
          | null
      }>
    >()

  if (error) {
    throw new Error(`Failed to list students for parent: ${error.message}`)
  }

  // Filter out broken links where the student row was removed.
  return (data ?? [])
    .filter(
      (row): row is typeof row & { student: NonNullable<typeof row.student> } =>
        row.student !== null
    )
    .map((row) => {
      const { profile, ...studentCore } = row.student
      return {
        link_id: row.id,
        student: studentCore as StudentRecord,
        student_profile: profile,
        parent_link: {
          relationship: row.relationship,
          is_primary: row.is_primary,
          is_homestay: row.is_homestay,
          can_view_grades: row.can_view_grades,
          can_view_attendance: row.can_view_attendance,
          can_receive_communications: row.can_receive_communications,
        },
      }
    })
}

// Verifies a parent profile is linked to a specific student. Used by parent
// portal pages to gate /parent/students/[id] access.
export async function getParentLinkForStudent(
  parentProfileId: string,
  studentId: string
): Promise<ParentStudentLink["parent_link"] | null> {
  const { data, error } = await getSupabase()
    .from("parent_links")
    .select(
      `id, relationship, is_primary, is_homestay,
       can_view_grades, can_view_attendance, can_receive_communications`
    )
    .eq("parent_profile_id", parentProfileId)
    .eq("student_id", studentId)
    .maybeSingle<{
      id: string
      relationship: string | null
      is_primary: boolean
      is_homestay: boolean
      can_view_grades: boolean
      can_view_attendance: boolean
      can_receive_communications: boolean
    }>()

  if (error) {
    throw new Error(`Failed to check parent link: ${error.message}`)
  }
  if (!data) return null
  return {
    relationship: data.relationship,
    is_primary: data.is_primary,
    is_homestay: data.is_homestay,
    can_view_grades: data.can_view_grades,
    can_view_attendance: data.can_view_attendance,
    can_receive_communications: data.can_receive_communications,
  }
}

// ============================================================================
// Bulk student import
// ============================================================================

export const bulkStudentRowSchema = z.object({
  hba_email: z.string().trim().toLowerCase().email("Invalid hba_email"),
  legal_first_name: z.string().trim().min(1, "legal_first_name is required").max(100),
  legal_last_name: z.string().trim().min(1, "legal_last_name is required").max(100),
  preferred_name: z.string().trim().max(100).optional().nullable().transform(
    (v) => (v && v.length > 0 ? v : null)
  ),
  current_grade: z.string().trim().max(10).optional().nullable().transform(
    (v) => (v && v.length > 0 ? v : null)
  ),
  dob: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  enrollment_type: z
    .enum(["summer", "part_time", "full_time"])
    .optional()
    .nullable(),
})
export type BulkStudentRow = z.infer<typeof bulkStudentRowSchema>

export type BulkStudentOutcome = {
  total_rows: number
  students_created: number
  students_skipped_existing: number
  profiles_created: number
  rows_failed: number
  errors: Array<{ row_number: number; message: string }>
}

export async function bulkCreateStudents(
  rows: BulkStudentRow[]
): Promise<BulkStudentOutcome> {
  const outcome: BulkStudentOutcome = {
    total_rows: rows.length,
    students_created: 0,
    students_skipped_existing: 0,
    profiles_created: 0,
    rows_failed: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowNumber = i + 1
    try {
      const { profile, created: profileCreated } = await findOrCreateProfile({
        email: row.hba_email,
        role: "student",
        first_name: row.legal_first_name,
        last_name: row.legal_last_name,
      })
      if (profileCreated) outcome.profiles_created += 1

      // Existing student on this profile? Skip — re-imports shouldn't dup.
      const { data: existing, error: existingError } = await getSupabase()
        .from("students")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle<{ id: string }>()
      if (existingError) {
        outcome.rows_failed += 1
        outcome.errors.push({ row_number: rowNumber, message: existingError.message })
        continue
      }
      if (existing) {
        outcome.students_skipped_existing += 1
        continue
      }

      const { error: insertError } = await getSupabase().from("students").insert({
        profile_id: profile.id,
        legal_first_name: row.legal_first_name,
        legal_last_name: row.legal_last_name,
        preferred_name: row.preferred_name,
        current_grade: row.current_grade,
        dob: row.dob,
        enrollment_type: row.enrollment_type,
        status: "active",
        registered_at_hba: new Date().toISOString().slice(0, 10),
      })
      if (insertError) {
        outcome.rows_failed += 1
        outcome.errors.push({ row_number: rowNumber, message: insertError.message })
        continue
      }
      outcome.students_created += 1
    } catch (error) {
      outcome.rows_failed += 1
      outcome.errors.push({
        row_number: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return outcome
}

// ============================================================================
// Bulk parent-link import
// ============================================================================

export const bulkParentLinkRowSchema = z.object({
  student_email: z.string().trim().toLowerCase().email("Invalid student_email"),
  parent_email: z.string().trim().toLowerCase().email("Invalid parent_email"),
  // Free-text. Common values: Mother, Father, Guardian, Homestay host.
  relationship: z.string().trim().max(80).optional().nullable().transform(
    (v) => (v && v.length > 0 ? v : null)
  ),
  is_primary: z.boolean().optional().default(false),
  is_homestay: z.boolean().optional().default(false),
  is_emergency_contact: z.boolean().optional().default(false),
  can_view_grades: z.boolean().optional().default(true),
  can_view_attendance: z.boolean().optional().default(true),
  can_receive_communications: z.boolean().optional().default(true),
})
export type BulkParentLinkRow = z.infer<typeof bulkParentLinkRowSchema>

export type BulkParentLinkOutcome = {
  total_rows: number
  links_created: number
  links_existing: number
  profiles_created: number
  rows_failed: number
  /** Human-readable per-row issues. Aligned to source CSV line numbers. */
  errors: Array<{ row_number: number; message: string }>
}

// Bulk creates parent_link rows for many (student, parent) pairs. Idempotent
// on (student_id, parent_profile_id): re-running a CSV won't duplicate links.
// Parent profiles are auto-created (role: parent) if the email doesn't have
// one yet.
export async function bulkCreateParentLinks(
  rows: BulkParentLinkRow[]
): Promise<BulkParentLinkOutcome> {
  const outcome: BulkParentLinkOutcome = {
    total_rows: rows.length,
    links_created: 0,
    links_existing: 0,
    profiles_created: 0,
    rows_failed: 0,
    errors: [],
  }

  // Pre-resolve every distinct student_email → student.id in one batch.
  const studentEmails = Array.from(new Set(rows.map((r) => r.student_email)))
  const studentByEmail = new Map<string, string>()
  if (studentEmails.length > 0) {
    const { data, error } = await getSupabase()
      .from("students")
      .select("id, profile:profiles!inner(email)")
      .in("profile.email", studentEmails)
      .returns<Array<{ id: string; profile: { email: string } | null }>>()
    if (error) {
      throw new Error(`Failed to look up students: ${error.message}`)
    }
    for (const row of data ?? []) {
      if (row.profile?.email) studentByEmail.set(row.profile.email, row.id)
    }
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowNumber = i + 1
    try {
      const studentId = studentByEmail.get(row.student_email)
      if (!studentId) {
        outcome.rows_failed += 1
        outcome.errors.push({
          row_number: rowNumber,
          message: `No student found with email ${row.student_email}.`,
        })
        continue
      }

      const { profile, created } = await findOrCreateProfile({
        email: row.parent_email,
        role: "parent",
      })
      if (created) outcome.profiles_created += 1

      const existing = await getParentLink(studentId, profile.id)
      if (existing) {
        outcome.links_existing += 1
        continue
      }

      const { error } = await getSupabase().from("parent_links").insert({
        student_id: studentId,
        parent_profile_id: profile.id,
        relationship: row.relationship,
        is_primary: row.is_primary,
        is_homestay: row.is_homestay,
        is_emergency_contact: row.is_emergency_contact,
        can_view_grades: row.can_view_grades,
        can_view_attendance: row.can_view_attendance,
        can_receive_communications: row.can_receive_communications,
      })

      if (error) {
        outcome.rows_failed += 1
        outcome.errors.push({
          row_number: rowNumber,
          message: error.message,
        })
        continue
      }

      outcome.links_created += 1
    } catch (error) {
      outcome.rows_failed += 1
      outcome.errors.push({
        row_number: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return outcome
}

// Checks whether an HBA-domain email matches a faculty bio's slug. Used by
// the sign-in bootstrap to decide whether a first-time HBA sign-in is
// faculty. Match heuristic: extract the local-part of the email, compare
// against the first-name segment of each bio's slug (e.g. "ellen-sullivan"
// matches ellen@highbluffacademy.com).
async function emailMatchesFacultyBio(email: string): Promise<boolean> {
  const localPart = email.split("@")[0]?.toLowerCase() ?? ""
  if (!localPart) return false
  try {
    const { data } = await getSupabase()
      .from("faculty_bios")
      .select("slug")
      .not("slug", "is", null)
      .returns<Array<{ slug: string }>>()
    return (data ?? []).some((row) => {
      const bioFirst = row.slug.split("-")[0]?.toLowerCase() ?? ""
      return bioFirst === localPart
    })
  } catch (error) {
    console.error("Failed to load faculty bios for bootstrap match", error)
    return false
  }
}

// ============================================================================
// Sign-in profile bootstrap
// ============================================================================

export type BootstrapProfileInput = {
  email: string
  entra_oid?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
}

// Called from the NextAuth signIn callback. Ensures a profiles row exists for
// the authenticated user and fills in identity fields the IdP just told us
// about. Does NOT overwrite existing roles — students get role=['student']
// assigned during enrollAcceptedApplication, and any roles assigned by past
// sign-ins (or by the office) are preserved.
//
// Role inference for *new* profiles:
//   - email in admin allowlist  -> 'admin'
//   - else (caller pre-screens) -> 'faculty'
//
// Returns the resulting profile row. Throws on DB error so the caller can
// decide whether to surface it; callers in auth.ts swallow + log so a DB
// hiccup doesn't lock people out.
export async function bootstrapProfileForSignIn(
  input: BootstrapProfileInput
): Promise<ProfileRecord> {
  const email = normalizeEmail(input.email)
  const existing = await getProfileByEmail(email)

  // Default role(s) for a *new* profile created at sign-in time. Pre-existing
  // profiles win — see the existing-profile branch below. Rules:
  //   - HBA email matching a faculty bio (by first-name prefix on the slug)
  //     → 'faculty'. The bios in lib/faculty.ts are admin-curated, so they
  //     accurately reflect who's actually faculty. Avoids the bug where any
  //     HBA email — student, alumni, future admit — would get auto-promoted
  //     to faculty just by signing in.
  //   - HBA email NOT in bios → empty roles. Admin must explicitly assign
  //     via /admin/profiles. Students get role='student' set by
  //     enrollAcceptedApplication BEFORE they ever sign in, so the
  //     bootstrap leaves them alone.
  //   - non-HBA email → 'parent'. auth.ts only lets these through when a
  //     parent profile already exists, so we're not creating one fresh
  //     here; this branch is a safety default if we ever do.
  let defaultRoles: ProfileRole[] = []
  if (isHbaEmail(email)) {
    const matchesBio = await emailMatchesFacultyBio(email)
    if (matchesBio) {
      defaultRoles = ["faculty"]
    }
    // else: empty roles, admin sets manually
  } else {
    defaultRoles = ["parent"]
  }

  if (existing) {
    const patch: Record<string, unknown> = {}

    if (!existing.entra_oid && input.entra_oid) patch.entra_oid = input.entra_oid
    if (!existing.display_name && input.display_name) patch.display_name = input.display_name
    if (!existing.first_name && input.first_name) patch.first_name = input.first_name
    if (!existing.last_name && input.last_name) patch.last_name = input.last_name

    // Backfill role only when the profile has none AND we figured out a
    // default. Pre-existing roles always win — students enrolled via the
    // workflow already have role='student', and admin-promoted faculty
    // already have role='faculty'. Don't clobber them.
    if (existing.roles.length === 0 && defaultRoles.length > 0) {
      patch.roles = defaultRoles
    }

    if (Object.keys(patch).length === 0) {
      return existing
    }

    const { data, error } = await getSupabase()
      .from("profiles")
      .update(patch)
      .eq("id", existing.id)
      .select(profileColumns)
      .single<ProfileRecord>()

    if (error) {
      throw new Error(`Failed to patch profile during sign-in bootstrap: ${error.message}`)
    }

    return data
  }

  const { data, error } = await getSupabase()
    .from("profiles")
    .insert({
      email,
      entra_oid: input.entra_oid ?? null,
      display_name: input.display_name ?? null,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      roles: defaultRoles,
    })
    .select(profileColumns)
    .single<ProfileRecord>()

  if (error) {
    throw new Error(`Failed to create profile during sign-in bootstrap: ${error.message}`)
  }

  return data
}

// Narrowed reader over the application's flat guardian fields. Returns null
// for empty strings so callers can short-circuit cleanly.
function readGuardianField(
  application: ApplicationRecord,
  prefix: GuardianSlot["prefix"],
  field: "name" | "relationship" | "mobile" | "work_phone" | "email"
): string | null {
  const key = `${prefix}_${field}` as keyof ApplicationRecord
  const value = application[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
