import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { listCourses, type CourseRecord } from "@/lib/sis"
import AcademicsHeader from "../AcademicsHeader"
import { createCourseAction, updateCourseAction } from "../actions"

export const dynamic = "force-dynamic"

const gradeLevelOptions = ["6", "7", "8", "9", "10", "11", "12"] as const

export default async function CoursesPage() {
  const session = await auth()
  if (!session?.isAdmin) {
    redirect("/admin/sign-in")
  }

  const courses = await listCourses()

  return (
    <div className="space-y-6">
        <AcademicsHeader active="courses" />

        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-brand-navy">Add a course</h2>
          <p className="mt-1 text-sm text-slate-600">
            Catalog entries are the abstract course (English 9, AP Calc AB).
            Sections &mdash; a specific offering in a term with a teacher and
            period &mdash; come next.
          </p>

          <form action={createCourseAction} className="mt-6 space-y-4">
            <CourseFormFields />
            <div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Create course
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          {courses.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-600 shadow-sm">
              No courses yet. Add the first one above.
            </div>
          ) : (
            courses.map((course) => (
              <details
                key={course.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition open:border-brand-navy/15 open:shadow-md"
              >
                <summary className="list-none cursor-pointer px-5 py-4 sm:px-6">
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_auto] lg:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-brand-navy">
                          {course.name}
                        </h3>
                        <code className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {course.code}
                        </code>
                        {course.is_ap && (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                            AP
                          </span>
                        )}
                        {course.is_honors && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                            Honors
                          </span>
                        )}
                        {course.is_elective && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                            Elective
                          </span>
                        )}
                        {!course.active && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {[course.subject, course.department].filter(Boolean).join(" · ")}
                        {course.grade_levels.length > 0 && (
                          <>
                            {course.subject || course.department ? " · " : ""}
                            Grades {course.grade_levels.join(", ")}
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {Number(course.credit_hours).toFixed(2)} credit hours
                    </p>
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition">
                      Edit
                    </span>
                  </div>
                </summary>

                <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
                  <form action={updateCourseAction} className="space-y-4">
                    <input type="hidden" name="id" value={course.id} />
                    <CourseFormFields defaults={course} />
                    <div>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                      >
                        Save changes
                      </button>
                    </div>
                  </form>
                </div>
              </details>
            ))
          )}
        </section>
    </div>
  )
}

function CourseFormFields({ defaults }: { defaults?: CourseRecord } = {}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Code</span>
        <input
          name="code"
          required
          defaultValue={defaults?.code ?? ""}
          placeholder="ENG-9"
          pattern="[A-Z0-9-]+"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 font-mono"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
        <span className="block">Name</span>
        <input
          name="name"
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="English 9"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Subject</span>
        <input
          name="subject"
          defaultValue={defaults?.subject ?? ""}
          placeholder="English"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Department</span>
        <input
          name="department"
          defaultValue={defaults?.department ?? ""}
          placeholder="Humanities"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Credit hours</span>
        <input
          name="credit_hours"
          type="number"
          step="0.25"
          min="0"
          defaultValue={defaults?.credit_hours ?? 1.0}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
        <span className="block">Description (optional)</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? ""}
          placeholder="Short description shown to families and on transcripts."
          className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <fieldset className="sm:col-span-2 lg:col-span-3 space-y-2 text-sm font-medium text-slate-700">
        <legend className="block">Grade levels</legend>
        <div className="flex flex-wrap gap-3">
          {gradeLevelOptions.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="grade_levels"
                value={level}
                defaultChecked={defaults?.grade_levels.includes(level) ?? false}
                className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
              />
              <span>Grade {level}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-6 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_ap"
            defaultChecked={defaults?.is_ap ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>AP</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_honors"
            defaultChecked={defaults?.is_honors ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Honors</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_elective"
            defaultChecked={defaults?.is_elective ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Elective</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults?.active ?? true}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Active in catalog</span>
        </label>
      </div>
    </div>
  )
}
