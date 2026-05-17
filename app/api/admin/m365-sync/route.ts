// Admin-triggered M365 sync: kicks off a new run, fires the first
// batch synchronously so the admin sees immediate progress, and
// returns the run id. The cron at /api/cron/m365-sync picks up the
// remaining batches every minute until done.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { processM365SyncBatch, startM365Sync } from "@/lib/m365-sync"
import { logAdminAuditEvent, ADMIN_AUDIT_ACTIONS } from "@/lib/audit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const adminEmail = session.user?.email
  if (!adminEmail) {
    return NextResponse.json({ ok: false, error: "Missing admin email" }, { status: 400 })
  }

  // Body: { forcePhotoResync: boolean } — optional.
  let body: { forcePhotoResync?: boolean } = {}
  try {
    body = (await request.json().catch(() => ({}))) as { forcePhotoResync?: boolean }
  } catch {
    // Ignore — defaults are fine.
  }

  const start = await startM365Sync({
    startedByEmail: adminEmail,
    forcePhotoResync: body.forcePhotoResync === true,
  })
  if (!start.ok) {
    return NextResponse.json({ ok: false, error: start.error }, { status: 400 })
  }

  // Fire the first batch synchronously so the admin sees movement on
  // the status page without waiting up to a minute for the cron's
  // first tick. Catch and log — if this batch fails for some reason
  // the cron will pick up the run on the next tick and try again.
  try {
    await processM365SyncBatch(start.runId)
  } catch (error) {
    console.error(`m365 sync ${start.runId}: first-batch failed:`, error)
  }

  await logAdminAuditEvent({
    action: ADMIN_AUDIT_ACTIONS.m365_sync_manual,
    target_kind: "m365_sync_run",
    target_id: start.runId,
    details: {
      total_users: start.totalUsers,
      filtered_count: start.filteredCount,
      force_photo_resync: body.forcePhotoResync === true,
    },
  })

  return NextResponse.json({
    ok: true,
    runId: start.runId,
    totalUsers: start.totalUsers,
  })
}
