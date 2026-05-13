import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  listCourseSubjectAssignments,
  listGraduationRequirements,
  subjectAreaLabel,
  subjectAreas,
  type GraduationRequirementRecord,
  type GraduationRequirementTrack,
} from "@/lib/scheduler"
import { listCourses, type CourseRecord } from "@/lib/sis"
import AcademicsHeader from "../AcademicsHeader"
import {
  deleteRequirementAction,
  saveRequirementAction,
  setCourseSubjectAction,
} from "./actions"

export const dynamic = "force-dynamic"

const gradeLevelOptions = ["6", "7", "8", "9", "10", "11", "12"] as const

function trackLabel(track: GraduationRequirementTrack): string {
  if (track === "basic") return "Basic diploma"
  if (track === "college_bound") return "College-bound"
  return "Both tracks"
}

function trackBadgeClass(track: GraduationRequirementTrack): string {
  const base =
    "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
  if (track === "basic") {
    return `${base} border border-amber-200 bg-amber-50 text-amber-800`
  }
  if (track === "college_bound") {
    return `${base} border border-sky-200 bg-sky-50 text-sky-700`
  }
  return `${base} border border-slate-200 bg-slate-100 text-slate-700`
}

export default async function GraduationRequirementsPage() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const [requirements, courses, assignments] = await Promise.all([
    listGraduationRequirements(),
    listCourses(),
    listCourseSubjectAssignments(),
  ])

  const subjectByCourse = new Map<string, string>()
  for (const a of assignments) subjectByCourse.set(a.course_id, a.subject_area)

  return (
    <div className="space-y-6">
        <AcademicsHeader active="requirements" />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-2xl font-extrabold text-brand-navy">
            Graduation requirements
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Define how many credits each subject area is required for
            graduation. The scheduler honors these when proposing schedules,
            and the future transcript view will show progress against them.
            Tag each course with a subject area below so the system knows
            what each course satisfies.
          </p>
        </section>

        {/* Requirements list ------------------------------------------------ */}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">Add a requirement</h3>
          <form action={saveRequirementAction} className="mt-4 space-y-3">
            <RequirementFields />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
            >
              Add requirement
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {requirements.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No requirements defined yet. Start by adding e.g. &ldquo;4 years
              of English&rdquo; for grades 9-12.
            </div>
          ) : (
            requirements.map((req) => (
              <details
                key={req.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
              >
                <summary className="cursor-pointer list-none px-5 py-4 sm:px-6">
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {req.name}
                        </h3>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {subjectAreaLabel(req.subject_area)}
                        </span>
                        <span className={trackBadgeClass(req.track)}>
                          {trackLabel(req.track)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {Number(req.required_credits).toFixed(2)} credits required
                        {req.applies_to_grade_levels.length > 0 && (
                          <> &middot; Grades {req.applies_to_grade_levels.join(", ")}</>
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {req.notes ? req.notes.slice(0, 80) : ""}
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Edit
                    </span>
                  </div>
                </summary>

                <div className="space-y-4 border-t border-slate-200 px-5 py-5">
                  <form action={saveRequirementAction} className="space-y-3">
                    <input type="hidden" name="id" value={req.id} />
                    <RequirementFields defaults={req} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                    >
                      Save changes
                    </button>
                  </form>

                  <form action={deleteRequirementAction}>
                    <input type="hidden" name="id" value={req.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete requirement
                    </button>
                  </form>
                </div>
              </details>
            ))
          )}
        </section>

        {/* Course → subject area mapping ----------------------------------- */}

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-brand-navy">
            Course subject area
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Tag each course with the subject area it satisfies. Untagged
            courses don&rsquo;t count toward any graduation requirement.
            Update inline and click Save next to each row.
          </p>

          <div className="mt-4 space-y-2">
            {courses
              .filter((c) => c.active)
              .map((course) => (
                <CourseSubjectRow
                  key={course.id}
                  course={course}
                  currentSubject={subjectByCourse.get(course.id) ?? ""}
                />
              ))}
          </div>
        </section>
    </div>
  )
}

function CourseSubjectRow({
  course,
  currentSubject,
}: {
  course: CourseRecord
  currentSubject: string
}) {
  return (
    <form
      action={setCourseSubjectAction}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] sm:items-center"
    >
      <input type="hidden" name="course_id" value={course.id} />
      <div>
        <p className="text-sm font-semibold text-slate-900">{course.name}</p>
        <p className="text-xs text-slate-500">
          <code>{course.code}</code>
          {course.subject && <> &middot; Catalog subject: {course.subject}</>}
        </p>
      </div>

      <select
        name="subject_area"
        defaultValue={currentSubject}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        <option value="">(not tagged)</option>
        {subjectAreas.map((area) => (
          <option key={area} value={area}>
            {subjectAreaLabel(area)}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Save
      </button>
    </form>
  )
}

function RequirementFields({ defaults }: { defaults?: GraduationRequirementRecord }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Name</span>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="4 years of English"
          maxLength={120}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Subject area</span>
        <select
          name="subject_area"
          required
          defaultValue={defaults?.subject_area ?? "english"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          {subjectAreas.map((area) => (
            <option key={area} value={area}>
              {subjectAreaLabel(area)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Diploma track</span>
        <select
          name="track"
          defaultValue={defaults?.track ?? "all"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="all">Both tracks</option>
          <option value="basic">Basic diploma</option>
          <option value="college_bound">College-bound</option>
        </select>
      </label>

      <label className="space-y-1 text-xs font-medium text-slate-700">
        <span className="block">Required credits</span>
        <input
          name="required_credits"
          type="number"
          step="0.5"
          min="0"
          defaultValue={defaults?.required_credits ?? 0}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>

      <fieldset className="space-y-1 text-xs font-medium text-slate-700">
        <legend className="block">Applies to grades (leave blank = all)</legend>
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
                defaultChecked={defaults?.applies_to_grade_levels.includes(level) ?? false}
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
          defaultValue={defaults?.notes ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </label>
    </div>
  )
}
