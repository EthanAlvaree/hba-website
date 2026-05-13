// Weekly database snapshot cron.
//
// Authoritative: pulls every high-value table to a timestamped JSON
// file in the "db-backups" Supabase Storage bucket. See
// lib/db-backup.ts for the full description.
//
// Same Vercel-cron auth pattern as the other crons: requires
// CRON_SECRET env var; rejects anything without a matching bearer
// token so the endpoint can't be hit from the public internet.

import { NextResponse } from "next/server"
import { runDatabaseBackup } from "@/lib/db-backup"
import { logAdminAuditEvent } from "@/lib/audit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300 // 5 min cap; backup completes in seconds.

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

  try {
    const result = await runDatabaseBackup()

    // Audit log: backups are infrequent and high-signal. Worth a row.
    await logAdminAuditEvent({
      action: "db_backup.cron",
      target_kind: "db_backup",
      target_id: result.path,
      details: {
        size_bytes: result.size_bytes,
        table_counts: result.table_counts,
        deleted_old: result.deleted,
      },
    })

    console.log(
      `DB backup ok: ${result.path} (${Math.round(result.size_bytes / 1024)} KB, ${result.deleted} old pruned)`
    )
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("DB backup failed:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
