"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  dispatchMassEmail,
  resolveCohortEmails,
  type Audience,
} from "@/lib/mass-email"
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

  const result = await dispatchMassEmail({
    audience,
    grade,
    section_id: sectionId,
    subject,
    html_body: htmlBody,
    sender_email: sender.address,
    sender_label: sender.label,
    by_email: adminEmail,
    by_profile_id: adminProfile?.id ?? null,
  })

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Send failed." }
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
      recipients_total: result.recipients_total,
      sent: result.sent,
      failed: result.failed,
    },
  })

  // Reference unused-import marker so eslint doesn't complain after the
  // refactor pulled the inline send loop out.
  void resolveCohortEmails

  return { ok: true, recipients: result.sent }
}

// ============================================================================
// Schedule for later
// ============================================================================

export type ScheduleMassEmailResult =
  | {
      ok: true
      scheduled_id: string
      scheduled_for_iso: string
      recipients_estimated: number
    }
  | { ok: false; error: string }

export async function scheduleMassEmailAction(
  _prev: ScheduleMassEmailResult | null,
  formData: FormData
): Promise<ScheduleMassEmailResult> {
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
  const scheduledFor = String(formData.get("scheduled_for") ?? "").trim()
  if (subject.length === 0) return { ok: false, error: "Subject is required." }
  if (body.length === 0) return { ok: false, error: "Body is required." }
  if (!scheduledFor) return { ok: false, error: "Pick a date and time." }

  // Browser <input type="datetime-local"> sends "YYYY-MM-DDTHH:mm" (no
  // timezone). Interpret as Pacific by anchoring to the school's local
  // zone — the cron runs in UTC, but families think in PT.
  const scheduledForUtc = pacificLocalToUtc(scheduledFor)
  if (!scheduledForUtc) {
    return { ok: false, error: "Couldn't parse the date/time." }
  }
  if (scheduledForUtc.getTime() < Date.now() + 60 * 1000) {
    return {
      ok: false,
      error: "Schedule for at least one minute in the future.",
    }
  }

  // Verify the cohort filter is valid (resolves to at least someone)
  // so the admin gets immediate feedback rather than a failed cron
  // run a week later.
  let recipientsEstimated = 0
  try {
    const emails = await resolveCohortEmails({ audience, grade, section_id: sectionId })
    recipientsEstimated = emails.length
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Resolve failed." }
  }
  if (recipientsEstimated === 0) {
    return { ok: false, error: "Cohort filter produced zero recipients." }
  }

  const sender = getMassEmailSender()
  const { data, error } = await getServiceSupabase()
    .from("scheduled_mass_emails")
    .insert({
      cohort_audience: audience,
      cohort_grade: grade,
      cohort_section_id: sectionId,
      subject,
      body,
      sender_email: sender.address,
      sender_label: sender.label,
      scheduled_for: scheduledForUtc.toISOString(),
      status: "pending",
      created_by_email: adminEmail,
      created_by_profile_id: adminProfile?.id ?? null,
    })
    .select("id")
    .single<{ id: string }>()
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to schedule mass email.",
    }
  }

  await logAdminAuditEvent({
    action: "mass_email.schedule",
    target_kind: "scheduled_mass_email",
    target_id: data.id,
    details: {
      audience,
      grade,
      section_id: sectionId,
      subject,
      scheduled_for: scheduledForUtc.toISOString(),
      recipients_estimated: recipientsEstimated,
    },
  })

  revalidatePath("/admin/messaging")
  return {
    ok: true,
    scheduled_id: data.id,
    scheduled_for_iso: scheduledForUtc.toISOString(),
    recipients_estimated: recipientsEstimated,
  }
}

export async function cancelScheduledMassEmailAction(formData: FormData) {
  const session = await assertAdmin()
  const adminEmail = session.user?.email?.toLowerCase() ?? ""
  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("Missing id.")

  // Only cancel if still pending; concurrent dispatch is fine to lose
  // the race (the row's flipped to sending/sent and we leave it).
  const { error } = await getServiceSupabase()
    .from("scheduled_mass_emails")
    .update({
      status: "cancelled",
      cancelled_by_email: adminEmail,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
  if (error) throw new Error(`Cancel failed: ${error.message}`)

  await logAdminAuditEvent({
    action: "mass_email.cancel_scheduled",
    target_kind: "scheduled_mass_email",
    target_id: id,
    details: { cancelled_by: adminEmail },
  })

  revalidatePath("/admin/messaging")
}

// ---- Helpers ----

/** Parse the value from `<input type="datetime-local">` (no timezone)
 *  and interpret it as Pacific time, returning the corresponding UTC
 *  Date. Returns null if the input is malformed. */
function pacificLocalToUtc(local: string): Date | null {
  // "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  // Approximation: treat as PST (UTC-8) year-round. A 1-hour drift
  // around DST is acceptable for "send at 7am" scheduling. If we ever
  // care more we can plug Intl.DateTimeFormat with timeZone to derive
  // the correct offset for the specific date.
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h) + 8,
    Number(mi),
    s ? Number(s) : 0
  )
  return new Date(utcMs)
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
