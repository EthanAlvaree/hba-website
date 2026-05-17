"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, signOut } from "@/auth"
import {
  contactSubmissionDeleteSchema,
  contactSubmissionUpdateSchema,
  deleteArchivedContactSubmission,
  getContactSubmissionById,
  updateContactSubmission,
} from "@/lib/contact-submissions"
import { sendContactSubmissionReply } from "@/lib/graph"
import { ADMIN_AUDIT_ACTIONS, logAdminAuditEvent } from "@/lib/audit"

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

const replyContactSubmissionSchema = z.object({
  id: z.uuid(),
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  body: z.string().trim().min(1, "Reply body is required.").max(8000),
  /** When true, also flip status from 'new' → 'follow_up' since the
   *  admin has now actually responded. */
  advance_status: z.coerce.boolean().optional().default(true),
})

// Send a reply directly from the contact-submission detail card.
// Email goes AS info@<domain> (shared office mailbox) so replies route
// back to the team, but the admin's personal signature is appended so
// the recipient knows who wrote.
export async function replyContactSubmissionAction(formData: FormData) {
  const session = await assertAdminSession()
  const redirectTo = formData.get("redirectTo")

  const parsed = replyContactSubmissionSchema.safeParse({
    id: formData.get("id"),
    subject: formData.get("subject") ?? "",
    body: formData.get("body") ?? "",
    advance_status: formData.get("advance_status") === "on",
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Reply failed.")
  }

  const submission = await getContactSubmissionById(parsed.data.id)
  if (!submission) {
    throw new Error("Contact submission not found.")
  }

  try {
    await sendContactSubmissionReply({
      toEmail: submission.email,
      toName: submission.name,
      body: parsed.data.body,
      subject: parsed.data.subject,
      originalMessage: submission.message,
      actorEmail: session.user?.email ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed."
    throw new Error(`Couldn't send the reply: ${message}`)
  }

  if (parsed.data.advance_status && submission.status === "new") {
    // Promote to follow_up so the queue reflects "admin has reached out."
    // The existing updateContactSubmission helper handles the row write
    // and preserves any notes already on the record.
    await updateContactSubmission({
      id: parsed.data.id,
      status: "follow_up",
      notes: submission.notes ?? "",
    })
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.contact_submission_reply_sent,
    target_kind: "contact_submission",
    target_id: parsed.data.id,
    details: {
      to: submission.email,
      subject: parsed.data.subject,
      advanced_status: parsed.data.advance_status && submission.status === "new",
    },
  })

  revalidateContactSubmissionViews()
  redirectBackToQueue(redirectTo)
}

export async function signOutAdminAction() {
  await assertAdminSession()
  await signOut({ redirectTo: "/admin/sign-in" })
}