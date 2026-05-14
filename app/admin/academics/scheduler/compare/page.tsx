// Side-by-side comparison of two schedule drafts.
//
// When the office generates several candidate drafts for a term, the
// single Score number isn't enough to choose between them — one draft
// might score higher but at the cost of teacher load balance, or have
// more cores fulfilled but more below-min sections. This page lines up
// the multi-objective metrics from both drafts and highlights the
// deltas so the trade-offs are explicit.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import type { SolverMetrics } from "@/lib/scheduler-solver"
import { getServiceSupabase } from "@/lib/supabase-server"
import AcademicsHeader from "../../AcademicsHeader"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ a?: string; b?: string }>
}

type DraftCompareRow = {
  id: string
  created_at: string
  created_by: string | null
  status: string
  score: number | null
  notes: string | null
  summary: {
    fulfilled_requests?: number
    unfulfilled_requests?: number
    section_count?: number
    warning_count?: number
    metrics?: SolverMetrics
  } | null
  term: { id: string; name: string } | null
}

const pacific = "America/Los_Angeles"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

export default async function CompareDraftsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const raw = await searchParams
  const supabase = getServiceSupabase()

  // Load the picker list (recent drafts) regardless — the page doubles
  // as the "pick two drafts" entry point.
  const { data: allDrafts } = await supabase
    .from("schedule_drafts")
    .select("id, created_at, status, score, term:terms(id, name)")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<
      Array<{
        id: string
        created_at: string
        status: string
        score: number | null
        term: { id: string; name: string } | null
      }>
    >()
  const pickerDrafts = allDrafts ?? []

  let draftA: DraftCompareRow | null = null
  let draftB: DraftCompareRow | null = null
  if (raw.a && raw.b) {
    const { data } = await supabase
      .from("schedule_drafts")
      .select(
        `id, created_at, created_by, status, score, notes, summary,
         term:terms(id, name)`
      )
      .in("id", [raw.a, raw.b])
      .returns<DraftCompareRow[]>()
    draftA = data?.find((d) => d.id === raw.a) ?? null
    draftB = data?.find((d) => d.id === raw.b) ?? null
  }

  return (
    <div className="space-y-6">
      <AcademicsHeader active="scheduler" />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/academics/scheduler"
            className="text-xs font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to scheduler
          </Link>
          <h1 className="text-3xl font-extrabold text-brand-navy">
            Compare drafts
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Line two drafts up side-by-side. The delta column shows
            whether draft B is better (green) or worse (rose) than draft
            A on each dimension — so a higher total score doesn&rsquo;t
            hide a worse teacher-load trade-off.
          </p>
        </div>
      </header>

      {/* Picker */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">
          Pick two drafts
        </h2>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Draft A</span>
            <select
              name="a"
              required
              defaultValue={raw.a ?? ""}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Pick a draft…</option>
              {pickerDrafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.term?.name ?? "(term)"} · score{" "}
                  {d.score?.toFixed(0) ?? "—"} · {formatTimestamp(d.created_at)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span className="block">Draft B</span>
            <select
              name="b"
              required
              defaultValue={raw.b ?? ""}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Pick a draft…</option>
              {pickerDrafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.term?.name ?? "(term)"} · score{" "}
                  {d.score?.toFixed(0) ?? "—"} · {formatTimestamp(d.created_at)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Compare
          </button>
        </form>
      </section>

      {raw.a && raw.b && (!draftA || !draftB) && (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 shadow-sm">
          <p className="text-sm font-semibold text-rose-900">
            Couldn&rsquo;t load one or both drafts. They may have been
            deleted.
          </p>
        </section>
      )}

      {draftA && draftB && (
        <ComparisonTable draftA={draftA} draftB={draftB} />
      )}
    </div>
  )
}

// "higher" = a larger value is better; "lower" = a smaller value is
// better (below-min sections, load-balance stdev).
type MetricDirection = "higher" | "lower"

type ComparisonRow = {
  label: string
  a: number
  b: number
  direction: MetricDirection
  format: (n: number) => string
}

function ComparisonTable({
  draftA,
  draftB,
}: {
  draftA: DraftCompareRow
  draftB: DraftCompareRow
}) {
  const ma = draftA.summary?.metrics
  const mb = draftB.summary?.metrics

  const asPct = (n: number) => `${Math.round(n * 100)}%`
  const asNum = (n: number) => String(n)
  const asFixed = (n: number) => n.toFixed(2)

  const rows: ComparisonRow[] = []
  if (ma && mb) {
    rows.push(
      {
        label: "Score (overall)",
        a: draftA.score ?? 0,
        b: draftB.score ?? 0,
        direction: "higher",
        format: (n) => n.toFixed(0),
      },
      {
        label: "Cores fulfilled",
        a: ma.cores.fulfilled,
        b: mb.cores.fulfilled,
        direction: "higher",
        format: asNum,
      },
      {
        label: "Core fulfillment rate",
        a: ma.cores.rate,
        b: mb.cores.rate,
        direction: "higher",
        format: asPct,
      },
      {
        label: "Electives fulfilled",
        a: ma.electives.fulfilled,
        b: mb.electives.fulfilled,
        direction: "higher",
        format: asNum,
      },
      {
        label: "Elective fulfillment rate",
        a: ma.electives.rate,
        b: mb.electives.rate,
        direction: "higher",
        format: asPct,
      },
      {
        label: "Rank-1 student match",
        a: ma.rank_1_match_rate,
        b: mb.rank_1_match_rate,
        direction: "higher",
        format: asPct,
      },
      {
        label: "Sections",
        a: ma.section_count,
        b: mb.section_count,
        direction: "lower",
        format: asNum,
      },
      {
        label: "Avg section size",
        a: ma.avg_section_size,
        b: mb.avg_section_size,
        direction: "higher",
        format: asFixed,
      },
      {
        label: "Below-min sections",
        a: ma.below_min_sections,
        b: mb.below_min_sections,
        direction: "lower",
        format: asNum,
      },
      {
        label: "Teacher rank-1 match",
        a: ma.teacher_rank_1_match_rate,
        b: mb.teacher_rank_1_match_rate,
        direction: "higher",
        format: asPct,
      },
      {
        label: "Teacher load balance (σ)",
        a: ma.teacher_load_balance_stdev,
        b: mb.teacher_load_balance_stdev,
        direction: "lower",
        format: asFixed,
      }
    )
  }

  return (
    <section className="space-y-4 rounded-[2rem] border border-brand-navy/15 bg-white px-6 py-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <DraftHeaderCard label="Draft A" draft={draftA} />
        <DraftHeaderCard label="Draft B" draft={draftB} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          One or both drafts predate the multi-objective metrics — regenerate
          them to compare on the full set of dimensions.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">Metric</th>
                <th className="px-4 py-3 font-bold">Draft A</th>
                <th className="px-4 py-3 font-bold">Draft B</th>
                <th className="px-4 py-3 font-bold">Delta (B − A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const delta = row.b - row.a
                const better =
                  delta === 0
                    ? "same"
                    : row.direction === "higher"
                      ? delta > 0
                        ? "b"
                        : "a"
                      : delta < 0
                        ? "b"
                        : "a"
                const deltaClass =
                  better === "b"
                    ? "text-emerald-700"
                    : better === "a"
                      ? "text-rose-700"
                      : "text-slate-500"
                const sign = delta > 0 ? "+" : ""
                return (
                  <tr key={row.label}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.format(row.a)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.format(row.b)}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${deltaClass}`}>
                      {better === "same" ? "—" : `${sign}${row.format(delta)}`}
                      {better !== "same" && (
                        <span className="ml-1 text-[11px] font-normal">
                          {better === "b" ? "(B better)" : "(A better)"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/academics/scheduler?draft_id=${draftA.id}`}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        >
          Open draft A →
        </Link>
        <Link
          href={`/admin/academics/scheduler?draft_id=${draftB.id}`}
          className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
        >
          Open draft B →
        </Link>
      </div>
    </section>
  )
}

function DraftHeaderCard({
  label,
  draft,
}: {
  label: string
  draft: DraftCompareRow
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {draft.term?.name ?? "(unknown term)"}
      </p>
      <p className="text-xs text-slate-500">
        {formatTimestamp(draft.created_at)}
        {draft.created_by && <> · {draft.created_by}</>} · status{" "}
        <code>{draft.status}</code>
      </p>
      {draft.notes && (
        <p className="mt-2 whitespace-pre-wrap text-xs italic text-slate-600">
          {draft.notes}
        </p>
      )}
    </div>
  )
}
