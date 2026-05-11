"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import {
  contactSubmissionUpdateSchema,
  updateContactSubmission,
} from "@/lib/contact-submissions"

async function assertAdminSession() {
  const session = await auth()

  if (!isAllowedAdminEmail(session?.user?.email)) {
    redirect("/admin/sign-in")
  }

  return session
}

export async function updateContactSubmissionAction(formData: FormData) {
  await assertAdminSession()

  const parsed = contactSubmissionUpdateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Submission update failed.")
  }

  await updateContactSubmission(parsed.data)
  revalidatePath("/admin/contact-submissions")
}

export async function signOutAdminAction() {
  await assertAdminSession()
  await signOut({ redirectTo: "/admin/sign-in" })
}