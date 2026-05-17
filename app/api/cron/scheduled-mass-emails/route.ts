// Scheduled mass-email dispatch cron.
//
// Runs every ~5 minutes. Finds scheduled_mass_emails rows where
// scheduled_for <= now() AND status = 'pending', claims them by
// flipping to status='sending' (atomic so two concurrent cron runs
// can't double-send), dispatches, then writes the final status.
//
// The actual send goes through lib/mass-email.ts dispatchMassEmail
// which is the same code path the immediate-send action uses — so
// scheduled sends behave identically to manual sends and write the
// same sent_mass_emails log row.

import { NextResponse } from "next/server"
import { dispatchMassEmail, type Audience } from "@/lib/mass-email"
import { logAdminAuditEvent } from "@/lib/audit"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"
import { getCronSecret } from "@/lib/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

type Row = {
  id: string
  /** Stored as a comma-separated list of Audience values (with an
   *  "extras" sentinel when individual recipients were added). The
   *  schedule UI joins audiences into this single text column; the
   *  cron splits them back out below. */
  cohort_audience: string
  cohort_grade: string | null
  cohort_section_id: string | null
  subject: string
  body: string
  sender_email: string
  sender_label: string | null
  created_by_email: string
  created_by_profile_id: string | null
  scheduled_for: string
}

const KNOWN_AUDIENCES: Audience[] = [
  "parents",
  "students_hba",
  "students_personal",
  "faculty",
]

function parseAudiences(stored: string): Audience[] {
  if (!stored) return []
  return stored
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Audience => KNOWN_AUDIENCES.includes(s as Audience))
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

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

function buildMassEmailHtml(userBody: string, senderLabel: string): string {
  const userBodyHtml = `<p style="margin:0 0 12px;line-height:1.5;color:#1f2937;">${escapeHtml(userBody).replace(/\n/g, "<br />")}</p>`
  return `${userBodyHtml}${buildFooterHtml(senderLabel)}`
}

export async function GET(request: Request) {
  const secret = getCronSecret()
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 }
    )
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Claim due rows. The .update().eq("status", "pending") gives us
  // optimistic concurrency: if two cron runs hit the same row at the
  // same time, only one will see status='pending' and claim it.
  const now = new Date().toISOString()
  const { data: claimed, error: claimErr } = await supabase
    .from("scheduled_mass_emails")
    .update({ status: "sending" })
    .lte("scheduled_for", now)
    .eq("status", "pending")
    .select(
      "id, cohort_audience, cohort_grade, cohort_section_id, subject, body, sender_email, sender_label, created_by_email, created_by_profile_id, scheduled_for"
    )
    .returns<Row[]>()

  if (claimErr) {
    console.error("scheduled-mass-emails claim failed:", claimErr.message)
    return NextResponse.json({ ok: false, error: claimErr.message }, { status: 500 })
  }

  let dispatched = 0
  let failed = 0
  const results: Array<{ id: string; status: "sent" | "failed"; reason?: string }> = []

  for (const row of claimed ?? []) {
    const senderLabel = row.sender_label ?? siteConfig.name
    const htmlBody = buildMassEmailHtml(row.body, senderLabel)
    const result = await dispatchMassEmail({
      audiences: parseAudiences(row.cohort_audience),
      // The scheduled flow doesn't persist the per-row extra_emails
      // list yet — admins composing a delayed send shouldn't expect
      // individual recipients to survive across the schedule wait.
      // Audiences re-resolve at dispatch, so the cohort stays fresh.
      extra_emails: [],
      grade: row.cohort_grade,
      section_id: row.cohort_section_id,
      subject: row.subject,
      html_body: htmlBody,
      sender_email: row.sender_email,
      sender_label: senderLabel,
      by_email: row.created_by_email,
      by_profile_id: row.created_by_profile_id,
    })

    if (result.ok) {
      await supabase
        .from("scheduled_mass_emails")
        .update({
          status: "sent",
          sent_mass_email_id: result.sent_mass_email_id,
        })
        .eq("id", row.id)
      dispatched += 1
      results.push({ id: row.id, status: "sent" })
      await logAdminAuditEvent({
        action: "mass_email.dispatch_scheduled",
        target_kind: "scheduled_mass_email",
        target_id: row.id,
        details: {
          subject: row.subject,
          scheduled_for: row.scheduled_for,
          sent: result.sent,
          failed: result.failed,
          recipients_total: result.recipients_total,
        },
      })
    } else {
      await supabase
        .from("scheduled_mass_emails")
        .update({
          status: "failed",
          failure_reason: result.error ?? "Unknown failure.",
        })
        .eq("id", row.id)
      failed += 1
      results.push({ id: row.id, status: "failed", reason: result.error })
      console.error(`scheduled-mass-email ${row.id} failed:`, result.error)
    }
  }

  console.log(
    `scheduled-mass-emails: ${claimed?.length ?? 0} claimed; ${dispatched} sent, ${failed} failed.`
  )
  return NextResponse.json({ ok: true, claimed: claimed?.length ?? 0, dispatched, failed, results })
}
