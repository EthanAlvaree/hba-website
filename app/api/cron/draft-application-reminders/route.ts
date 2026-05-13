// Inactivity reminder for draft applications.
//
// Daily at ~9am Pacific, look for applications where:
//   - status = 'draft'
//   - draft_email + draft_token are set (we have somewhere to send,
//     and the magic link is still alive)
//   - draft_expires_at > now (not expired yet)
//   - draft_reminder_sent_at is null (we haven't already nudged)
//   - updated_at < now - 7 days (a full week of inactivity)
//
// Send one friendly "your application is waiting" email per draft and
// stamp draft_reminder_sent_at so we never nudge the same draft twice.
// If the parent saves again afterwards, draft_expires_at gets renewed
// but the reminder flag stays — that's the right behavior. The
// reminder did its job; bringing them back is the whole point.

import { NextResponse } from "next/server"
import { sendApplicationDraftReminder } from "@/lib/graph"
import { siteConfig } from "@/lib/site"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const INACTIVITY_DAYS = 7

function buildResumeUrl(token: string) {
  return `${siteConfig.url}/apply?draft=${encodeURIComponent(token)}`
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured. Refusing to run." },
      { status: 503 }
    )
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const now = new Date()
  const inactiveBefore = new Date(
    now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const nowIso = now.toISOString()

  const { data: drafts, error } = await supabase
    .from("applications")
    .select(
      "id, draft_email, draft_token, draft_expires_at, guardian1_name, student_first_name, updated_at"
    )
    .eq("status", "draft")
    .is("draft_reminder_sent_at", null)
    .not("draft_email", "is", null)
    .not("draft_token", "is", null)
    .gt("draft_expires_at", nowIso)
    .lt("updated_at", inactiveBefore)
    .returns<
      Array<{
        id: string
        draft_email: string
        draft_token: string
        draft_expires_at: string
        guardian1_name: string | null
        student_first_name: string | null
        updated_at: string
      }>
    >()

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Query failed: ${error.message}` },
      { status: 500 }
    )
  }

  const result = {
    ok: true,
    candidates: drafts?.length ?? 0,
    emails_sent: 0,
    emails_failed: 0,
    errors: [] as Array<{ application_id: string; message: string }>,
  }

  for (const draft of drafts ?? []) {
    const daysUntilExpiry = Math.max(
      1,
      Math.ceil(
        (new Date(draft.draft_expires_at).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    )
    const parentName = draft.guardian1_name?.trim() || "there"
    const resumeUrl = buildResumeUrl(draft.draft_token)

    try {
      await sendApplicationDraftReminder({
        toEmail: draft.draft_email,
        parentName,
        resumeUrl,
        daysUntilExpiry,
      })
      // Stamp after successful send so a failure on row N doesn't
      // mark it "reminded" — the next cron run will retry.
      const { error: stampError } = await supabase
        .from("applications")
        .update({ draft_reminder_sent_at: nowIso })
        .eq("id", draft.id)
      if (stampError) {
        // The email did go out, so don't count this as failed — log it
        // and move on. Worst case: the parent gets a second nudge
        // tomorrow, which is annoying but not catastrophic.
        console.error(
          `Reminder sent for application ${draft.id} but stamp failed:`,
          stampError.message
        )
      }
      result.emails_sent += 1
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed"
      result.emails_failed += 1
      result.errors.push({ application_id: draft.id, message })
    }
  }

  return NextResponse.json(result)
}
