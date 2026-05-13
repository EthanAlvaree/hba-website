// Renders a single-term report card. Shape is similar to the transcript
// but scoped to one TranscriptTerm and labeled "Report card" instead of
// "Transcript." Print-friendly via Tailwind's print: prefixes.

import { siteConfig } from "@/lib/site"
import type { Transcript, TranscriptCourse, TranscriptTerm } from "@/lib/transcripts"

const pacific = "America/Los_Angeles"

function formatDate(value: string | null) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: pacific,
  }).format(new Date(`${value}T00:00:00`))
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: pacific,
  }).format(new Date(value))
}

function fullLegalName(student: Transcript["student"]): string {
  return [
    student.legal_first_name,
    student.legal_middle_name,
    student.legal_last_name,
    student.suffix,
  ]
    .filter(Boolean)
    .join(" ")
}

function courseTag(course: TranscriptCourse): string | null {
  if (course.is_ap) return "AP"
  if (course.is_honors) return "Honors"
  if (course.is_elective) return "Elective"
  return null
}

export default function ReportCardDocument({
  transcript,
  term,
}: {
  transcript: Transcript
  term: TranscriptTerm
}) {
  const student = transcript.student

  return (
    <article className="space-y-6 print:space-y-4">
      <header className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 print:flex-nowrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Report card
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-brand-navy print:text-2xl">
              High Bluff Academy
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {siteConfig.address.streetLine1} &middot;{" "}
              {siteConfig.address.locality}, {siteConfig.address.regionCode}{" "}
              {siteConfig.address.postalCode}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 print:text-[10px]">
            <p>Generated {formatTimestamp(transcript.generated_at)}</p>
            <p>Document ID: {student.id.slice(0, 8)}</p>
          </div>
        </div>
      </header>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-2 print:shadow-none">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">Student</h2>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fullLegalName(student)}
            </p>
            {student.preferred_name && (
              <p className="text-sm text-slate-600">
                Preferred name: {student.preferred_name}
              </p>
            )}
            {student.current_grade && (
              <p className="text-sm text-slate-600">
                Current grade level: {student.current_grade}
              </p>
            )}
            {student.dob && (
              <p className="text-sm text-slate-600">
                Date of birth: {formatDate(student.dob)}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">Term</h2>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {term.term_name}
            </p>
            <p className="text-sm text-slate-600">
              {term.academic_year}
            </p>
            <p className="text-sm text-slate-600">
              {formatDate(term.start_date)} &ndash; {formatDate(term.end_date)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-2 print:shadow-none">
        <h2 className="text-lg font-extrabold text-brand-navy">Courses</h2>

        {term.courses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No locked grades on file for this term yet.
          </p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <th className="py-2 pr-2">Course</th>
                <th className="py-2 px-2">Credits</th>
                <th className="py-2 px-2">Percent</th>
                <th className="py-2 px-2">Letter</th>
                <th className="py-2 pl-2 text-right">GPA points</th>
              </tr>
            </thead>
            <tbody>
              {term.courses.map((course) => {
                const tag = courseTag(course)
                return (
                  <tr
                    key={course.enrollment_id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {course.course_name}
                        </span>
                        <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {course.course_code}
                        </code>
                        {tag && (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            {tag}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-700">
                      {Number(course.credit_hours).toFixed(1)}
                    </td>
                    <td className="py-2 px-2 text-slate-700">
                      {course.final_grade_percentage === null
                        ? "—"
                        : `${Number(course.final_grade_percentage).toFixed(1)}%`}
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-900">
                      {course.final_grade_letter ?? "—"}
                    </td>
                    <td className="py-2 pl-2 text-right text-slate-700">
                      {course.unweighted_points === null
                        ? "—"
                        : course.unweighted_points.toFixed(2)}
                      {course.weighted_points !== null &&
                        course.unweighted_points !== null &&
                        course.weighted_points !== course.unweighted_points && (
                          <span className="ml-1 text-xs text-slate-500">
                            ({course.weighted_points.toFixed(2)} wtd)
                          </span>
                        )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Credits attempted" value={term.term_credits_attempted.toFixed(1)} />
          <Stat label="Credits earned" value={term.term_credits_earned.toFixed(1)} />
          <Stat
            label="Term GPA"
            value={term.term_gpa === null ? "—" : term.term_gpa.toFixed(2)}
          />
          <Stat
            label="Term GPA (weighted)"
            value={
              term.term_gpa_weighted === null
                ? "—"
                : term.term_gpa_weighted.toFixed(2)
            }
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-2 print:shadow-none">
        <p className="text-xs text-slate-500 print:text-[10px]">
          This report card reflects locked final grades as of{" "}
          {formatTimestamp(transcript.generated_at)}. Cumulative GPA and
          all-term history are on the full transcript. Questions about a grade
          should go to the teacher of record; clerical questions to the office.
        </p>
      </section>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 print:border print:bg-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  )
}
