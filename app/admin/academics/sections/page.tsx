import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listCourseSections,
  listCourses,
  listFaculty,
  listTerms,
  type CourseSectionRecord,
} from "@/lib/sis"
import AcademicsHeader from "../AcademicsHeader"
import { createSectionAction } from "../actions"
import SectionFormFields, { modalityLabel, periodLabel } from "./SectionFormFields"

export const dynamic = "force-dynamic"

function teacherDisplay(section: CourseSectionRecord): string {
  const teacher = section.teacher
  if (!teacher) return "Unassigned"
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(" ").trim()
  return full || teacher.display_name || teacher.email
}

export default async function CourseSectionsPage() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const [sections, courses, terms, faculty] = await Promise.all([
    listCourseSections(),
    listCourses(),
    listTerms(),
    listFaculty(),
  ])

  const activeCourses = courses.filter((course) => course.active)
  const canCreate = activeCourses.length > 0 && terms.length > 0

  return (
    <div className="space-y-6">
        <AcademicsHeader active="sections" />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-brand-navy">Add a section</h2>
          <p className="mt-1 text-sm text-slate-600">
            A section is a specific offering of a course in a term &mdash; with a
            teacher, a bell-schedule period, and a room. Click a section below to
            manage its roster.
          </p>

          {!canCreate ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {terms.length === 0 && activeCourses.length === 0
                ? "Add at least one term and one active course before creating sections."
                : terms.length === 0
                ? "Add at least one term before creating sections."
                : "Add at least one active course before creating sections."}
            </div>
          ) : (
            <form action={createSectionAction} className="mt-6 space-y-4">
              <SectionFormFields
                courses={activeCourses}
                terms={terms}
                faculty={faculty}
              />
              <div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                >
                  Create section
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="space-y-4">
          {sections.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No sections yet. Once you create one, you can enroll students into
              it from its detail page.
            </div>
          ) : (
            sections.map((section) => (
              <Link
                key={section.id}
                href={`/admin/academics/sections/${section.id}`}
                className="block rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-navy/30 hover:shadow-md sm:px-6"
              >
                <div className="grid gap-2 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.4fr)_auto] lg:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-brand-navy">
                        {section.course.name}
                      </h3>
                      <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {section.course.code}
                      </code>
                      {section.section_code && (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          Section {section.section_code}
                        </span>
                      )}
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                        {section.term.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {periodLabel(section.period)} &middot;{" "}
                      {modalityLabel(section.modality)}
                      {section.room && <> &middot; Room {section.room}</>}
                      {typeof section.max_enrollment === "number" && (
                        <> &middot; Cap {section.max_enrollment}</>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Teacher: <span className="font-semibold text-slate-800">{teacherDisplay(section)}</span>
                  </p>
                  <span className="inline-flex items-center rounded-full border border-brand-navy/20 px-3 py-1 text-xs font-semibold text-brand-navy">
                    Manage →
                  </span>
                </div>
              </Link>
            ))
          )}
        </section>
    </div>
  )
}
