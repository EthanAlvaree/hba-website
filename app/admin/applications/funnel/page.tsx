// Admissions pipeline funnel report.
//
// Three lenses on the same data:
//
//   1. Funnel (current snapshot): Applied → Reviewed → Admitted → Enrolled.
//      Each stage shows the cumulative count of applications that
//      reached at least that stage, plus the conversion rate from the
//      stage before.
//
//   2. Status histogram: every status with its count + percentage of
//      total non-draft applications.
//
//   3. Monthly trend: applications submitted per month for the last
//      12 months, plus how many of each cohort are currently enrolled.
//
// Read-only; pulls fresh on every request (force-dynamic). For a large
// applicant pool this is still fast — the underlying scan is one query
// of the applications table with a `created_at, status` projection.

import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getServiceSupabase } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type StatusBucket = "draft" | "submitted" | "in_review" | "info_requested" | "admit_offered" | "accepted" | "declined" | "withdrawn" | "enrolled" | "archived"

type Row = {
  created_at: string
  status: StatusBucket
}

// Statuses that represent each funnel stage. An application in `enrolled`
// has by definition passed every earlier stage, so we count it everywhere
// up to and including its current stage.
const STAGE_PASSED: Record<string, StatusBucket[]> = {
  applied: ["submitted", "in_review", "info_requested", "admit_offered", "accepted", "enrolled", "declined", "withdrawn", "archived"],
  reviewed: ["in_review", "info_requested", "admit_offered", "accepted", "enrolled", "declined"],
  admitted: ["admit_offered", "accepted", "enrolled"],
  enrolled: ["enrolled"],
}

const STAGE_LABELS: Array<{ key: keyof typeof STAGE_PASSED; label: string; description: string }> = [
  { key: "applied", label: "Applied", description: "Submitted a complete application" },
  { key: "reviewed", label: "Reviewed", description: "Admissions team has looked at it" },
  { key: "admitted", label: "Admitted", description: "Offer of admission extended" },
  { key: "enrolled", label: "Enrolled", description: "Family completed enrollment paperwork" },
]

const STATUS_LABELS: Record<StatusBucket, string> = {
  draft: "Draft (in progress)",
  submitted: "Submitted (awaiting review)",
  in_review: "Under review",
  info_requested: "Info requested",
  admit_offered: "Admit offered",
  accepted: "Accepted offer",
  enrolled: "Enrolled",
  declined: "Declined",
  withdrawn: "Withdrawn",
  archived: "Archived",
}

const STATUS_TONE: Record<StatusBucket, string> = {
  draft: "bg-slate-200 text-slate-700",
  submitted: "bg-sky-100 text-sky-800",
  in_review: "bg-sky-200 text-sky-900",
  info_requested: "bg-amber-100 text-amber-800",
  admit_offered: "bg-violet-100 text-violet-800",
  accepted: "bg-emerald-100 text-emerald-800",
  enrolled: "bg-emerald-200 text-emerald-900",
  declined: "bg-rose-100 text-rose-800",
  withdrawn: "bg-slate-200 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map((s) => parseInt(s, 10))
  if (!y || !m) return key
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1))
  )
}

export default async function ApplicationsFunnelPage() {
  const session = await auth()
  if (!session?.isAdmin) redirect("/admin/sign-in")

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from("applications")
    .select("created_at, status")
    .returns<Row[]>()
  if (error) {
    throw new Error(`Failed to load applications: ${error.message}`)
  }
  const rows = data ?? []

  // ---- Funnel counts ----
  const funnel = STAGE_LABELS.map((stage) => {
    const passing = new Set(STAGE_PASSED[stage.key])
    const count = rows.filter((r) => passing.has(r.status)).length
    return { ...stage, count }
  })
  const appliedTotal = funnel[0]?.count ?? 0

  // ---- Status histogram ----
  const statusCounts = new Map<StatusBucket, number>()
  for (const r of rows) {
    statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1)
  }
  const totalNonDraft = rows.filter((r) => r.status !== "draft").length

  // ---- Monthly trend (last 12 months by created_at) ----
  const now = new Date()
  const monthKeys: string[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    monthKeys.push(monthKey(d))
  }
  const byMonth = new Map<string, { applied: number; enrolled: number }>(
    monthKeys.map((k) => [k, { applied: 0, enrolled: 0 }])
  )
  for (const r of rows) {
    if (r.status === "draft") continue
    const k = monthKey(new Date(r.created_at))
    const bucket = byMonth.get(k)
    if (!bucket) continue // outside 12-month window
    bucket.applied += 1
    if (r.status === "enrolled") bucket.enrolled += 1
  }
  const monthlyMax = Math.max(...[...byMonth.values()].map((b) => b.applied), 1)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/applications"
            className="text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
          >
            ← Back to applications
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">
            Admissions pipeline
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            How many applications are at each stage, conversion rates between
            stages, and the last 12 months of applied-vs-enrolled trend.
          </p>
        </div>
      </header>

      {/* ---- Funnel ---- */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">Funnel</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cumulative — an enrolled student is counted in every stage they
          passed through.
        </p>
        <ol className="mt-5 space-y-3">
          {funnel.map((stage, i) => {
            const widthPct = appliedTotal === 0 ? 0 : Math.round((stage.count / appliedTotal) * 100)
            const prev = funnel[i - 1]
            const conversion = prev ? pct(stage.count, prev.count) : null
            return (
              <li key={stage.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-brand-navy">{stage.label}</p>
                  <p className="text-xs text-slate-600">
                    {stage.count}
                    {conversion && (
                      <span className="ml-2 text-slate-500">
                        ({conversion} of previous stage)
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500">{stage.description}</p>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-brand-navy"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
        {appliedTotal === 0 && (
          <p className="mt-5 text-sm text-slate-600">
            No applications yet. Once families start submitting via{" "}
            <Link href="/apply" className="font-semibold text-brand-navy underline-offset-4 hover:underline">
              /apply
            </Link>
            , this funnel populates.
          </p>
        )}
      </section>

      {/* ---- Status histogram ---- */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">By status</h2>
        <p className="mt-1 text-sm text-slate-600">
          Current snapshot. Percentages are of all non-draft applications
          ({totalNonDraft}).
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(STATUS_LABELS) as StatusBucket[]).map((status) => {
            const count = statusCounts.get(status) ?? 0
            const share = status === "draft" ? null : pct(count, totalNonDraft)
            return (
              <li
                key={status}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${STATUS_TONE[status]}`}
                  >
                    {count}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                {share && (
                  <span className="text-xs text-slate-500">{share}</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---- Monthly trend ---- */}
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-brand-navy">Last 12 months</h2>
        <p className="mt-1 text-sm text-slate-600">
          Applications submitted per month + how many of that cohort are
          currently enrolled.
        </p>
        <ol className="mt-4 space-y-1.5">
          {monthKeys.map((key) => {
            const bucket = byMonth.get(key)!
            const widthPct = Math.round((bucket.applied / monthlyMax) * 100)
            const enrolledPct = Math.round((bucket.enrolled / monthlyMax) * 100)
            return (
              <li key={key} className="grid grid-cols-[100px_1fr_120px] items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">
                  {monthLabel(key)}
                </span>
                <div className="relative h-5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-navy/30"
                    style={{ width: `${widthPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500"
                    style={{ width: `${enrolledPct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-600">
                  <strong className="text-slate-800">{bucket.applied}</strong> applied
                  {bucket.enrolled > 0 && (
                    <>
                      {" · "}
                      <span className="text-emerald-700">
                        {bucket.enrolled} enrolled
                      </span>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-brand-navy/30" />
            Applied
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            Of which now enrolled
          </span>
        </div>
      </section>
    </div>
  )
}
