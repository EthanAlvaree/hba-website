"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  applicationEnrollmentTypeSchema,
  applicationStatusSchema,
  deleteApplication,
  updateApplicationStatus,
} from "@/lib/applications"
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

  await updateApplicationStatus({
    id: parsed.data.id,
    status: parsed.data.status,
    enrollment_type: parsed.data.enrollment_type,
    internal_notes: parsed.data.internal_notes,
    assigned_to: parsed.data.assigned_to,
  })

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

export async function signOutApplicationsAdminAction() {
  await assertAdmin()
  await signOut({ redirectTo: "/admin/sign-in" })
}
