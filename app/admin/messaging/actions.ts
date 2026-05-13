"use server"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { resolveCohortEmails, type Audience } from "@/lib/mass-email"
import { sendCustomEmail } from "@/lib/graph"
import { logAdminAuditEvent } from "@/lib/audit"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
  return session
}

export type MassEmailResult = {
  ok: boolean
  recipients?: number
  error?: string
}

const audienceValues: Audience[] = ["parents", "students", "faculty", "active_families"]

export async function previewCohortAction(
  _prev: MassEmailResult | null,
  formData: FormData
): Promise<MassEmailResult> {
  await assertAdmin()
  const audience = (formData.get("audience") ?? "parents") as Audience
  if (!audienceValues.includes(audience)) {
    return { ok: false, error: "Unknown audience." }
  }
  const grade = ((formData.get("grade") ?? "") as string).trim() || null
  const sectionId = ((formData.get("section_id") ?? "") as string).trim() || null

  try {
    const emails = await resolveCohortEmails({
      audience,
      grade,
      section_id: sectionId,
    })
    return { ok: true, recipients: emails.length }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Preview failed." }
  }
}

export async function sendMassEmailAction(
  _prev: MassEmailResult | null,
  formData: FormData
): Promise<MassEmailResult> {
  await assertAdmin()
  const audience = (formData.get("audience") ?? "parents") as Audience
  if (!audienceValues.includes(audience)) {
    return { ok: false, error: "Unknown audience." }
  }
  const grade = ((formData.get("grade") ?? "") as string).trim() || null
  const sectionId = ((formData.get("section_id") ?? "") as string).trim() || null
  const subject = String(formData.get("subject") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()
  if (subject.length === 0) return { ok: false, error: "Subject is required." }
  if (body.length === 0) return { ok: false, error: "Body is required." }

  let emails: string[]
  try {
    emails = await resolveCohortEmails({ audience, grade, section_id: sectionId })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Resolve failed." }
  }
  if (emails.length === 0) {
    return { ok: false, error: "Cohort filter produced zero recipients." }
  }

  // Graph sendMail accepts many recipients per message. Send to all at once
  // with BCC semantics emulated by individual sends — safer privacy-wise so
  // we don't leak the parent list to other parents. With ~hundreds of
  // recipients this is fine; if the school ever has thousands, batch into
  // groups of ~100.
  const htmlBody = `<p>${escapeHtml(body).replace(/\n/g, "<br />")}</p>`
  let sent = 0
  let failed = 0
  for (const email of emails) {
    try {
      await sendCustomEmail({ subject, htmlBody, toRecipients: [email] })
      sent += 1
    } catch (error) {
      failed += 1
      console.error(`mass-email send to ${email} failed`, error)
    }
  }

  await logAdminAuditEvent({
    action: "mass_email.send",
    target_kind: "mass_email",
    details: {
      audience,
      grade,
      section_id: sectionId,
      subject,
      recipients_total: emails.length,
      sent,
      failed,
    },
  })

  return { ok: true, recipients: sent }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
