"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  contactSubmissionDeleteSchema,
  contactSubmissionUpdateSchema,
  deleteArchivedContactSubmission,
  updateContactSubmission,
} from "@/lib/contact-submissions"

async function assertAdminSession() {
  const session = await auth()

  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  return session
}

function revalidateContactSubmissionViews() {
  revalidatePath("/admin/contact-submissions")
  revalidatePath("/admin/contact-submissions/archived")
}

function redirectBackToQueue(redirectTo: FormDataEntryValue | null) {
  if (
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/admin/contact-submissions")
  ) {
    redirect(redirectTo)
  }
}

export async function updateContactSubmissionAction(formData: FormData) {
  await assertAdminSession()

  const redirectTo = formData.get("redirectTo")

  const parsed = contactSubmissionUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Submission update failed.")
  }

  await updateContactSubmission(parsed.data)
  revalidateContactSubmissionViews()
  redirectBackToQueue(redirectTo)
}

export async function deleteArchivedContactSubmissionAction(formData: FormData) {
  await assertAdminSession()

  const redirectTo = formData.get("redirectTo")

  const parsed = contactSubmissionDeleteSchema.safeParse({
    id: formData.get("id"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Submission delete failed.")
  }

  await deleteArchivedContactSubmission(parsed.data.id)
  revalidateContactSubmissionViews()
  redirectBackToQueue(redirectTo)
}

export async function signOutAdminAction() {
  await assertAdminSession()
  await signOut({ redirectTo: "/admin/sign-in" })
}