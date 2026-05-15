// lib/post-enrollment.ts
//
// Phase 2 post-enrollment data: the "complete your file" workflow that
// families fill out after admission is accepted. Covers immunizations,
// medical history, insurance, financial aid request, accommodations/IEP,
// and citizenship/visa for international students. Plus the document
// uploads that go with each section.
//
// Auth model:
//   - Parents (with role 'parent' and a parent_links row to the student) can
//     read + write their own student's post-enrollment data and documents.
//   - Admins can read/write everything.
//   - This module exposes the helpers; the route + action layer enforces
//     the auth boundary.

import { z } from "zod"
import { randomBytes } from "node:crypto"
import { getServiceSupabase as getSupabase } from "@/lib/supabase-server"

// ============================================================================
// Post-enrollment data
// ============================================================================

export type PostEnrollmentDataRecord = {
  student_id: string
  created_at: string
  updated_at: string

  immunizations_complete: boolean
  immunizations_notes: string | null
  immunizations_exemption_reason: string | null

  medical_blood_type: string | null
  medical_allergies: string | null
  medical_conditions: string | null
  medical_medications: string | null
  medical_emergency_contact_name: string | null
  medical_emergency_contact_phone: string | null
  medical_emergency_contact_relationship: string | null
  medical_pediatrician_name: string | null
  medical_pediatrician_phone: string | null
  medical_notes: string | null

  insurance_provider: string | null
  insurance_policy_number: string | null
  insurance_group_number: string | null
  insurance_subscriber_name: string | null
  insurance_subscriber_dob: string | null
  insurance_phone: string | null
  insurance_notes: string | null

  financial_aid_requested: boolean
  financial_aid_notes: string | null

  has_iep: boolean
  has_504: boolean
  accommodations_needed: string | null
  accommodation_notes: string | null

  citizenship_country: string | null
  visa_type: string | null
  visa_expiration: string | null
  i20_number: string | null
  passport_number: string | null
  passport_expiration: string | null

  family_completed_at: string | null
  admin_verified_at: string | null
  admin_verified_by: string | null
}

const postEnrollmentColumns =
  "student_id, created_at, updated_at, " +
  "immunizations_complete, immunizations_notes, immunizations_exemption_reason, " +
  "medical_blood_type, medical_allergies, medical_conditions, medical_medications, " +
  "medical_emergency_contact_name, medical_emergency_contact_phone, " +
  "medical_emergency_contact_relationship, medical_pediatrician_name, " +
  "medical_pediatrician_phone, medical_notes, " +
  "insurance_provider, insurance_policy_number, insurance_group_number, " +
  "insurance_subscriber_name, insurance_subscriber_dob, insurance_phone, " +
  "insurance_notes, financial_aid_requested, financial_aid_notes, " +
  "has_iep, has_504, accommodations_needed, accommodation_notes, " +
  "citizenship_country, visa_type, visa_expiration, i20_number, " +
  "passport_number, passport_expiration, " +
  "family_completed_at, admin_verified_at, admin_verified_by"

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

const optionalDate = () =>
  z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

export const postEnrollmentDataUpsertSchema = z.object({
  student_id: z.uuid(),

  immunizations_complete: z.coerce.boolean().optional().default(false),
  immunizations_notes: optionalString(2000),
  immunizations_exemption_reason: optionalString(500),

  medical_blood_type: optionalString(20),
  medical_allergies: optionalString(2000),
  medical_conditions: optionalString(2000),
  medical_medications: optionalString(2000),
  medical_emergency_contact_name: optionalString(200),
  medical_emergency_contact_phone: optionalString(40),
  medical_emergency_contact_relationship: optionalString(80),
  medical_pediatrician_name: optionalString(200),
  medical_pediatrician_phone: optionalString(40),
  medical_notes: optionalString(4000),

  insurance_provider: optionalString(200),
  insurance_policy_number: optionalString(100),
  insurance_group_number: optionalString(100),
  insurance_subscriber_name: optionalString(200),
  insurance_subscriber_dob: optionalDate(),
  insurance_phone: optionalString(40),
  insurance_notes: optionalString(2000),

  financial_aid_requested: z.coerce.boolean().optional().default(false),
  financial_aid_notes: optionalString(2000),

  has_iep: z.coerce.boolean().optional().default(false),
  has_504: z.coerce.boolean().optional().default(false),
  accommodations_needed: optionalString(2000),
  accommodation_notes: optionalString(2000),

  citizenship_country: optionalString(120),
  visa_type: optionalString(40),
  visa_expiration: optionalDate(),
  i20_number: optionalString(80),
  passport_number: optionalString(80),
  passport_expiration: optionalDate(),
})
export type PostEnrollmentDataUpsertInput = z.infer<typeof postEnrollmentDataUpsertSchema>

export async function getPostEnrollmentData(
  studentId: string
): Promise<PostEnrollmentDataRecord | null> {
  const { data, error } = await getSupabase()
    .from("student_post_enrollment_data")
    .select(postEnrollmentColumns)
    .eq("student_id", studentId)
    .maybeSingle<PostEnrollmentDataRecord>()

  if (error) {
    throw new Error(`Failed to load post-enrollment data: ${error.message}`)
  }
  return data
}

export async function upsertPostEnrollmentData(
  input: PostEnrollmentDataUpsertInput
): Promise<PostEnrollmentDataRecord> {
  const { data, error } = await getSupabase()
    .from("student_post_enrollment_data")
    .upsert(input, { onConflict: "student_id" })
    .select(postEnrollmentColumns)
    .single<PostEnrollmentDataRecord>()

  if (error) {
    throw new Error(`Failed to upsert post-enrollment data: ${error.message}`)
  }
  return data
}

// Flips family_completed_at to now() so the office sees the file is ready
// for review. Resets admin_verified_at — re-submitting requires re-verifying.
export async function markPostEnrollmentSubmittedByFamily(
  studentId: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("student_post_enrollment_data")
    .update({
      family_completed_at: new Date().toISOString(),
      admin_verified_at: null,
      admin_verified_by: null,
    })
    .eq("student_id", studentId)

  if (error) {
    throw new Error(`Failed to mark file submitted: ${error.message}`)
  }
}

// ============================================================================
// Student documents
// ============================================================================

export const studentDocumentKindSchema = z.enum([
  "immunization",
  "medical_history",
  "medical_insurance",
  "financial_aid",
  "accommodation",
  "iep",
  "passport",
  "visa",
  "i20",
  "transcript",
  "other",
])
export type StudentDocumentKind = z.infer<typeof studentDocumentKindSchema>

export type StudentDocumentRecord = {
  id: string
  created_at: string
  student_id: string
  kind: StudentDocumentKind
  description: string | null
  filename: string
  storage_path: string
  uploaded_at: string
  uploaded_by: string | null
}

const studentDocumentColumns =
  "id, created_at, student_id, kind, description, filename, storage_path, uploaded_at, uploaded_by"

export async function listStudentDocuments(
  studentId: string
): Promise<StudentDocumentRecord[]> {
  const { data, error } = await getSupabase()
    .from("student_documents")
    .select(studentDocumentColumns)
    .eq("student_id", studentId)
    .order("uploaded_at", { ascending: false })
    .returns<StudentDocumentRecord[]>()

  if (error) {
    throw new Error(`Failed to list student documents: ${error.message}`)
  }
  return data
}

export async function getStudentDocumentById(
  documentId: string
): Promise<StudentDocumentRecord | null> {
  const { data, error } = await getSupabase()
    .from("student_documents")
    .select(studentDocumentColumns)
    .eq("id", documentId)
    .maybeSingle<StudentDocumentRecord>()

  if (error) {
    throw new Error(`Failed to load student document: ${error.message}`)
  }
  return data
}

const bucketName = "application-documents"

const allowedContentTypePrefixes = [
  "application/pdf",
  "image/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

const filenameUnsafe = /[^A-Za-z0-9._\- ()]/g
function sanitizeFilename(raw: string): string {
  const trimmed = raw.trim().replace(filenameUnsafe, "_").slice(0, 200)
  return trimmed.length > 0 ? trimmed : "file"
}

function isAllowedContentType(contentType: string): boolean {
  return allowedContentTypePrefixes.some((prefix) => contentType.startsWith(prefix))
}

export type UploadStudentDocumentInput = {
  student_id: string
  kind: StudentDocumentKind
  filename: string
  content_type: string
  description?: string | null
  uploaded_by?: string | null
  data: ArrayBuffer | Uint8Array | Buffer
}

export async function uploadStudentDocument(
  input: UploadStudentDocumentInput
): Promise<StudentDocumentRecord> {
  if (!isAllowedContentType(input.content_type)) {
    throw new Error("File type not allowed. Upload a PDF, image, or document.")
  }

  const sanitized = sanitizeFilename(input.filename)
  const id = randomBytes(8).toString("hex")
  const storage_path = `students/${input.student_id}/${input.kind}/${id}-${sanitized}`

  const supabase = getSupabase()
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storage_path, input.data, {
      contentType: input.content_type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const { data, error: insertError } = await supabase
    .from("student_documents")
    .insert({
      student_id: input.student_id,
      kind: input.kind,
      description: input.description?.trim() || null,
      filename: input.filename.slice(0, 200),
      storage_path,
      uploaded_by: input.uploaded_by ?? null,
    })
    .select(studentDocumentColumns)
    .single<StudentDocumentRecord>()

  if (insertError) {
    await supabase.storage.from(bucketName).remove([storage_path]).catch(() => {})
    throw new Error(`Failed to record student document: ${insertError.message}`)
  }
  return data
}

export async function deleteStudentDocument(documentId: string): Promise<void> {
  const existing = await getStudentDocumentById(documentId)
  if (!existing) throw new Error("Document not found.")

  const supabase = getSupabase()
  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .remove([existing.storage_path])

  if (storageError) {
    console.error("Failed to remove storage object:", storageError)
  }

  const { error: deleteError } = await supabase
    .from("student_documents")
    .delete()
    .eq("id", documentId)

  if (deleteError) {
    throw new Error(`Failed to delete student document: ${deleteError.message}`)
  }
}

// Signed URL for downloading a student doc. Used by the admin and parent
// download endpoints (they both run after authorizing the caller against
// the student's parent_links).
export async function createStudentDocumentDownloadUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(bucketName)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data) {
    throw new Error(`Failed to create download URL: ${error?.message ?? "unknown"}`)
  }
  return data.signedUrl
}

// Friendly labels for the kind enum, used by both portal and admin UIs.
export const studentDocumentKindLabels: Record<StudentDocumentKind, string> = {
  immunization: "Immunization record",
  medical_history: "Medical history",
  medical_insurance: "Medical insurance card",
  financial_aid: "Financial aid form",
  accommodation: "Accommodation request",
  iep: "IEP / 504 documentation",
  passport: "Passport",
  visa: "Visa",
  i20: "I-20",
  transcript: "Transcript",
  other: "Other",
}
