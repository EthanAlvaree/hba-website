"use client"

// Kicks off a background M365 sync. We POST to /api/admin/m365-sync
// which starts the run + processes the first batch synchronously,
// then we redirect to the per-run status page where the progress bar
// and counters keep updating as the cron picks up the remaining
// batches.
//
// Two buttons share this component:
//   - default sync (no photo resync)
//   - "force photo resync" variant (re-pulls every photo even if the
//     profile already has one — used for the first round of bulk
//     photo sync, or when the M365 photos have changed)
//
// The buttons stay disabled until the redirect lands so the admin
// doesn't double-click and accidentally try to start a second run
// (which the API would refuse anyway — but the error message is
// clearer if it never happens).

import { useRouter } from "next/navigation"
import { useState } from "react"

function SyncSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SyncM365Buttons() {
  const router = useRouter()
  const [pending, setPending] = useState<"default" | "photos" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function start(forcePhotoResync: boolean) {
    setError(null)
    setPending(forcePhotoResync ? "photos" : "default")
    try {
      const res = await fetch("/api/admin/m365-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forcePhotoResync }),
      })
      const json = (await res.json()) as {
        ok: boolean
        runId?: string
        error?: string
      }
      if (!res.ok || !json.ok || !json.runId) {
        throw new Error(json.error ?? "Failed to start sync.")
      }
      router.push(`/admin/tools/m365-syncs/${json.runId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start sync.")
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() => start(false)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
      >
        {pending === "default" ? (
          <>
            <SyncSpinner />
            Starting sync…
          </>
        ) : (
          "Sync from M365"
        )}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => start(true)}
        title="Same sync, but re-pulls every M365 profile photo even if the SIS already has one. Useful for the first round of bulk photo sync."
        className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:cursor-wait disabled:opacity-80"
      >
        {pending === "photos" ? (
          <>
            <SyncSpinner />
            Starting photo resync…
          </>
        ) : (
          "Sync + force-resync all photos"
        )}
      </button>
      {error && (
        <p className="max-w-xs text-right text-xs text-rose-700">{error}</p>
      )}
    </div>
  )
}
