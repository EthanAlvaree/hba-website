"use client"

import { useActionState, useRef, useState } from "react"
import {
  clearProfilePhotoAction,
  resyncM365PhotoAction,
  uploadProfilePhotoAction,
  type ProfilePhotoResult,
  type ResyncM365PhotoResult,
} from "../actions"

export default function ProfilePhotoCard({
  profileId,
  studentId,
  photoUrl,
  initials,
}: {
  profileId: string
  studentId: string
  photoUrl: string | null
  initials: string
}) {
  const [state, action, pending] = useActionState<
    ProfilePhotoResult | null,
    FormData
  >(uploadProfilePhotoAction, null)
  const [resyncState, resyncAction, resyncPending] = useActionState<
    ResyncM365PhotoResult | null,
    FormData
  >(resyncM365PhotoAction, null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-500">
            {initials}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <form action={action} className="space-y-2">
          <input type="hidden" name="profile_id" value={profileId} />
          <input type="hidden" name="student_id" value={studentId} />
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => setPreviewName(e.target.files?.[0]?.name ?? null)}
            className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
          />
          <button
            type="submit"
            disabled={pending || !previewName}
            className="inline-flex items-center justify-center rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload photo"}
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          {photoUrl && (
            <form action={clearProfilePhotoAction}>
              <input type="hidden" name="profile_id" value={profileId} />
              <input type="hidden" name="student_id" value={studentId} />
              <button
                type="submit"
                className="text-xs font-semibold text-rose-700 underline-offset-4 hover:underline"
              >
                Remove current photo
              </button>
            </form>
          )}
          <form action={resyncAction}>
            <input type="hidden" name="profile_id" value={profileId} />
            <input type="hidden" name="student_id" value={studentId} />
            <button
              type="submit"
              disabled={resyncPending}
              className="text-xs font-semibold text-brand-navy underline-offset-4 hover:underline disabled:opacity-50"
            >
              {resyncPending ? "Pulling…" : "Resync from M365"}
            </button>
          </form>
        </div>
        {resyncState?.ok === true && resyncState.outcome === "synced" && (
          <p className="text-[11px] text-emerald-700">
            Pulled fresh photo from M365.
          </p>
        )}
        {resyncState?.ok === true && resyncState.outcome === "no_m365_photo" && (
          <p className="text-[11px] text-amber-700">
            This user has no profile photo set in M365. Upload one
            manually or have them set one in Outlook/Teams first.
          </p>
        )}
        {resyncState?.ok === false && (
          <p className="text-[11px] text-rose-700">{resyncState.error}</p>
        )}
        <p className="text-[11px] text-slate-500">
          JPEG, PNG, WebP, or HEIC (iPhone). Up to 10 MB — we&rsquo;ll
          resize and re-encode automatically. Visible on the
          student&rsquo;s roster cards and portal home.
        </p>
        {state?.ok === false && (
          <p className="text-xs text-rose-700">{state.error}</p>
        )}
        {state?.ok === true && (
          <div className="space-y-1">
            <p className="text-xs text-emerald-700">Photo updated.</p>
            {state.m365_sync === "synced" && (
              <p className="text-[11px] text-emerald-700">
                Also synced to Microsoft 365 — Outlook, Teams, and email
                signatures will reflect this photo automatically.
              </p>
            )}
            {state.m365_sync === "skipped_permission" && (
              <p className="text-[11px] text-amber-700">
                Microsoft 365 sync needs the Azure app to be granted
                User.ReadWrite.All. Photo is live in the SIS; ask IT to
                enable two-way sync if you want it to appear in Outlook too.
              </p>
            )}
            {state.m365_sync === "skipped_not_found" && (
              <p className="text-[11px] text-slate-500">
                This profile isn&rsquo;t in M365, so the two-way sync was
                skipped. Photo is live in the SIS only.
              </p>
            )}
            {state.m365_sync === "error" && (
              <p className="text-[11px] text-amber-700">
                Saved in the SIS, but the M365 sync hit an error: {state.m365_message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
