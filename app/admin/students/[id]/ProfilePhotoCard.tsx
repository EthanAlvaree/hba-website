"use client"

import { useActionState, useRef, useState } from "react"
import {
  clearProfilePhotoAction,
  uploadProfilePhotoAction,
  type ProfilePhotoResult,
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
        <p className="text-[11px] text-slate-500">
          JPEG, PNG, WebP, or HEIC (iPhone). Up to 10 MB — we&rsquo;ll
          resize and re-encode automatically. Visible on the
          student&rsquo;s roster cards and portal home.
        </p>
        {state?.ok === false && (
          <p className="text-xs text-rose-700">{state.error}</p>
        )}
        {state?.ok === true && (
          <p className="text-xs text-emerald-700">Photo updated.</p>
        )}
      </div>
    </div>
  )
}
