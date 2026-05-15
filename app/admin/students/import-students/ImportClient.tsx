"use client"

import { useActionState } from "react"
import { importStudentsAction, type BulkStudentImportResult } from "./actions"
import { siteConfig } from "@/lib/site"

const sampleCsv = `hba_email,legal_first_name,legal_last_name,preferred_name,current_grade,dob,enrollment_type
ben.bui@${siteConfig.contact.emailDomain},Benjamin,Bui,Ben,11,2009-04-12,full_time
maria.chen@${siteConfig.contact.emailDomain},Maria,Chen,,10,2010-09-30,full_time
alex.tang@${siteConfig.contact.emailDomain},Alex,Tang,,9,2011-01-18,part_time`

export function ImportClient() {
  const [state, formAction, pending] = useActionState<BulkStudentImportResult | null, FormData>(
    importStudentsAction,
    null
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">CSV format</h2>
        <p className="mt-1 text-sm text-slate-600">
          Header row required. <code>hba_email</code>,{" "}
          <code>legal_first_name</code>, and <code>legal_last_name</code> are
          mandatory. Optional: <code>preferred_name</code>,{" "}
          <code>current_grade</code>, <code>dob</code> (YYYY-MM-DD),{" "}
          <code>enrollment_type</code> (one of summer / part_time /
          full_time). Header column names are tolerant of common aliases
          ("first name", "grade", "date of birth", "email").
        </p>
        <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-brand-navy">
            See an example
          </summary>
          <pre className="whitespace-pre overflow-x-auto px-4 py-3 text-xs text-slate-800">
{sampleCsv}
          </pre>
        </details>
      </section>

      <form
        action={formAction}
        className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
      >
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span className="block">Paste CSV</span>
          <textarea
            name="csv"
            required
            rows={14}
            placeholder={sampleCsv}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
          />
        </label>
        <p className="text-xs text-slate-500">
          Idempotent on <code>hba_email</code>. Re-running the same CSV won&rsquo;t
          create duplicates — existing students are detected by their profile
          email and skipped. Profiles for new HBA emails are created
          automatically with role <code>student</code>.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import students"}
        </button>
      </form>

      {state?.ok === false && state.error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">Import failed.</p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">{state.error}</p>
        </section>
      )}

      {state?.ok === true && state.outcome && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">Import complete.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Rows processed" value={state.outcome.total_rows} />
            <Stat label="Students created" value={state.outcome.students_created} />
            <Stat label="Already existed" value={state.outcome.students_skipped_existing} />
            <Stat label="Profiles created" value={state.outcome.profiles_created} />
          </div>
          {state.outcome.rows_failed > 0 && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-semibold text-rose-900">
                {state.outcome.rows_failed} row
                {state.outcome.rows_failed === 1 ? "" : "s"} failed.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-rose-800">
                {state.outcome.errors.slice(0, 20).map((err, i) => (
                  <li key={i}>
                    <strong>Row {err.row_number}:</strong> {err.message}
                  </li>
                ))}
                {state.outcome.errors.length > 20 && (
                  <li>… and {state.outcome.errors.length - 20} more.</li>
                )}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-emerald-900">{value}</p>
    </div>
  )
}
