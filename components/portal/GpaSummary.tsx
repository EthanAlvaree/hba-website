// Top-of-portal summary card: cumulative GPA + credits earned + transcript
// link. Shared between /portal (the student's own view) and
// /parent/students/[id] (the parent's view of their kid). Only rendered when
// the transcript has at least one locked term.

import Link from "next/link"
import type { Transcript } from "@/lib/transcripts"

type Props = {
  transcript: Transcript
  /** "Your" for the student's own view, the student's first name for parents. */
  viewerLabel: string
  /** Optional override — link to "View transcript" lives here so the same
   *  component works under /portal and /parent/students/[id]. */
  transcriptHref?: string
}

export default function GpaSummary({
  transcript,
  viewerLabel,
  transcriptHref = "/portal/transcript",
}: Props) {
  const cumulativeGpa = transcript.cumulative_gpa
  const cumulativeGpaWeighted = transcript.cumulative_gpa_weighted
  const showWeighted =
    cumulativeGpa !== null &&
    cumulativeGpaWeighted !== null &&
    Math.abs(cumulativeGpaWeighted - cumulativeGpa) > 0.001

  return (
    <section className="rounded-[2rem] border border-brand-navy/15 bg-brand-navy px-6 py-6 text-white shadow-md">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
            Academic summary
          </p>
          <h2 className="mt-1 text-xl font-extrabold">{viewerLabel} cumulative record</h2>
          <p className="mt-1 text-sm text-white/80">
            Pulled from locked final grades across every term on file. Updated
            as terms close.
          </p>
        </div>
        <Link
          href={transcriptHref}
          className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          View transcript →
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Cumulative GPA"
          value={cumulativeGpa === null ? "—" : cumulativeGpa.toFixed(2)}
          sub={showWeighted ? `${cumulativeGpaWeighted!.toFixed(2)} weighted` : null}
        />
        <Stat
          label="Credits earned"
          value={transcript.cumulative_credits_earned.toFixed(1)}
          sub={`of ${transcript.cumulative_credits_attempted.toFixed(1)} attempted`}
        />
        <Stat
          label="Terms on record"
          value={String(transcript.terms.length)}
          sub={null}
        />
      </dl>
    </section>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string | null
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/70">{sub}</p>}
    </div>
  )
}
