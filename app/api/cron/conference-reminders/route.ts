// Daily conference reminder cron.
//
// At 08:00 UTC (~midnight Pacific) we find every parent whose booked
// conference slot is between 24 and 48 hours from now, and email them a
// reminder. Idempotent if the cron runs more than once a day: we just
// re-send. Most operators will run it once per day per the vercel.json
// schedule, so duplicate sends are unlikely.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendCustomEmail } from "@/lib/graph"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
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

  const supabase = createClient(
    process.env.HBA_SUPABASE_URL!,
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Window: [now+24h, now+48h). We send a reminder once when the slot is
  // ~24 hours away.
  const now = new Date()
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const { data: slots, error } = await supabase
    .from("conference_slots")
    .select(
      `id, start_at, end_at, parent_notes,
       booked_by_parent_email, booked_for_student_id,
       teacher:profiles!conference_slots_teacher_profile_id_fkey(first_name, last_name, display_name, email),
       student:students(legal_first_name, legal_last_name, preferred_name),
       event:conference_events(name, slot_minutes)`
    )
    .gte("start_at", windowStart.toISOString())
    .lt("start_at", windowEnd.toISOString())
    .not("booked_by_parent_email", "is", null)
    .is("cancelled_at", null)
    .returns<
      Array<{
        id: string
        start_at: string
        end_at: string
        parent_notes: string | null
        booked_by_parent_email: string
        booked_for_student_id: string | null
        teacher: {
          first_name: string | null
          last_name: string | null
          display_name: string | null
          email: string
        } | null
        student: {
          legal_first_name: string
          legal_last_name: string
          preferred_name: string | null
        } | null
        event: {
          name: string
          slot_minutes: number
        } | null
      }>
    >()

  if (error) {
    console.error("Conference reminder query failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const errors: Array<{ slot_id: string; message: string }> = []

  for (const slot of slots ?? []) {
    if (!slot.teacher) continue
    const teacherName =
      `${slot.teacher.first_name ?? ""} ${slot.teacher.last_name ?? ""}`.trim() ||
      slot.teacher.display_name ||
      slot.teacher.email
    const studentName = slot.student
      ? slot.student.preferred_name?.trim() ||
        `${slot.student.legal_first_name} ${slot.student.legal_last_name}`
      : "your student"
    const eventName = slot.event?.name ?? "the conference"
    const minutes = slot.event?.slot_minutes ?? 15

    const when = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format(new Date(slot.start_at))

    const subject = `Reminder: your ${teacherName} conference is tomorrow`
    const htmlBody = [
      `<p>Hi,</p>`,
      `<p>This is a reminder that you have a parent-teacher conference scheduled for <strong>${esc(studentName)}</strong>:</p>`,
      `<ul>`,
      `<li><strong>Teacher:</strong> ${esc(teacherName)}</li>`,
      `<li><strong>When:</strong> ${esc(when)} (${minutes} minutes)</li>`,
      `<li><strong>Event:</strong> ${esc(eventName)}</li>`,
      `</ul>`,
      slot.parent_notes
        ? `<p><strong>Topic / notes you left when booking:</strong><br />${esc(slot.parent_notes).replace(/\n/g, "<br />")}</p>`
        : "",
      `<p>Need to cancel or reschedule? Sign in to the family portal at <a href="https://highbluffacademy.com/parent/conferences">highbluffacademy.com/parent/conferences</a>.</p>`,
      `<p>— High Bluff Academy</p>`,
    ].join("")

    try {
      await sendCustomEmail({
        subject,
        htmlBody,
        toRecipients: [slot.booked_by_parent_email],
      })
      sent += 1
    } catch (error) {
      failed += 1
      errors.push({
        slot_id: slot.id,
        message: error instanceof Error ? error.message : "Send failed",
      })
      console.error(`Conference reminder send failed for slot ${slot.id}:`, error)
    }
  }

  console.log(
    `Conference reminder cron: ${slots?.length ?? 0} upcoming slots; ${sent} sent, ${failed} failed.`
  )
  return NextResponse.json({ ok: true, considered: slots?.length ?? 0, sent, failed, errors })
}
