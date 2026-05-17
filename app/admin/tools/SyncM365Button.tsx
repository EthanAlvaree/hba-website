"use client"

// Client wrapper around the M365 sync forms so the button can show a
// pending spinner while the server action runs. The action itself can
// take 15-60s for a tenant with photo resync turned on — without a
// visual indicator it looks like the page hung.
//
// Note: while the action is pending, React holds the navigation in a
// transition — clicking Profiles in the sidebar will defer until the
// sync resolves. We surface that as a "stay on this page" hint rather
// than try to fight Next.js's behaviour, because the sync IS a
// mutation and the admin probably wants to see the result anyway.

import { useFormStatus } from "react-dom"
import type { ReactNode } from "react"

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

export function SyncM365PrimaryButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <SyncSpinner />
          Syncing from M365…
        </>
      ) : (
        "Sync from M365"
      )}
    </button>
  )
}

export function SyncM365WithPhotosButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      title="Same sync, but re-pulls every M365 profile photo even if the SIS already has one. Useful for the first round of bulk photo sync."
      className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? (
        <>
          <SyncSpinner />
          Syncing + photo resync…
        </>
      ) : (
        "Sync + force-resync all photos"
      )}
    </button>
  )
}

// Sits below the two buttons and explains the page lock during a sync.
// Hidden when neither form is pending — useFormStatus only knows about
// the *closest* parent form, so we render this once per form via a
// wrapper that taps the pending state explicitly.
export function SyncRunningHint({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  if (!pending) return null
  return (
    <p className="mt-2 text-xs text-amber-700">
      {children}
    </p>
  )
}
