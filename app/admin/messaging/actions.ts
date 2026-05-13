"use server"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { resolveCohortEmails, type Audience } from "@/lib/mass-email"
import { sendCustomEmail } from "@/lib/graph"
import { logAdminAuditEvent } from "@/lib/audit"
import { getProfileByEmail } from "@/lib/sis"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"

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

export type MassEmailPreviewResult =
  | {
      ok: true
      recipients: number
      sample_recipients: string[]
      html: string
      subject: string
      sender_email: string
      sender_label: string
    }
  | { ok: false; error: string }

const audienceValues: Audience[] = [
  "parents",
  "students",
  "faculty",
  "active_families",
  "all_school",
]

// Configurable shared mailbox we send mass email AS. Replies go here (since
// it's the From address) — info@ is delegated to Kristin + Molly so they see
// responses in their normal Outlook flow with zero extra setup.
//
// Override via env var if a school wants a different mailbox (e.g. PCI fork).
function getMassEmailSender(): { address: string; label: string } {
  const address =
    process.env.MASS_EMAIL_SENDER?.trim() || siteConfig.contact.infoEmail
  const label = process.env.MASS_EMAIL_SENDER_LABEL?.trim() || siteConfig.name
  return { address, label }
}

export async function getMassEmailSenderDescriptor() {
  // Exposed to the page so the UI can label which mailbox the send goes
  // from. Async because "use server" files only export server actions.
  return getMassEmailSender()
}

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

// Tail of every mass-email body: school-branded plain footer + a polite
// reply-routing line. We deliberately do NOT impersonate a specific staff
// member's signature here — replies route to info@ which is shared by the
// admissions/office team, so a generic school footer is the honest framing.
function buildFooterHtml(senderLabel: string): string {
  const c = siteConfig.contact
  const addr = siteConfig.address
  const replyHint = `Replies to this message go to ${c.infoEmail}, which is the office shared mailbox monitored by our admissions team during business hours.`
  return [
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px;" />`,
    `<p style="margin:0 0 4px;color:#001f3f;font-weight:700;">${escapeHtml(senderLabel)}</p>`,
    `<p style="margin:0;color:#666;font-size:12px;line-height:1.5;">`,
    `${escapeHtml(addr.streetLine1)} &middot; ${escapeHtml(addr.locality)}, ${escapeHtml(addr.regionCode)} ${escapeHtml(addr.postalCode)}<br />`,
    `${escapeHtml(c.phone)} &middot; <a href="mailto:${encodeURIComponent(c.infoEmail)}">${escapeHtml(c.infoEmail)}</a> &middot; <a href="https://${siteConfig.domain}">${escapeHtml(siteConfig.domain)}</a>`,
    `</p>`,
    `<p style="margin:12px 0 0;color:#888;font-size:11px;">${escapeHtml(replyHint)}</p>`,
  ].join("")
}

// Build the full rendered email body the way the send action will. Shared
// so the preview shows the exact bytes the recipient will see.
function buildMassEmailHtml(userBody: string, senderLabel: string): string {
  const userBodyHtml = `<p style="margin:0 0 12px;line-height:1.5;color:#1f2937;">${escapeHtml(userBody).replace(/\n/g, "<br />")}</p>`
  return `${userBodyHtml}${buildFooterHtml(senderLabel)}`
}

// Renders the email exactly as it will be sent, alongside the cohort
// recipient count and a small sample of addresses — last chance for the
// admin to catch typos before firing.
export async function previewMassEmailAction(
  _prev: MassEmailPreviewResult | null,
  formData: FormData
): Promise<MassEmailPreviewResult> {
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
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Resolve failed.",
    }
  }
  if (emails.length === 0) {
    return { ok: false, error: "Cohort filter produced zero recipients." }
  }

  const sender = getMassEmailSender()
  return {
    ok: true,
    recipients: emails.length,
    sample_recipients: emails.slice(0, 5),
    html: buildMassEmailHtml(body, sender.label),
    subject,
    sender_email: sender.address,
    sender_label: sender.label,
  }
}

export async function sendMassEmailAction(
  _prev: MassEmailResult | null,
  formData: FormData
): Promise<MassEmailResult> {
  const session = await assertAdmin()
  const adminEmail = session.user?.email?.toLowerCase() ?? ""
  const adminProfile = adminEmail ? await getProfileByEmail(adminEmail) : null

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

  const sender = getMassEmailSender()
  const htmlBody = buildMassEmailHtml(body, sender.label)

  // Send one Graph call per recipient so we don't leak the recipient list
  // to other parents. The Graph mailer is fast enough for hundreds of sends.
  // If a school ever grows to thousands of recipients, batch into chunks of
  // ~100 with Promise.all + a small concurrency limiter.
  let sent = 0
  let failed = 0
  const failedAddrs: string[] = []
  for (const email of emails) {
    try {
      await sendCustomEmail({
        subject,
        htmlBody,
        toRecipients: [email],
        fromMailbox: sender.address,
      })
      sent += 1
    } catch (error) {
      failed += 1
      failedAddrs.push(email)
      console.error(`mass-email send to ${email} failed`, error)
    }
  }

  // Record the send for audit + future "history" viewer. Use a write-once
  // pattern — never edit these rows from the UI.
  try {
    await getServiceSupabase().from("sent_mass_emails").insert({
      sender_email: sender.address,
      sender_label: sender.label,
      cohort_audience: audience,
      cohort_grade: grade,
      cohort_section_id: sectionId,
      subject,
      body_html: htmlBody,
      recipient_count: emails.length,
      recipients: emails,
      sent_count: sent,
      failed_count: failed,
      failed_recipients: failedAddrs,
      sent_by_email: adminEmail,
      sent_by_profile_id: adminProfile?.id ?? null,
    })
  } catch (error) {
    console.error("Failed to log sent mass email:", error)
    // Non-fatal — admin gets a result; just no history row.
  }

  await logAdminAuditEvent({
    action: "mass_email.send",
    target_kind: "mass_email",
    details: {
      audience,
      grade,
      section_id: sectionId,
      subject,
      sender_email: sender.address,
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
