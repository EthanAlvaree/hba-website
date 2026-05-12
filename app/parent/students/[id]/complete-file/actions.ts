"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentLinkForStudent, getProfileByEmail } from "@/lib/sis"
import {
  deleteStudentDocument,
  getStudentDocumentById,
  markPostEnrollmentSubmittedByFamily,
  postEnrollmentDataUpsertSchema,
  studentDocumentKindSchema,
  uploadStudentDocument,
  upsertPostEnrollmentData,
} from "@/lib/post-enrollment"

// Verifies the signed-in user is a parent linked to this specific student.
// Used by every action on this page — parents can only touch their own kid's
// data. Returns the parent profile's email for "uploaded_by" attribution.
async function assertParentForStudent(studentId: string): Promise<string> {
  const session = await auth()
  if (!session?.user?.email) {
    redirect("/admin/sign-in")
  }
  const profile = await getProfileByEmail(session.user.email)
  if (!profile || !profile.roles.includes("parent")) {
    redirect("/admin/sign-in")
  }
  const link = await getParentLinkForStudent(profile.id, studentId)
  if (!link) {
    // The signed-in parent isn't linked to this student. 404 leaks less
    // than redirect (doesn't confirm or deny existence).
    redirect("/parent")
  }
  return profile.email
}

function revalidateCompleteFile(studentId: string) {
  revalidatePath(`/parent/students/${studentId}`)
  revalidatePath(`/parent/students/${studentId}/complete-file`)
  revalidatePath(`/admin/students/${studentId}`)
}

export async function savePostEnrollmentDataAction(formData: FormData) {
  const studentId = formData.get("student_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  await assertParentForStudent(studentId)

  const str = (key: string) => formData.get(key) ?? ""
  const bool = (key: string) => formData.get(key) === "on"

  const parsed = postEnrollmentDataUpsertSchema.safeParse({
    student_id: studentId,
    immunizations_complete: bool("immunizations_complete"),
    immunizations_notes: str("immunizations_notes"),
    immunizations_exemption_reason: str("immunizations_exemption_reason"),

    medical_blood_type: str("medical_blood_type"),
    medical_allergies: str("medical_allergies"),
    medical_conditions: str("medical_conditions"),
    medical_medications: str("medical_medications"),
    medical_emergency_contact_name: str("medical_emergency_contact_name"),
    medical_emergency_contact_phone: str("medical_emergency_contact_phone"),
    medical_emergency_contact_relationship: str("medical_emergency_contact_relationship"),
    medical_pediatrician_name: str("medical_pediatrician_name"),
    medical_pediatrician_phone: str("medical_pediatrician_phone"),
    medical_notes: str("medical_notes"),

    insurance_provider: str("insurance_provider"),
    insurance_policy_number: str("insurance_policy_number"),
    insurance_group_number: str("insurance_group_number"),
    insurance_subscriber_name: str("insurance_subscriber_name"),
    insurance_subscriber_dob: str("insurance_subscriber_dob"),
    insurance_phone: str("insurance_phone"),
    insurance_notes: str("insurance_notes"),

    financial_aid_requested: bool("financial_aid_requested"),
    financial_aid_notes: str("financial_aid_notes"),

    has_iep: bool("has_iep"),
    has_504: bool("has_504"),
    accommodations_needed: str("accommodations_needed"),
    accommodation_notes: str("accommodation_notes"),

    citizenship_country: str("citizenship_country"),
    visa_type: str("visa_type"),
    visa_expiration: str("visa_expiration"),
    i20_number: str("i20_number"),
    passport_number: str("passport_number"),
    passport_expiration: str("passport_expiration"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Save failed.")
  }

  await upsertPostEnrollmentData(parsed.data)
  revalidateCompleteFile(studentId)
  redirect(`/parent/students/${studentId}/complete-file?saved=1`)
}

export async function submitPostEnrollmentAction(formData: FormData) {
  const studentId = formData.get("student_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  await assertParentForStudent(studentId)

  await markPostEnrollmentSubmittedByFamily(studentId)
  revalidateCompleteFile(studentId)
  redirect(`/parent/students/${studentId}/complete-file?submitted=1`)
}

export async function uploadStudentDocumentAction(formData: FormData) {
  const studentId = formData.get("student_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  const email = await assertParentForStudent(studentId)

  const kindRaw = formData.get("kind")
  const kindParsed = studentDocumentKindSchema.safeParse(kindRaw)
  if (!kindParsed.success) {
    throw new Error("Pick a document type.")
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pick a file to upload.")
  }

  const maxBytes = 4 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max upload size is 4 MB. For larger PDFs, scan at lower DPI and re-upload, or email the office.`
    )
  }

  const description = formData.get("description")
  const buffer = Buffer.from(await file.arrayBuffer())

  await uploadStudentDocument({
    student_id: studentId,
    kind: kindParsed.data,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    description: typeof description === "string" ? description : null,
    uploaded_by: email,
    data: buffer,
  })

  revalidateCompleteFile(studentId)
  redirect(`/parent/students/${studentId}/complete-file?uploaded=1`)
}

export async function deleteStudentDocumentAction(formData: FormData) {
  const studentId = formData.get("student_id")
  const documentId = formData.get("document_id")
  if (typeof studentId !== "string") throw new Error("Missing student_id.")
  if (typeof documentId !== "string") throw new Error("Missing document_id.")
  await assertParentForStudent(studentId)

  // Sanity check: the document must actually belong to this student. Stops a
  // parent who has TWO kids from deleting a doc belonging to a kid they're
  // not linked to (assertParentForStudent is keyed on studentId).
  const doc = await getStudentDocumentById(documentId)
  if (!doc || doc.student_id !== studentId) {
    throw new Error("Document not found.")
  }

  await deleteStudentDocument(documentId)
  revalidateCompleteFile(studentId)
  redirect(`/parent/students/${studentId}/complete-file?deleted=1`)
}
