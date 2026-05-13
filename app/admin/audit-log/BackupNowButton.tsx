"use client"

import { useActionState } from "react"
import { runBackupNowAction, type BackupRunResult } from "./actions"

export default function BackupNowButton() {
  const [state, action, pending] = useActionState<BackupRunResult | null, FormData>(
    runBackupNowAction,
    null
  )

  return (
    <div className="space-y-2">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:opacity-50"
          title="Run a full database snapshot to the db-backups bucket. Same operation the weekly cron runs."
        >
          {pending ? "Running snapshot…" : "Snapshot now"}
        </button>
      </form>

      {state?.ok === true && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <p className="font-semibold">
            Snapshot saved: <span className="font-mono">{state.path}</span>
          </p>
          <p className="mt-1">
            {Math.round(state.size_bytes / 1024)} KB ·{" "}
            {Object.values(state.table_counts).reduce((a, b) => a + b, 0)} rows
            across {Object.keys(state.table_counts).length} tables
            {state.deleted > 0 && <> · pruned {state.deleted} older snapshot(s)</>}
          </p>
        </div>
      )}
      {state?.ok === false && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {state.error}
        </p>
      )}
    </div>
  )
}
