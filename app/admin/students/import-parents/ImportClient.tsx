"use client"

import { useActionState } from "react"
import { importParentLinksAction, type BulkImportResult } from "./actions"

const sampleCsv = `student_email,parent_email,relationship,is_primary,can_view_grades,can_view_attendance,is_homestay
ben@highbluffacademy.com,sarah.parent@example.com,Mother,true,true,true,false
ben@highbluffacademy.com,david.parent@example.com,Father,false,true,true,false
maria@highbluffacademy.com,host.family@example.com,Homestay host,true,true,true,true`

export function ImportClient() {
  const [state, formAction, pending] = useActionState<BulkImportResult | null, FormData>(
    importParentLinksAction,
    null
  )

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">CSV format</h2>
        <p className="mt-1 text-sm text-slate-600">
          Header row required. <code>student_email</code> and{" "}
          <code>parent_email</code> are mandatory. Booleans accept{" "}
          <code>true / false</code>, <code>yes / no</code>, or <code>1 / 0</code>.
          Optional columns: <code>relationship</code>, <code>is_primary</code>,
          <code>is_homestay</code>, <code>is_emergency_contact</code>,{" "}
          <code>can_view_grades</code>, <code>can_view_attendance</code>,{" "}
          <code>can_receive_communications</code>.
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

      <form action={formAction} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
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
          Existing parent links are detected and skipped — re-running the same
          CSV is safe. Parent profiles missing from the directory are created
          automatically with role <code>parent</code>.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import parent links"}
        </button>
      </form>

      {state?.ok === false && state.error && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">Import failed.</p>
          <p className="mt-1 text-sm text-rose-800 whitespace-pre-wrap">
            {state.error}
          </p>
        </section>
      )}

      {state?.ok === true && state.outcome && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-6 py-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-900">
            Import complete.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Rows processed" value={state.outcome.total_rows} />
            <Stat label="Links created" value={state.outcome.links_created} />
            <Stat label="Already existed" value={state.outcome.links_existing} />
            <Stat label="Parent profiles created" value={state.outcome.profiles_created} />
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
