import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAllowedAdminEmail } from "@/lib/admin"
import { listTerms, type TermRecord } from "@/lib/sis"
import AcademicsHeader from "../AcademicsHeader"
import {
  createTermAction,
  lockTermGradesAction,
  unlockTermGradesAction,
  updateTermAction,
} from "../actions"

export const dynamic = "force-dynamic"

const pacific = "America/Los_Angeles"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: pacific,
  }).format(new Date(`${iso}T00:00:00`))
}

function kindLabel(kind: TermRecord["kind"]) {
  switch (kind) {
    case "fall":
      return "Fall"
    case "spring":
      return "Spring"
    case "summer":
      return "Summer"
  }
}

export default async function TermsPage() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }
  const adminEmail = session?.user?.email ?? ""

  const terms = await listTerms()

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AcademicsHeader active="terms" adminEmail={adminEmail} />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-brand-navy">Add a term</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each academic year has a Fall, Spring, and Summer term. Mark exactly
            one term as current at any time &mdash; the others will be cleared
            automatically.
          </p>

          <form
            action={createTermAction}
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <TermFormFields />
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Create term
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          {terms.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No terms yet. Create the current academic year&rsquo;s Fall term
              above to get started.
            </div>
          ) : (
            terms.map((term) => (
              <details
                key={term.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
              >
                <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_auto] lg:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-brand-navy">
                          {term.name}
                        </h3>
                        {term.is_current && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                            Current
                          </span>
                        )}
                        {term.is_grades_locked && (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            Grades locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {kindLabel(term.kind)} &middot; {term.academic_year} &middot;{" "}
                        <code className="text-slate-700">{term.slug}</code>
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {formatDate(term.start_date)} &mdash; {formatDate(term.end_date)}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition">
                      Edit
                    </span>
                  </div>
                </summary>

                <div className="space-y-6 border-t border-slate-200 px-5 py-5 sm:px-6">
                  <form
                    action={updateTermAction}
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <input type="hidden" name="id" value={term.id} />
                    <TermFormFields defaults={term} />
                    <div className="sm:col-span-2 lg:col-span-3">
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <p className="text-sm font-semibold text-brand-navy">
                      Lock all section grades in this term
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Runs the lock action on every section in {term.name}. Each
                      enrollment&rsquo;s current calculated grade gets snapshotted
                      to its final grade. Re-running refreshes the snapshot.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <form action={lockTermGradesAction}>
                        <input type="hidden" name="term_id" value={term.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                        >
                          Lock all sections
                        </button>
                      </form>
                      <form action={unlockTermGradesAction}>
                        <input type="hidden" name="term_id" value={term.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Unlock all sections
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </details>
            ))
          )}
        </section>
      </div>
    </main>
  )
}

function TermFormFields({ defaults }: { defaults?: TermRecord } = {}) {
  return (
    <>
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Name</span>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Fall 2025"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Slug</span>
        <input
          name="slug"
          required
          defaultValue={defaults?.slug ?? ""}
          placeholder="fall-2025"
          pattern="[a-z0-9-]+"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Kind</span>
        <select
          name="kind"
          defaultValue={defaults?.kind ?? "fall"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="fall">Fall</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Academic year</span>
        <input
          name="academic_year"
          required
          defaultValue={defaults?.academic_year ?? ""}
          placeholder="2025-2026"
          pattern="\d{4}-\d{4}"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Start date</span>
        <input
          name="start_date"
          type="date"
          required
          defaultValue={defaults?.start_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">End date</span>
        <input
          name="end_date"
          type="date"
          required
          defaultValue={defaults?.end_date ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3 sm:flex-row sm:gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_current"
            defaultChecked={defaults?.is_current ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Current term</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_grades_locked"
            defaultChecked={defaults?.is_grades_locked ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Grades locked (read-only)</span>
        </label>
      </div>
    </>
  )
}
