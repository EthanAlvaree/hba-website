// Daily conference reminder cron.
//
// At 08:00 UTC (~midnight Pacific) we find every parent whose booked
// conference slot is between 24 and 48 hours from now, and email them a
// reminder. Now also attaches an .ics calendar invite + CC's the
// co-parent (any other parent_link with can_receive_communications=true).
//
// Idempotent if the cron runs more than once a day: we just re-send.
// Most operators will run it once per day per the vercel.json schedule,
// so duplicate sends are unlikely.

import { NextResponse } from "next/server"
import { sendCustomEmail } from "@/lib/graph"
import {
  buildConferenceReminderEmail,
  findCoParentEmails,
  type ConferenceSlotForEmail,
} from "@/lib/conference-emails"
import { getServiceSupabase } from "@/lib/supabase-server"
import { getCronSecret } from "@/lib/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
    .returns<ConferenceSlotForEmail[]>()

  if (error) {
    console.error("Conference reminder query failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const errors: Array<{ slot_id: string; message: string }> = []

  for (const slot of slots ?? []) {
    if (!slot.teacher || !slot.booked_by_parent_email) continue

    const { subject, htmlBody, icsFilename, icsContent } =
      buildConferenceReminderEmail(slot)
    const cc = slot.booked_for_student_id
      ? await findCoParentEmails(
          slot.booked_for_student_id,
          slot.booked_by_parent_email
        )
      : []

    try {
      await sendCustomEmail({
        subject,
        htmlBody,
        toRecipients: [slot.booked_by_parent_email],
        ccRecipients: cc,
        attachments: [
          {
            name: icsFilename,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
            content: icsContent,
          },
        ],
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
