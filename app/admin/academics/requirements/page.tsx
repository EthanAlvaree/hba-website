// Graduation Requirements — one card per subject area.
//
// Each card carries that subject's credit requirements (basic diploma
// + college-bound), the grades it applies to, notes, AND the list of
// courses that count toward it. A course can live in several cards at
// once (Studio Art = Visual & Performing Arts + Elective).
//
// The Elective card is special: a course's membership there is what
// makes it Friday-elective-only in the scheduler. Drop a course from
// Elective and it becomes weekday-schedulable.

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listCourseSubjectAssignments,
  listGraduationRequirements,
  subjectAreaLabel,
  subjectAreas,
  type GraduationRequirementRecord,
  type SubjectArea,
} from "@/lib/scheduler"
import { listCourses, type CourseRecord } from "@/lib/sis"
import AcademicsHeader from "../AcademicsHeader"
import {
  addCourseToSubjectAction,
  removeCourseFromSubjectAction,
  saveRequirementAction,
} from "./actions"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<{ saved?: string }>
}

const gradeLevelOptions = ["6", "7", "8", "9", "10", "11", "12"] as const

export default async function GraduationRequirementsPage({
  searchParams,
}: PageProps) {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const raw = await searchParams

  const [requirements, courses, assignments] = await Promise.all([
    listGraduationRequirements(),
    listCourses(),
    listCourseSubjectAssignments(),
  ])

  const requirementBySubject = new Map<string, GraduationRequirementRecord>()
  for (const r of requirements) requirementBySubject.set(r.subject_area, r)

  const coursesById = new Map(courses.map((c) => [c.id, c]))
  // subject_area → courses in it
  const coursesBySubject = new Map<string, CourseRecord[]>()
  for (const a of assignments) {
    const course = coursesById.get(a.course_id)
    if (!course) continue
    const arr = coursesBySubject.get(a.subject_area) ?? []
    arr.push(course)
    coursesBySubject.set(a.subject_area, arr)
  }
  for (const arr of coursesBySubject.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name))
  }

  const activeCourses = courses
    .filter((c) => c.active)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <AcademicsHeader active="requirements" />

      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-2xl font-extrabold text-brand-navy">
          Graduation requirements
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          One card per subject area. Set how many credits each track
          needs, then list the courses that count toward it — a course
          can belong to more than one card. The{" "}
          <strong>Elective</strong> card doubles as the scheduler&rsquo;s
          Friday signal: courses in it are scheduled only in the Friday
          elective periods; remove a course and it becomes
          weekday-schedulable.
        </p>
      </section>

      {raw.saved === "1" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
          Saved.
        </section>
      )}

      <div className="space-y-5">
        {subjectAreas.map((area) => (
          <SubjectCard
            key={area}
            area={area}
            requirement={requirementBySubject.get(area) ?? null}
            coursesInSubject={coursesBySubject.get(area) ?? []}
            allActiveCourses={activeCourses}
          />
        ))}
      </div>
    </div>
  )
}

function SubjectCard({
  area,
  requirement,
  coursesInSubject,
  allActiveCourses,
}: {
  area: SubjectArea
  requirement: GraduationRequirementRecord | null
  coursesInSubject: CourseRecord[]
  allActiveCourses: CourseRecord[]
}) {
  const isElective = area === "elective"
  const inSubjectIds = new Set(coursesInSubject.map((c) => c.id))
  const addableCourses = allActiveCourses.filter((c) => !inSubjectIds.has(c.id))

  return (
    <section
      id={`subject-${area}`}
      className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-extrabold text-brand-navy">
          {subjectAreaLabel(area)}
        </h3>
        <span className="text-xs text-slate-500">
          {coursesInSubject.length}{" "}
          {coursesInSubject.length === 1 ? "course" : "courses"}
        </span>
      </div>

      {isElective && (
        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <strong>Scheduling note:</strong> every course listed here is
          treated as Friday-elective-only by the scheduler — it&rsquo;ll
          never be placed in a Mon–Thu period. To make a course
          weekday-schedulable, remove it from this list.
        </p>
      )}

      {/* Credit requirements form */}
      <form
        action={saveRequirementAction}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="subject_area" value={area} />

        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Required credits — basic diploma</span>
          <input
            name="required_credits_basic"
            type="number"
            step="0.5"
            min="0"
            max="20"
            defaultValue={requirement?.required_credits_basic ?? 0}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Required credits — college-bound</span>
          <input
            name="required_credits_college_bound"
            type="number"
            step="0.5"
            min="0"
            max="20"
            defaultValue={requirement?.required_credits_college_bound ?? 0}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <fieldset className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
          <legend className="block">
            Applies to grades (leave all unchecked = all grades)
          </legend>
          <div className="flex flex-wrap gap-2">
            {gradeLevelOptions.map((level) => (
              <label
                key={level}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="applies_to_grade_levels"
                  value={level}
                  defaultChecked={
                    requirement?.applies_to_grade_levels.includes(level) ??
                    false
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="space-y-1 text-xs font-medium text-slate-700 sm:col-span-2">
          <span className="block">Notes (optional)</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={requirement?.notes ?? ""}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Save {subjectAreaLabel(area).toLowerCase()} requirements
          </button>
        </div>
      </form>

      {/* Courses in this subject area */}
      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Courses that count toward this requirement
        </p>

        {coursesInSubject.length === 0 ? (
          <p className="mt-2 text-sm italic text-slate-400">
            No courses tagged yet — add some below.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {coursesInSubject.map((course) => (
              <li key={course.id}>
                <form
                  action={removeCourseFromSubjectAction}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm text-slate-800"
                >
                  <input type="hidden" name="subject_area" value={area} />
                  <input
                    type="hidden"
                    name="course_id"
                    value={course.id}
                  />
                  <span>
                    {course.name}
                    {course.is_ap && (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-orange">
                        AP
                      </span>
                    )}
                    {course.is_honors && !course.is_ap && (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-700">
                        H
                      </span>
                    )}
                  </span>
                  <button
                    type="submit"
                    aria-label={`Remove ${course.name}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-rose-600 transition hover:bg-rose-100"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* Add a course to this subject area */}
        {addableCourses.length > 0 && (
          <form
            action={addCourseToSubjectAction}
            className="mt-3 flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="subject_area" value={area} />
            <label className="space-y-1 text-xs font-medium text-slate-700">
              <span className="block">Add a course</span>
              <select
                name="course_id"
                required
                defaultValue=""
                className="min-w-[20rem] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Search the catalogue…</option>
                {addableCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-brand-navy/30 bg-white px-4 py-2 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
            >
              Add to {subjectAreaLabel(area).toLowerCase()}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
