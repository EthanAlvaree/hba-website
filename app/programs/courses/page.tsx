// app/programs/courses/page.tsx
//
// Public course catalogue. Renders straight from the SIS `courses`
// table (the single source of truth) — grouped into the eight
// presentational categories from lib/course-categories. Inactive /
// retired courses are filtered out automatically.

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"
import { listCourses, type CourseRecord } from "@/lib/sis"
import {
  courseCategories,
  type CourseCategoryId,
} from "@/lib/course-categories"

export const metadata = {
  title: "Course catalogue — High Bluff Academy",
  description:
    "The full High Bluff Academy course catalogue. Mathematics, science, language arts, social science, world languages, and electives — including 30+ AP and honors courses, all UC A–G aligned.",
}

// Rendered per request so the catalogue always matches the live SIS —
// adding or retiring a course in /admin/academics/courses shows up here
// immediately.
export const dynamic = "force-dynamic"

// Stable per-category ordering: AP first, then honors, then by name.
function sortForDisplay(a: CourseRecord, b: CourseRecord): number {
  if (a.is_ap !== b.is_ap) return a.is_ap ? -1 : 1
  if (a.is_honors !== b.is_honors) return a.is_honors ? -1 : 1
  return a.name.localeCompare(b.name)
}

export default async function CourseCataloguePage() {
  const courses = await listCourses()

  // Group active courses by department — which is exactly the
  // course-category id.
  const byCategory = new Map<CourseCategoryId, CourseRecord[]>()
  for (const course of courses) {
    if (!course.active) continue
    const dept = course.department as CourseCategoryId | null
    if (!dept) continue
    const arr = byCategory.get(dept) ?? []
    arr.push(course)
    byCategory.set(dept, arr)
  }
  for (const arr of byCategory.values()) arr.sort(sortForDisplay)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Course catalogue"
        subtitle="The full slate of courses offered at High Bluff Academy — every academic course satisfies UC A–G requirements."
        image="/images/programs/courses.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            One catalogue. On campus, online, or hybrid.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            HBA students choose from more than 70 courses across mathematics, science, language
            arts, social science, world languages, and electives — including 30+ AP and honors
            classes. The same catalogue serves our on-campus, hybrid, and online students.
            Courses noted as &ldquo;live instructor only&rdquo; are not available in self-paced
            format.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4 text-xs">
            {courseCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="inline-flex items-center px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-brand-navy font-semibold tracking-wide uppercase hover:bg-brand-navy hover:text-white hover:border-brand-navy transition"
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-16">
          {courseCategories.map((cat) => {
            const courses = byCategory.get(cat.id) ?? []
            if (courses.length === 0) return null
            return (
              <div key={cat.id} id={cat.id} className="scroll-mt-24">
                <div className="grid gap-10 lg:grid-cols-12 items-start">
                  <div className="lg:col-span-4 space-y-3">
                    <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
                      {cat.label}
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-extrabold text-brand-navy leading-tight">
                      {cat.label}
                    </h3>
                    <p className="text-gray-600 font-light leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="lg:col-span-8">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 shadow-sm">
                      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm text-gray-700">
                        {courses.map((c) => (
                          <li
                            key={c.code}
                            className="leading-snug flex gap-2 items-start"
                          >
                            <span className="text-brand-orange">•</span>
                            <span>
                              {c.name}
                              {(c.code === "ENG-APSEM" || c.code === "ENG-APRES") && (
                                <span className="text-xs text-gray-500"> (live instructor only)</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Find the right course load.
          </h2>
          <p className="text-lg text-white/90 font-light">
            Our admissions team can walk you through course selection, prerequisites, and the
            mix of on-campus, hybrid, and online options that fit your student best.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href={siteConfig.external.enrollment}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Apply now
            </Link>
            <Link
              href="/programs/online"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Online high school
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
