"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import {
  applicationDataUpdateSchema,
  applicationEnrollmentTypeSchema,
  applicationStatusSchema,
  deleteApplication,
  getApplicationById,
  updateApplicationData,
  updateApplicationStatus,
} from "@/lib/applications"
import {
  isFamilyNotifiableStatus,
  sendApplicationStatusUpdateToFamily,
} from "@/lib/graph"
import {
  adminDeleteApplicationDocument,
  adminUploadApplicationDocument,
} from "@/lib/application-storage"
import { enrollAcceptedApplication, enrollApplicationSchema } from "@/lib/sis"

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))

const applicationUpdateFormSchema = z.object({
  id: z.uuid(),
  status: applicationStatusSchema,
  enrollment_type: z
    .union([applicationEnrollmentTypeSchema, z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
  internal_notes: optionalText,
  assigned_to: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
})

const applicationDeleteFormSchema = z.object({
  id: z.uuid(),
})

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  return session
}

function revalidateApplicationViews() {
  revalidatePath("/admin/applications")
  revalidatePath("/admin/applications/archived")
}

function redirectBackToQueue(redirectTo: FormDataEntryValue | null) {
  if (typeof redirectTo === "string" && redirectTo.startsWith("/admin/applications")) {
    redirect(redirectTo)
  }
}

export async function updateApplicationAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = applicationUpdateFormSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    enrollment_type: formData.get("enrollment_type") ?? "",
    internal_notes: formData.get("internal_notes") ?? "",
    assigned_to: formData.get("assigned_to") ?? "",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Application update failed.")
  }

  // Read the pre-update record so we can detect status transitions for the
  // family-notification email below.
  const before = await getApplicationById(parsed.data.id)

  const updated = await updateApplicationStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    enrollment_type: parsed.data.enrollment_type,
    internal_notes: parsed.data.internal_notes,
    assigned_to: parsed.data.assigned_to,
  })

  // Email the family on a real transition to a notifiable status. The admin
  // form has a "Don't notify family" checkbox to opt out of the email when
  // the change is internal (e.g., re-classifying without informing them yet).
  const suppressEmail = formData.get("suppress_family_email") === "on"
  const noteToFamily = formData.get("note_to_family")
  const noteToFamilyText =
    typeof noteToFamily === "string" && noteToFamily.trim().length > 0
      ? noteToFamily.trim()
      : null

  if (
    !suppressEmail &&
    before &&
    before.status !== updated.status &&
    isFamilyNotifiableStatus(updated.status)
  ) {
    try {
      await sendApplicationStatusUpdateToFamily({
        application: updated,
        newStatus: updated.status,
        noteToFamily: noteToFamilyText,
      })
    } catch (error) {
      // Log only — never fail the status change because the email server hiccuped.
      console.error("Failed to send family status email:", error)
    }
  }

  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

export async function deleteApplicationAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = applicationDeleteFormSchema.safeParse({
    id: formData.get("id"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Application delete failed.")
  }

  await deleteApplication(parsed.data.id)
  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

export async function enrollApplicationAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = enrollApplicationSchema.safeParse({
    application_id: formData.get("application_id"),
    student_hba_email: formData.get("student_hba_email"),
    registered_at_hba: formData.get("registered_at_hba") ?? "",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Enrollment failed.")
  }

  await enrollAcceptedApplication(parsed.data)

  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

// ============================================================================
// Admin edits to application data + transcript PDFs
// ============================================================================

// Builds an object with every editable field pulled out of formData. Empty
// strings come through as null per the schema's transform. Booleans look at
// 'on' which is the HTML default for checkboxes.
function readApplicationDataForm(formData: FormData) {
  const str = (key: string) => formData.get(key) ?? ""
  const bool = (key: string) => formData.get(key) === "on"

  return {
    id: formData.get("id"),
    enrollment_type: str("enrollment_type"),

    student_first_name: str("student_first_name"),
    student_middle_name: str("student_middle_name"),
    student_last_name: str("student_last_name"),
    student_suffix: str("student_suffix"),
    student_preferred_name: str("student_preferred_name"),
    student_dob: str("student_dob"),
    student_gender: str("student_gender"),
    student_pronouns: str("student_pronouns"),
    student_birthplace: str("student_birthplace"),
    student_primary_language: str("student_primary_language"),
    student_secondary_language: str("student_secondary_language"),
    student_english_proficiency: str("student_english_proficiency"),
    student_current_grade: str("student_current_grade"),
    student_desired_grade: str("student_desired_grade"),
    student_personal_email: str("student_personal_email"),
    student_phone: str("student_phone"),
    student_address_line1: str("student_address_line1"),
    student_address_line2: str("student_address_line2"),
    student_address_city: str("student_address_city"),
    student_address_region: str("student_address_region"),
    student_address_postal_code: str("student_address_postal_code"),
    student_address_country: str("student_address_country"),

    guardian1_name: str("guardian1_name"),
    guardian1_relationship: str("guardian1_relationship"),
    guardian1_mobile: str("guardian1_mobile"),
    guardian1_work_phone: str("guardian1_work_phone"),
    guardian1_email: str("guardian1_email"),
    guardian1_address_same_as_student: bool("guardian1_address_same_as_student"),
    guardian1_address_line1: str("guardian1_address_line1"),
    guardian1_address_line2: str("guardian1_address_line2"),
    guardian1_address_city: str("guardian1_address_city"),
    guardian1_address_region: str("guardian1_address_region"),
    guardian1_address_postal_code: str("guardian1_address_postal_code"),
    guardian1_address_country: str("guardian1_address_country"),

    guardian2_name: str("guardian2_name"),
    guardian2_relationship: str("guardian2_relationship"),
    guardian2_mobile: str("guardian2_mobile"),
    guardian2_work_phone: str("guardian2_work_phone"),
    guardian2_email: str("guardian2_email"),
    guardian2_address_same_as_student: bool("guardian2_address_same_as_student"),
    guardian2_address_line1: str("guardian2_address_line1"),
    guardian2_address_line2: str("guardian2_address_line2"),
    guardian2_address_city: str("guardian2_address_city"),
    guardian2_address_region: str("guardian2_address_region"),
    guardian2_address_postal_code: str("guardian2_address_postal_code"),
    guardian2_address_country: str("guardian2_address_country"),

    has_homestay: bool("has_homestay"),
    homestay_name: str("homestay_name"),
    homestay_relationship: str("homestay_relationship"),
    homestay_mobile: str("homestay_mobile"),
    homestay_work_phone: str("homestay_work_phone"),
    homestay_email: str("homestay_email"),
    homestay_address_line1: str("homestay_address_line1"),
    homestay_address_line2: str("homestay_address_line2"),
    homestay_address_city: str("homestay_address_city"),
    homestay_address_region: str("homestay_address_region"),
    homestay_address_postal_code: str("homestay_address_postal_code"),
    homestay_address_country: str("homestay_address_country"),

    how_did_you_hear: str("how_did_you_hear"),
    notes_from_family: str("notes_from_family"),
  }
}

export async function updateApplicationDataAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = applicationDataUpdateSchema.safeParse(readApplicationDataForm(formData))
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Application data update failed.")
  }

  await updateApplicationData(parsed.data)
  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

const documentDeleteSchema = z.object({
  document_id: z.uuid(),
})

export async function deleteApplicationDocumentAdminAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = documentDeleteSchema.safeParse({
    document_id: formData.get("document_id"),
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Delete failed.")
  }

  await adminDeleteApplicationDocument(parsed.data.document_id)
  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

const documentUploadSchema = z.object({
  application_id: z.uuid(),
  kind: z.literal("transcript"),
  prior_school_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
})

export async function uploadApplicationDocumentAdminAction(formData: FormData) {
  await assertAdmin()
  const redirectTo = formData.get("redirectTo")

  const parsed = documentUploadSchema.safeParse({
    application_id: formData.get("application_id"),
    kind: formData.get("kind") ?? "transcript",
    prior_school_name: formData.get("prior_school_name") ?? "",
  })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Upload failed.")
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pick a file to upload.")
  }

  // Vercel function body limit is ~4.5 MB. Block clearly oversized files
  // before they hit Supabase so admins get a useful error.
  const maxBytes = 4 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max upload size through this form is 4 MB. For larger files, ask the family to re-upload via their draft link.`
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  await adminUploadApplicationDocument({
    application_id: parsed.data.application_id,
    kind: parsed.data.kind,
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    prior_school_name: parsed.data.prior_school_name ?? null,
    data: buffer,
  })

  revalidateApplicationViews()
  redirectBackToQueue(redirectTo)
}

export async function signOutApplicationsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
