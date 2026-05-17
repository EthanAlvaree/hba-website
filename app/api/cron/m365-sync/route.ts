// Every-minute M365 sync tick. Scheduled in vercel.json (* * * * *).
//
// Vercel signs cron requests with `Authorization: Bearer $CRON_SECRET`
// (set in the Vercel project env). We reject anything else so this
// endpoint can't be hammered from the public internet.
//
// On each tick:
//   1. Look for an active sync run (status='queued' or 'running').
//      If the active one has a fresh heartbeat, leave it alone —
//      another worker (or the admin's first-batch call) is on it.
//   2. If we find a run to process, run one batch of BATCH_SIZE
//      users.
//   3. Once per day around 9 AM Pacific, if no run is active, kick
//      off a fresh nightly auto-sync — preserves the old nightly
//      behaviour without a second cron entry.
//
// Returns JSON for the cron logs.

import { NextResponse } from "next/server"
import {
  pickNextM365SyncRun,
  processM365SyncBatch,
  startM365Sync,
} from "@/lib/m365-sync"
import { getCronSecret } from "@/lib/env"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

export async function GET(request: Request) {
  const secret = getCronSecret()
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

  // 1) Active run, if any.
  const runId = await pickNextM365SyncRun()
  if (runId) {
    const result = await processM365SyncBatch(runId)
    if (!result) {
      return NextResponse.json({ ok: false, error: "Run vanished mid-tick." })
    }
    return NextResponse.json({
      ok: true,
      action: "batch_processed",
      runId,
      processed: result.processed,
      remaining: result.remaining,
      status: result.status,
    })
  }

  // 2) Nightly auto-sync at ~9 AM Pacific (UTC-8/UTC-7). We check the
  // hour in Pacific time directly so the trigger window doesn't drift
  // with DST. Five-minute window (9:00-9:05) catches any minute the
  // cron fires within that hour.
  const pacificNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  )
  const pacificHour = pacificNow.getHours()
  const pacificMinute = pacificNow.getMinutes()
  if (pacificHour === 9 && pacificMinute < 5) {
    const start = await startM365Sync({
      startedByEmail: `cron@${siteConfig.contact.emailDomain}`,
      forcePhotoResync: false,
    })
    if (!start.ok) {
      console.error(`M365 nightly sync failed to start: ${start.error}`)
      return NextResponse.json({
        ok: false,
        action: "nightly_start_failed",
        error: start.error,
      })
    }
    // Process the first batch right away so the nightly sync makes
    // progress before the next tick. Subsequent batches handled by
    // future ticks.
    const first = await processM365SyncBatch(start.runId)
    return NextResponse.json({
      ok: true,
      action: "nightly_started",
      runId: start.runId,
      totalUsers: start.totalUsers,
      firstBatch: first,
    })
  }

  return NextResponse.json({ ok: true, action: "idle" })
}
