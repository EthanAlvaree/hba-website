"use client"

import { useActionState, useState } from "react"
import {
  bulkUploadPhotosAction,
  type BulkPhotoResult,
} from "./actions"

const statusLabels: Record<string, { label: string; tone: "good" | "neutral" | "warn" | "bad" }> = {
  synced: { label: "Synced (incl. M365)", tone: "good" },
  matched_no_m365_push: { label: "Saved", tone: "good" },
  no_match: { label: "No profile match", tone: "warn" },
  skipped_unsupported: { label: "Skipped (unsupported)", tone: "neutral" },
  skipped_too_large: { label: "Skipped (too large)", tone: "neutral" },
  error: { label: "Error", tone: "bad" },
}

const toneClass = {
  good: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  bad: "border-rose-200 bg-rose-50 text-rose-800",
} as const

export default function BulkPhotoUploadClient() {
  const [state, action, pending] = useActionState<
    BulkPhotoResult | { ok: false; error: string } | null,
    FormData
  >(bulkUploadPhotosAction, null)
  const [previewName, setPreviewName] = useState<string | null>(null)

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-brand-navy">Upload</h2>
      <form action={action} className="mt-4 space-y-4">
        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Zip of photo files</span>
          <input
            type="file"
            name="zip"
            accept=".zip,application/zip"
            required
            onChange={(e) => setPreviewName(e.target.files?.[0]?.name ?? null)}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-navy file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="push_to_m365"
            defaultChecked
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>
            Also push to Microsoft 365 (requires the Azure app to have
            User.ReadWrite.All — see commit notes)
          </span>
        </label>
        <button
          type="submit"
          disabled={pending || !previewName}
          className="inline-flex items-center justify-center rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload zip"}
        </button>
      </form>

      {state && "ok" in state && !state.ok && (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.error}
        </p>
      )}

      {state && state.ok && (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">
              Processed {state.totals.files} file
              {state.totals.files === 1 ? "" : "s"}.
            </p>
            <p className="mt-1 text-xs">
              <strong>{state.totals.synced}</strong> synced to M365 ·{" "}
              <strong>{state.totals.matched_no_m365_push}</strong> saved
              (no M365) · <strong>{state.totals.no_match}</strong> with no
              matching profile · <strong>{state.totals.skipped}</strong>{" "}
              skipped · <strong>{state.totals.errored}</strong> errored
            </p>
          </div>

          <ul className="space-y-1.5 text-sm">
            {state.results.map((r, i) => {
              const meta = statusLabels[r.status] ?? {
                label: r.status,
                tone: "neutral" as const,
              }
              return (
                <li
                  key={`${r.filename}-${i}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2 ${toneClass[meta.tone]}`}
                >
                  <div>
                    <span className="font-mono text-xs">{r.filename}</span>
                    {r.email && (
                      <>
                        {" "}
                        <span className="text-xs opacity-80">→ {r.email}</span>
                      </>
                    )}
                    {r.message && (
                      <p className="mt-0.5 text-[11px] opacity-80">{r.message}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-white/60 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em]">
                    {meta.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
