import { siteConfig } from "@/lib/site"
import type { Transcript, TranscriptCourse } from "@/lib/transcripts"

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

// Renders an official-looking transcript. Used by both the admin
// (/admin/students/[id]/transcript) and student portal (/portal/transcript)
// pages. Print-friendly via Tailwind's print: prefixes.
export default function TranscriptDocument({
  transcript,
  variant,
}: {
  transcript: Transcript
  variant: "official" | "student"
}) {
  const student = transcript.student
  const hasGrades = transcript.terms.length > 0
  const isOfficial = variant === "official"

  return (
    <article className="space-y-6 print:space-y-4">
      <header className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 print:flex-nowrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
              {isOfficial ? "Official transcript" : "Transcript"}
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
        <h2 className="text-lg font-extrabold text-brand-navy">Student</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Legal name" value={fullLegalName(student)} />
          {student.preferred_name && (
            <Row label="Preferred name" value={student.preferred_name} />
          )}
          {student.dob && <Row label="Date of birth" value={formatDate(student.dob)} />}
          {student.current_grade && (
            <Row label="Current grade" value={student.current_grade} />
          )}
          {student.registered_at_hba && (
            <Row label="Registered at HBA" value={formatDate(student.registered_at_hba)} />
          )}
          {student.graduated_at && (
            <Row label="Graduated" value={formatDate(student.graduated_at)} />
          )}
          <Row
            label="Status"
            value={
              student.status === "active"
                ? "Active"
                : student.status === "graduated"
                ? "Graduated"
                : "Withdrawn"
            }
          />
          {isOfficial && student.hba_email && (
            <Row label="HBA email" value={student.hba_email} />
          )}
        </dl>
      </section>

      {!hasGrades ? (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-10 text-center text-sm text-slate-600 shadow-sm print:rounded-none print:border-0 print:py-4 print:shadow-none">
          No locked final grades on record yet. Final grades are added to the
          transcript when a section&rsquo;s grades are locked at term end.
        </section>
      ) : (
        transcript.terms.map((term) => (
          <section
            key={term.term_id}
            className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm print:break-inside-avoid print:rounded-none print:border-0 print:px-0 print:py-2 print:shadow-none"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-brand-navy">
                  {term.term_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {term.academic_year} &middot; {formatDate(term.start_date)} —{" "}
                  {formatDate(term.end_date)}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>
                  Term GPA:{" "}
                  <strong className="text-sm text-slate-900">
                    {term.term_gpa !== null ? term.term_gpa.toFixed(2) : "—"}
                  </strong>{" "}
                  {term.term_gpa_weighted !== null &&
                    term.term_gpa !== null &&
                    term.term_gpa_weighted !== term.term_gpa && (
                      <span className="text-slate-500">
                        (weighted {term.term_gpa_weighted.toFixed(2)})
                      </span>
                    )}
                </p>
                <p>
                  Credits earned: {term.term_credits_earned.toFixed(2)} of{" "}
                  {term.term_credits_attempted.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="py-2 pr-2">Course</th>
                    <th className="py-2 pr-2">Code</th>
                    <th className="py-2 pr-2 text-right">Credits</th>
                    <th className="py-2 pr-2">Grade</th>
                    <th className="py-2 pr-2 text-right">%</th>
                    <th className="py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {term.courses.map((course) => {
                    const tag = courseTag(course)
                    return (
                      <tr
                        key={course.enrollment_id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="py-2 pr-2 text-slate-900">
                          <span className="font-semibold">{course.course_name}</span>
                          {tag && (
                            <span className="ml-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 print:border-0 print:bg-transparent print:p-0">
                              {tag}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2 font-mono text-xs text-slate-700">
                          {course.course_code}
                        </td>
                        <td className="py-2 pr-2 text-right text-slate-700">
                          {course.credit_hours.toFixed(2)}
                        </td>
                        <td className="py-2 pr-2 font-semibold text-slate-900">
                          {course.final_grade_letter ?? "—"}
                        </td>
                        <td className="py-2 pr-2 text-right text-slate-700">
                          {course.final_grade_percentage !== null
                            ? `${course.final_grade_percentage.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-2 text-right text-slate-700">
                          {course.unweighted_points !== null
                            ? course.unweighted_points.toFixed(2)
                            : "—"}
                          {course.weighted_points !== null &&
                            course.unweighted_points !== null &&
                            course.weighted_points !== course.unweighted_points && (
                              <span className="ml-1 text-xs text-slate-500">
                                ({course.weighted_points.toFixed(2)} w)
                              </span>
                            )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {hasGrades && (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50/60 px-8 py-6 shadow-sm print:break-inside-avoid print:rounded-none print:border print:border-emerald-200 print:px-4 print:py-3 print:shadow-none">
          <h3 className="text-lg font-extrabold text-emerald-900">Cumulative</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row
              label="Cumulative GPA (unweighted)"
              value={
                transcript.cumulative_gpa !== null
                  ? transcript.cumulative_gpa.toFixed(2)
                  : "—"
              }
            />
            <Row
              label="Cumulative GPA (weighted)"
              value={
                transcript.cumulative_gpa_weighted !== null
                  ? transcript.cumulative_gpa_weighted.toFixed(2)
                  : "—"
              }
            />
            <Row
              label="Credits earned"
              value={transcript.cumulative_credits_earned.toFixed(2)}
            />
            <Row
              label="Credits attempted"
              value={transcript.cumulative_credits_attempted.toFixed(2)}
            />
          </dl>
          <p className="mt-3 text-xs text-emerald-800">
            GPA scale: A = 4.0, A− = 3.7, B+ = 3.3, B = 3.0, B− = 2.7, C+ = 2.3,
            C = 2.0, C− = 1.7, D+ = 1.3, D = 1.0, D− = 0.7, F = 0.0. Weighted
            GPA adds +1.0 for AP and +0.5 for Honors.
          </p>
        </section>
      )}

      <footer className="text-center text-[10px] text-slate-500 print:mt-4">
        Generated by High Bluff Academy SIS &middot;{" "}
        {formatTimestamp(transcript.generated_at)}
      </footer>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className="text-slate-900">{value || "—"}</dd>
    </div>
  )
}
