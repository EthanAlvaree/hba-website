"use client"

import { useActionState, useEffect, useState } from "react"
import {
  previewCohortAction,
  previewMassEmailAction,
  scheduleMassEmailAction,
  sendMassEmailAction,
  type MassEmailPreviewResult,
  type MassEmailResult,
  type ScheduleMassEmailResult,
} from "./actions"
import { RecipientChipInput } from "./RecipientChipInput"

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
  const [audiences, setAudiences] = useState<Set<string>>(new Set(["parents"]))
  const [grade, setGrade] = useState<string>("")
  const [sectionId, setSectionId] = useState<string>("")
  const [extraEmails, setExtraEmails] = useState<string[]>([])
  const [extraLabels, setExtraLabels] = useState<Record<string, string>>({})
  const extraEmailsValue = extraEmails.join("\n")

  const toggleAudience = (value: string) => {
    setAudiences((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const [cohortState, cohortPreviewAction, cohortPending] = useActionState<
    MassEmailResult | null,
    FormData
  >(previewCohortAction, null)

  const [emailPreview, emailPreviewAction, emailPreviewPending] = useActionState<
    MassEmailPreviewResult | null,
    FormData
  >(previewMassEmailAction, null)

  const [sendState, sendActionFn, sendPending] = useActionState<
    MassEmailResult | null,
    FormData
  >(sendMassEmailAction, null)

  const [scheduleState, scheduleActionFn, schedulePending] = useActionState<
    ScheduleMassEmailResult | null,
    FormData
  >(scheduleMassEmailAction, null)

  // Body + subject as controlled state so the preview modal can hand the
  // same values back to the send form without the user re-typing.
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")

  // Each new preview opens the modal; Cancel sets dismissed=true to close
  // it without losing the composer draft.
  const [previewDismissed, setPreviewDismissed] = useState(false)
  useEffect(() => {
    if (emailPreview?.ok) setPreviewDismissed(false)
  }, [emailPreview])

  const previewOpen =
    emailPreview?.ok === true && !previewDismissed && !sendState?.ok

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">1. Pick a cohort</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tick any combination — recipients across all checked audiences
          are merged and deduped. Grade / section filters narrow the
          student-side audiences. The individual recipients box lets you
          add specific addresses on top.
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Audiences
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "parents", label: "All parents" },
              { value: "students_hba", label: "All students (HBA emails)" },
              { value: "students_personal", label: "All students (personal emails)" },
              { value: "faculty", label: "All staff (faculty + admins)" },
            ].map((opt) => {
              const checked = audiences.has(opt.value)
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                    checked
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-navy"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAudience(opt.value)}
                    className="sr-only"
                  />
                  <span>{opt.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Grade (optional, applies to student-side audiences)">
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
          <Field label="Section (optional, applies to student-side audiences)">
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

        <div className="mt-5">
          <Field label="Add individual recipients">
            <RecipientChipInput
              emails={extraEmails}
              labels={extraLabels}
              onChange={(emails, labels) => {
                setExtraEmails(emails)
                setExtraLabels(labels)
              }}
            />
          </Field>
        </div>

        <form action={cohortPreviewAction} className="mt-4 flex flex-wrap items-center gap-3">
          {Array.from(audiences).map((a) => (
            <input key={a} type="hidden" name="audiences" value={a} />
          ))}
          <input type="hidden" name="grade" value={grade} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="extra_emails" value={extraEmailsValue} />
          <button
            type="submit"
            disabled={cohortPending}
            className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:opacity-50"
          >
            {cohortPending ? "Counting…" : "Preview recipient count"}
          </button>
          {cohortState?.ok && (
            <p className="text-sm text-emerald-800">
              <strong>{cohortState.recipients}</strong> recipient
              {cohortState.recipients === 1 ? "" : "s"} match.
            </p>
          )}
          {cohortState?.ok === false && (
            <p className="text-sm text-rose-800">{cohortState.error}</p>
          )}
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">2. Compose</h2>
        <p className="mt-1 text-sm text-slate-600">
          From <strong>{senderLabel} &lt;{senderAddress}&gt;</strong>. Each
          recipient gets a single message addressed only to them (no CC, no
          BCC) — parents don&rsquo;t see each other&rsquo;s addresses. Plain
          text body; line breaks are preserved; a school-branded footer is
          appended automatically.
        </p>

        {/* The compose form submits to the PREVIEW action, not the send
            action. The send action only fires from the preview modal so
            the admin always sees the rendered email before it ships. */}
        <form action={emailPreviewAction} className="mt-4 space-y-3">
          {Array.from(audiences).map((a) => (
            <input key={a} type="hidden" name="audiences" value={a} />
          ))}
          <input type="hidden" name="grade" value={grade} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="extra_emails" value={extraEmailsValue} />

          <Field label="Subject">
            <input
              name="subject"
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>
          <Field label="Body">
            <textarea
              name="body"
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={emailPreviewPending}
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
            >
              {emailPreviewPending ? "Building preview…" : "Preview &amp; send"}
            </button>
            <p className="text-xs text-slate-500">
              You&rsquo;ll see the rendered email with footer before anything
              ships.
            </p>
          </div>

          {emailPreview?.ok === false && (
            <p className="text-sm text-rose-800">{emailPreview.error}</p>
          )}

          {sendState?.ok && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Sent to <strong>{sendState.recipients}</strong> recipient
              {sendState.recipients === 1 ? "" : "s"}. See <strong>Recent
              sends</strong> below for the audit row.
            </p>
          )}
          {sendState?.ok === false && (
            <p className="text-sm text-rose-800">{sendState.error}</p>
          )}
        </form>

        <details className="mt-6 border-t border-slate-200 pt-6">
          <summary className="cursor-pointer text-sm font-semibold text-brand-navy">
            Or schedule this message for later
          </summary>
          <form action={scheduleActionFn} className="mt-3 space-y-3">
            {Array.from(audiences).map((a) => (
              <input key={a} type="hidden" name="audiences" value={a} />
            ))}
            <input type="hidden" name="grade" value={grade} />
            <input type="hidden" name="section_id" value={sectionId} />
            <input type="hidden" name="extra_emails" value={extraEmailsValue} />
            <input type="hidden" name="subject" value={subject} />
            <input type="hidden" name="body" value={body} />
            <Field label="Send at (Pacific time)">
              <input
                type="datetime-local"
                name="scheduled_for"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </Field>
            <p className="text-xs text-slate-500">
              Uses the same subject + body + audience filters above. A
              cron dispatches scheduled messages every five minutes, so
              actual send time may drift up to ~5 min past the
              scheduled time. You can cancel anytime before then in
              the &ldquo;Scheduled to send&rdquo; section below.
            </p>
            <button
              type="submit"
              disabled={
                schedulePending ||
                !subject.trim() ||
                !body.trim() ||
                !scheduledFor
              }
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-5 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white disabled:opacity-50"
            >
              {schedulePending ? "Scheduling…" : "Schedule for later"}
            </button>
            {scheduleState?.ok && (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                Scheduled. Estimated {scheduleState.recipients_estimated}{" "}
                recipient{scheduleState.recipients_estimated === 1 ? "" : "s"}.
                See the &ldquo;Scheduled to send&rdquo; section below to
                cancel.
              </p>
            )}
            {scheduleState?.ok === false && (
              <p className="text-xs text-rose-800">{scheduleState.error}</p>
            )}
          </form>
        </details>
      </section>

      {previewOpen && emailPreview?.ok && (
        <PreviewModal
          subject={emailPreview.subject}
          html={emailPreview.html}
          recipients={emailPreview.recipients}
          sampleRecipients={emailPreview.sample_recipients}
          senderEmail={emailPreview.sender_email}
          senderLabel={emailPreview.sender_label}
          audiences={Array.from(audiences)}
          grade={grade}
          sectionId={sectionId}
          extraEmails={extraEmailsValue}
          subjectValue={subject}
          bodyValue={body}
          sending={sendPending}
          sendAction={sendActionFn}
          onCancel={() => setPreviewDismissed(true)}
        />
      )}
    </div>
  )
}

function PreviewModal({
  subject,
  html,
  recipients,
  sampleRecipients,
  senderEmail,
  senderLabel,
  audiences,
  grade,
  sectionId,
  extraEmails,
  subjectValue,
  bodyValue,
  sending,
  sendAction,
  onCancel,
}: {
  subject: string
  html: string
  recipients: number
  sampleRecipients: string[]
  senderEmail: string
  senderLabel: string
  audiences: string[]
  grade: string
  sectionId: string
  extraEmails: string
  subjectValue: string
  bodyValue: string
  sending: boolean
  sendAction: (formData: FormData) => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8"
    >
      <div className="flex h-full max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
            Preview before sending
          </p>
          <h3
            id="preview-modal-heading"
            className="mt-1 text-xl font-extrabold text-brand-navy"
          >
            {subject}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            From <strong>{senderLabel} &lt;{senderEmail}&gt;</strong> · to{" "}
            <strong>{recipients}</strong> recipient
            {recipients === 1 ? "" : "s"}
            {sampleRecipients.length > 0 && (
              <>
                {" "}
                (e.g.{" "}
                <span className="font-mono text-slate-700">
                  {sampleRecipients.join(", ")}
                </span>
                {recipients > sampleRecipients.length ? " …" : ""})
              </>
            )}
          </p>
        </header>

        <div className="flex-1 overflow-hidden bg-slate-100 px-6 py-4">
          <iframe
            title="Rendered email preview"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8" /><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1f2937;padding:24px;}</style></head><body>${html}</body></html>`}
            sandbox=""
            className="h-full w-full rounded-2xl border border-slate-300 bg-white"
          />
        </div>

        <form
          action={sendAction}
          className="border-t border-slate-200 px-6 py-4"
        >
          {audiences.map((a) => (
            <input key={a} type="hidden" name="audiences" value={a} />
          ))}
          <input type="hidden" name="grade" value={grade} />
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="extra_emails" value={extraEmails} />
          <input type="hidden" name="subject" value={subjectValue} />
          <input type="hidden" name="body" value={bodyValue} />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50"
            >
              {sending
                ? "Sending…"
                : `Send to ${recipients} recipient${recipients === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>
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
