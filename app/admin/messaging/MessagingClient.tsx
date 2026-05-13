"use client"

import { useActionState, useState } from "react"
import {
  previewCohortAction,
  sendMassEmailAction,
  type MassEmailResult,
} from "./actions"

type SectionOption = { id: string; label: string }

export function MessagingClient({
  sectionOptions,
  senderAddress,
  senderLabel,
}: {
  sectionOptions: SectionOption[]
  senderAddress: string
  senderLabel: string
}) {
  // Single source of truth for cohort filters lives in component state. Both
  // the preview and send actions read these via hidden inputs in their
  // respective forms.
  const [audience, setAudience] = useState<string>("parents")
  const [grade, setGrade] = useState<string>("")
  const [sectionId, setSectionId] = useState<string>("")

  const [previewState, previewAction, previewPending] = useActionState<
    MassEmailResult | null,
    FormData
  >(previewCohortAction, null)
  const [sendState, sendActionFn, sendPending] = useActionState<
    MassEmailResult | null,
    FormData
  >(sendMassEmailAction, null)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">1. Pick a cohort</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Audience">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="parents">Parents</option>
              <option value="students">Students</option>
              <option value="active_families">Active families (parents + students)</option>
              <option value="faculty">Faculty + admins</option>
              <option value="all_school">All school (parents + students + faculty + admins)</option>
            </select>
          </Field>
          <Field label="Grade (optional)">
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All grades</option>
              {["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(
                (g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                )
              )}
            </select>
          </Field>
          <Field label="Section (optional)">
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All sections</option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <form action={previewAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="audience" value={audience} />
          <input type="hidden" name="grade" value={grade} />
          <input type="hidden" name="section_id" value={sectionId} />
          <button
            type="submit"
            disabled={previewPending}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:opacity-50"
          >
            {previewPending ? "Counting…" : "Preview recipient count"}
          </button>
          {previewState?.ok && (
            <p className="text-sm text-emerald-800">
              <strong>{previewState.recipients}</strong> recipient
              {previewState.recipients === 1 ? "" : "s"} match.
            </p>
          )}
          {previewState?.ok === false && (
            <p className="text-sm text-rose-800">{previewState.error}</p>
          )}
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">2. Compose + send</h2>
        <p className="mt-1 text-sm text-slate-600">
          From <strong>{senderLabel} &lt;{senderAddress}&gt;</strong>. Each
          recipient gets a single message addressed only to them (no CC, no
          BCC) — parents don&rsquo;t see each other&rsquo;s addresses. Plain
          text body; line breaks are preserved; a school-branded footer is
          appended automatically.
        </p>
        <form
          action={sendActionFn}
          onSubmit={(e) => {
            if (!confirming) {
              e.preventDefault()
              setConfirming(true)
            }
          }}
          className="mt-4 space-y-3"
        >
          <input type="hidden" name="audience" value={audience} />
          <input type="hidden" name="grade" value={grade} />
          <input type="hidden" name="section_id" value={sectionId} />

          <Field label="Subject">
            <input
              name="subject"
              required
              maxLength={200}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Body">
            <textarea
              name="body"
              required
              rows={8}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sendPending}
              className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                confirming
                  ? "bg-rose-600 hover:brightness-110"
                  : "bg-brand-navy hover:brightness-110"
              }`}
            >
              {sendPending
                ? "Sending…"
                : confirming
                ? "Confirm send"
                : "Send to cohort"}
            </button>
            {confirming && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          {sendState?.ok && (
            <p className="text-sm text-emerald-800">
              Sent to <strong>{sendState.recipients}</strong> recipient
              {sendState.recipients === 1 ? "" : "s"}.
            </p>
          )}
          {sendState?.ok === false && (
            <p className="text-sm text-rose-800">{sendState.error}</p>
          )}
        </form>
      </section>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span className="block">{label}</span>
      {children}
    </label>
  )
}
