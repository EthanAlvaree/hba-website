"use client"

import { useActionState, useState } from "react"
import {
  clearFacultyPortraitAction,
  uploadFacultyPortraitAction,
  type FacultyPortraitResult,
} from "@/app/faculty-portal/teaching/actions"

// Rectangular portrait shown on /faculty + /faculty/<slug>. Distinct
// from the round avatar (lib/profile-photos) which appears in the SIS
// portals. Faculty + admin both use this same component; the
// admin=true variant sends a hidden `admin=1` flag so the server
// action knows where to redirect.
//
// Falls back to the code-side image when no override is set. Once a
// portrait is uploaded the public faculty page renders it instead.

export default function FacultyPortraitCard({
  profileId,
  currentPortraitUrl,
  codeImagePath,
  asAdmin = false,
}: {
  profileId: string
  /** Current portrait URL (override → DB; falls back to null if none). */
  currentPortraitUrl: string | null
  /** Code-side default image path (e.g. /images/faculty/jane.webp).
   *  Used as the preview when no override is set. */
  codeImagePath: string | null
  asAdmin?: boolean
}) {
  const [state, action, pending] = useActionState<
    FacultyPortraitResult | null,
    FormData
  >(uploadFacultyPortraitAction, null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const displayedSrc = currentPortraitUrl ?? codeImagePath

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-brand-navy">
            Public portrait
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Rectangular photo on the public <code className="text-xs">/faculty</code>{" "}
            page. Different from the round avatar used in the portal —
            this one is bigger and is allowed to be portrait-shaped.
            JPEG, PNG, WebP, or HEIC; up to 10 MB.
          </p>
        </div>
        {currentPortraitUrl && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Customized
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
        <div className="relative h-56 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {displayedSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayedSrc}
              alt="Current portrait"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
              No portrait
            </div>
          )}
        </div>

        <div className="space-y-3">
          <form action={action} className="space-y-2">
            <input type="hidden" name="profile_id" value={profileId} />
            {asAdmin && <input type="hidden" name="admin" value="1" />}
            <input
              type="file"
              name="portrait"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(e) => setPreviewName(e.target.files?.[0]?.name ?? null)}
              className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
            />
            <button
              type="submit"
              disabled={pending || !previewName}
              className="inline-flex items-center justify-center rounded-full bg-brand-orange px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Uploading…" : "Upload portrait"}
            </button>
          </form>

          {currentPortraitUrl && (
            <form action={clearFacultyPortraitAction}>
              <input type="hidden" name="profile_id" value={profileId} />
              {asAdmin && <input type="hidden" name="admin" value="1" />}
              <button
                type="submit"
                className="text-xs font-semibold text-rose-700 underline-offset-4 hover:underline"
              >
                Revert to the code-side default portrait
              </button>
            </form>
          )}

          {state?.ok && (
            <p className="text-xs text-emerald-700">
              Portrait updated. Refresh /faculty to see it live.
            </p>
          )}
          {state?.ok === false && (
            <p className="text-xs text-rose-700">{state.error}</p>
          )}

          <p className="text-[11px] text-slate-500">
            Resized automatically. Aspect ratio is preserved (no square
            crop) so portrait-shaped photos stay portrait-shaped.
          </p>
        </div>
      </div>
    </section>
  )
}
