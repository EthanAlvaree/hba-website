"use client"

// Polls /api/admin/m365-sync/[id] every 2s while the run is active
// (status='queued' or 'running'). Stops polling once it flips to
// 'done', 'failed', or 'cancelled'. Renders a progress bar +
// per-counter readout so the admin can see batches landing in real
// time as the cron picks them up.

import { useEffect, useRef, useState } from "react"
import type { M365SyncRunRow } from "@/lib/m365-sync"

const POLL_INTERVAL_MS = 2000

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value))
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return "<1s"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
}

function statusColor(status: M365SyncRunRow["status"]): string {
  switch (status) {
    case "queued":
      return "border-amber-200 bg-amber-50 text-amber-800"
    case "running":
      return "border-sky-200 bg-sky-50 text-sky-800"
    case "done":
      return "border-emerald-200 bg-emerald-50 text-emerald-800"
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-800"
    case "cancelled":
      return "border-slate-300 bg-slate-100 text-slate-700"
  }
}

export function SyncProgressClient({ initialRun }: { initialRun: M365SyncRunRow }) {
  const [run, setRun] = useState<M365SyncRunRow>(initialRun)
  const stopped = useRef(false)

  useEffect(() => {
    if (run.status === "done" || run.status === "failed" || run.status === "cancelled") {
      stopped.current = true
      return
    }
    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled || stopped.current) return
      try {
        const res = await fetch(`/api/admin/m365-sync/${run.id}`, {
          cache: "no-store",
        })
        const json = (await res.json()) as { ok: boolean; run?: M365SyncRunRow }
        if (cancelled || !json.ok || !json.run) return
        setRun(json.run)
        if (
          json.run.status === "done" ||
          json.run.status === "failed" ||
          json.run.status === "cancelled"
        ) {
          stopped.current = true
          clearInterval(interval)
        }
      } catch {
        // Transient network hiccup — let the next tick try again.
      }
    }, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [run.id, run.status])

  const total = run.total_users ?? 0
  const processed = run.processed_users
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0
  const isActive = run.status === "queued" || run.status === "running"
  const finishedRaw = run.finished_at ? new Date(run.finished_at).getTime() : null
  const startedRaw = run.started_at ? new Date(run.started_at).getTime() : null
  const duration =
    finishedRaw && startedRaw ? formatDurationMs(finishedRaw - startedRaw) : null

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusColor(run.status)}`}
          >
            {run.status}
          </span>
          <p className="text-xs text-slate-500">
            {processed} / {total} users
            {isActive && " · polling every 2s"}
          </p>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${
              run.status === "failed"
                ? "bg-rose-500"
                : run.status === "done"
                  ? "bg-emerald-500"
                  : "bg-brand-navy"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs font-semibold text-slate-600">{pct}%</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Counter label="Created" value={run.created_count} />
          <Counter label="Updated" value={run.updated_count} />
          <Counter label="Unchanged" value={run.skipped_count} />
          <Counter label="Filtered" value={run.filtered_count} />
          <Counter label="Photos pulled" value={run.photos_pulled} />
          <Counter label="Photos failed" value={run.photos_failed} muted />
        </div>

        {run.failed_count > 0 && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <strong>{run.failed_count}</strong> user(s) failed to sync. Each
            failure is captured on the item row with the exact error — visible
            via direct DB query for now; we can surface those in the UI if
            this becomes a common case.
          </div>
        )}

        {run.last_error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">Sync error</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-xs">
              {run.last_error}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
          Run metadata
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Started</dt>
            <dd>{formatTimestamp(run.started_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Finished</dt>
            <dd>{formatTimestamp(run.finished_at)}</dd>
          </div>
          {duration && (
            <div>
              <dt className="text-xs text-slate-500">Duration</dt>
              <dd>{duration}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-500">Last heartbeat</dt>
            <dd>{formatTimestamp(run.heartbeat_at)}</dd>
          </div>
        </dl>
      </section>

      {isActive && (
        <p className="text-xs text-slate-500">
          You can navigate away — the cron picks up batches every minute until
          done. Come back to this page anytime to see progress.
        </p>
      )}
    </div>
  )
}

function Counter({
  label,
  value,
  muted = false,
}: {
  label: string
  value: number
  muted?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-extrabold ${
          muted && value === 0 ? "text-slate-400" : "text-brand-navy"
        }`}
      >
        {value}
      </p>
    </div>
  )
}
