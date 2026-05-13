// Nightly parent activity digest.
//
// Runs from vercel.json crons. For each eligible parent_link (active parent,
// active student, can_receive_communications = true), gathers the linked
// student's activity from the past 24 hours (new published-assignment
// grades + non-"present" attendance exceptions) and emails the parent a
// compact summary. Parents linked to multiple students get one consolidated
// email per parent.
//
// Stateless: we don't track "last digest sent" anywhere. Vercel cron only
// fires once per schedule, so the 24-hour window is the implicit dedup.

import { NextResponse } from "next/server"
import { buildDigestEmailHtml, buildParentDigests } from "@/lib/parent-digest"
import { sendCustomEmail } from "@/lib/graph"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isoDateInPacific(date: Date): string {
  // YYYY-MM-DD in America/Los_Angeles. Mirrors lib/attendance.ts todayInPacific().
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
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

  const now = new Date()
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sinceDate = isoDateInPacific(since)
  const untilDate = isoDateInPacific(now)

  let digests
  try {
    digests = await buildParentDigests({
      since: since.toISOString(),
      until: now.toISOString(),
      sinceDate,
      untilDate,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest build failed"
    console.error("Parent digest build failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  const result = {
    ok: true,
    parents_with_activity: digests.length,
    emails_sent: 0,
    emails_failed: 0,
    errors: [] as Array<{ parent_email: string; message: string }>,
  }

  for (const digest of digests) {
    const { subject, html } = buildDigestEmailHtml(digest)
    try {
      await sendCustomEmail({
        subject,
        htmlBody: html,
        toRecipients: [digest.parent_email],
      })
      result.emails_sent += 1
    } catch (error) {
      result.emails_failed += 1
      const message = error instanceof Error ? error.message : "Send failed"
      result.errors.push({ parent_email: digest.parent_email, message })
      console.error(
        `Parent digest send failed for ${digest.parent_email}: ${message}`
      )
    }
  }

  console.log(
    `Parent digest cron ok: ${result.parents_with_activity} parents had activity, ${result.emails_sent} sent, ${result.emails_failed} failed.`
  )
  return NextResponse.json(result)
}
