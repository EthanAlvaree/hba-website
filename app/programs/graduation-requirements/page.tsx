// Public graduation-requirements page.
//
// Reads the live requirements + course-subject mappings from the SIS so
// the marketing copy and the SIS rule engine can never disagree. Cached
// for an hour because policy changes slowly and a hot reload on every
// visit would be wasteful.

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"
import {
  listCourseSubjectAssignments,
  listGraduationRequirements,
  subjectAreaLabel,
  subjectAreas,
  type SubjectArea,
} from "@/lib/scheduler"
import { listCourses, type CourseRecord } from "@/lib/sis"

// Rendered per request rather than prerendered at build time — it
// reads the live graduation_requirements + course_subject_assignments
// tables, and prerendering would pin it to whatever schema/data
// existed at build time. Low-traffic page; per-request is fine.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Graduation requirements — High Bluff Academy",
  description:
    "What it takes to graduate from High Bluff Academy — the basic diploma path and the recommended course load for college-bound students.",
}

type RequirementGroup = {
  area: SubjectArea
  basic: number | null
  collegeBound: number | null
  notes: string[]
  courses: CourseRecord[]
}

export default async function GraduationRequirementsPage() {
  const [requirements, assignments, courses] = await Promise.all([
    listGraduationRequirements(),
    listCourseSubjectAssignments(),
    listCourses(),
  ])

  const coursesById = new Map(courses.map((c) => [c.id, c]))
  const coursesByArea = new Map<SubjectArea, CourseRecord[]>()
  for (const a of assignments) {
    const c = coursesById.get(a.course_id)
    if (!c || !c.active) continue
    const area = a.subject_area as SubjectArea
    if (!subjectAreas.includes(area)) continue
    const arr = coursesByArea.get(area) ?? []
    arr.push(c)
    coursesByArea.set(area, arr)
  }
  // Stable per-area ordering: AP / Honors weighted up so they show first.
  for (const arr of coursesByArea.values()) {
    arr.sort((a, b) => {
      if (a.is_ap !== b.is_ap) return a.is_ap ? -1 : 1
      if (a.is_honors !== b.is_honors) return a.is_honors ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  // One requirement row per subject area now — both track credits are
  // columns on it.
  const requirementBySubject = new Map(
    requirements.map((r) => [r.subject_area, r])
  )

  const groups: RequirementGroup[] = subjectAreas.map((area) => {
    const req = requirementBySubject.get(area)
    return {
      area,
      basic: req ? Number(req.required_credits_basic) : null,
      collegeBound: req ? Number(req.required_credits_college_bound) : null,
      notes: req?.notes ? [req.notes] : [],
      courses: coursesByArea.get(area) ?? [],
    }
  })

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Graduation requirements"
        subtitle="What it takes to graduate from High Bluff Academy — and what we recommend for students headed to four-year colleges."
        image="/images/hba/programs/courses.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-16 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy text-center">
            Two tracks. One catalogue.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed text-center">
            Every HBA student earns the same diploma. The <strong>basic
            diploma</strong> column below is the minimum we require to walk
            at graduation. The <strong>college-bound</strong> column is what
            we recommend for any student planning to apply to four-year
            colleges — it lines up with UC A–G and the typical selective
            college admissions baseline.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-600 pt-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Basic diploma
              </p>
              <p className="mt-1">
                The path to a high school diploma — the foundation every HBA
                student completes.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                College-bound
              </p>
              <p className="mt-1">
                The recommended course load for four-year college applicants.
                Add AP and honors for selective schools.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                Edited by HBA office
              </p>
              <p className="mt-1">
                Requirements below are maintained in our SIS, so what
                you&rsquo;re reading is what every advisor and student sees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REQUIREMENTS TABLE */}
      <section className="py-16 bg-gray-50">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-brand-navy text-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-[0.12em]">
                    Subject area
                  </th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-[0.12em]">
                    Basic diploma
                  </th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-[0.12em]">
                    College-bound
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groups
                  .filter((g) => (g.basic ?? 0) > 0 || (g.collegeBound ?? 0) > 0)
                  .map((g) => (
                    <tr key={g.area} className="align-top">
                      <td className="px-6 py-5">
                        <p className="text-base font-semibold text-brand-navy">
                          {subjectAreaLabel(g.area)}
                        </p>
                        {g.notes.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-gray-500">
                            {Array.from(new Set(g.notes)).map((note, idx) => (
                              <li key={idx}>{note}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm">
                        {g.basic !== null ? (
                          <span className="font-semibold text-gray-900">
                            {formatYears(g.basic)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm">
                        {g.collegeBound !== null ? (
                          <span className="font-semibold text-gray-900">
                            {formatYears(g.collegeBound)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            One credit = one full academic year of a course meeting four to
            five periods a week. Half-credit courses meet on a lighter
            schedule. Physical-education exemptions and art ↔ foreign-language
            substitutions are evaluated case-by-case by school administration.
          </p>
        </div>
      </section>

      {/* COURSES PER SUBJECT */}
      <section className="py-16 bg-white">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Which courses fulfill which requirement?
            </h2>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              Each course in the HBA catalogue counts toward one subject
              area. AP and honors courses appear first in each list.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {groups
              .filter((g) => g.courses.length > 0)
              .map((g) => (
                <div
                  key={g.area}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-brand-navy">
                      {subjectAreaLabel(g.area)}
                    </h3>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                      {g.courses.length}{" "}
                      {g.courses.length === 1 ? "course" : "courses"}
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-sm text-gray-700 sm:grid-cols-1">
                    {g.courses.map((c) => (
                      <li key={c.id} className="flex items-start gap-2">
                        <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-brand-orange" />
                        <span>
                          {c.name}
                          {c.is_ap && (
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
                              AP
                            </span>
                          )}
                          {c.is_honors && !c.is_ap && (
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                              Honors
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Questions about course selection?
          </h2>
          <p className="text-lg text-white/90 font-light">
            Our advisors help every student map a four-year plan that fits
            graduation requirements and college aspirations.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href={siteConfig.external.enrollment}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Apply now
            </Link>
            <Link
              href="/programs/courses"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Browse the catalogue
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Talk to admissions
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function formatYears(credits: number): string {
  if (credits === 0) return "0 years"
  if (credits === 1) return "1 year"
  // Whole numbers render as "N years"; halves render as "N.5 years".
  const rounded = Number.isInteger(credits) ? credits.toFixed(0) : credits.toFixed(1)
  return `${rounded} years`
}
