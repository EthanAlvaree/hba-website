"use server"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { logAdminAuditEvent } from "@/lib/audit"
import { runDatabaseBackup } from "@/lib/db-backup"

async function assertAdmin() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")
}

export type BackupRunResult =
  | {
      ok: true
      path: string
      size_bytes: number
      table_counts: Record<string, number>
      deleted: number
    }
  | { ok: false; error: string }

// Runs the same helper the weekly Vercel cron runs. Audit-logged like
// the cron run, but tagged "manual" so we can tell them apart.
export async function runBackupNowAction(
  _prev: BackupRunResult | null
): Promise<BackupRunResult> {
  await assertAdmin()

  try {
    const result = await runDatabaseBackup()
    await logAdminAuditEvent({
      action: "db_backup.manual",
      target_kind: "db_backup",
      target_id: result.path,
      details: {
        size_bytes: result.size_bytes,
        table_counts: result.table_counts,
        deleted_old: result.deleted,
      },
    })
    return {
      ok: true,
      path: result.path,
      size_bytes: result.size_bytes,
      table_counts: result.table_counts,
      deleted: result.deleted,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed."
    await logAdminAuditEvent({
      action: "db_backup.manual",
      target_kind: "db_backup",
      details: { ok: false, error: message },
    })
    return { ok: false, error: message }
  }
}

