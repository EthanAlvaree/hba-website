// Academic history card — transfer / external coursework for one student.
//
// Renders on the admin student-detail page. Each entry is editable in
// place; the add form lives in a collapsed <details> at the bottom.
// Everything posts to the academic-history server actions, which
// audit-log and revalidate the transcript + trajectory.

import {
  academicHistoryGradeLetters,
  academicHistorySourceLabels,
  academicHistorySources,
  type AcademicHistoryRecord,
} from "@/lib/academic-history"
import { subjectAreaLabel, subjectAreas } from "@/lib/scheduler"
import type { CourseRecord } from "@/lib/sis"
import {
  addAcademicHistoryAction,
  deleteAcademicHistoryAction,
  updateAcademicHistoryAction,
} from "../actions"

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
const labelClass = "space-y-1 text-xs font-medium text-slate-700"

function AcademicHistoryFields({
  entry,
  courses,
}: {
  entry?: AcademicHistoryRecord
  courses: CourseRecord[]
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${labelClass} sm:col-span-2`}>
          <span className="block">Course title (as named at the prior school)</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={entry?.title ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className="block">School name</span>
          <input
            name="school_name"
            required
            maxLength={200}
            defaultValue={entry?.school_name ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className="block">Source</span>
          <select
            name="source"
            defaultValue={entry?.source ?? "transfer"}
            className={`${inputClass} bg-white`}
          >
            {academicHistorySources.map((s) => (
              <option key={s} value={s}>
                {academicHistorySourceLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className="block">Academic year</span>
          <input
            name="academic_year"
            maxLength={40}
            placeholder="2023-24"
            defaultValue={entry?.academic_year ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className="block">Term label (optional)</span>
          <input
            name="term_label"
            maxLength={60}
            placeholder="Full year, Semester 1, etc."
            defaultValue={entry?.term_label ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className="block">Grade</span>
          <select
            name="grade_letter"
            defaultValue={entry?.grade_letter ?? ""}
            className={`${inputClass} bg-white`}
          >
            <option value="">— (in progress / ungraded)</option>
            {academicHistoryGradeLetters.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className="block">Credits</span>
          <input
            name="credits"
            type="number"
            step="0.5"
            min="0"
            max="20"
            defaultValue={entry?.credits ?? 1}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className="block">Counts toward graduation requirement</span>
          <select
            name="subject_area"
            defaultValue={entry?.subject_area ?? ""}
            className={`${inputClass} bg-white`}
          >
            <option value="">— Not tracked</option>
            {subjectAreas.map((area) => (
              <option key={area} value={area}>
                {subjectAreaLabel(area)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className="block">Articulates to HBA course (optional)</span>
          <select
            name="course_id"
            defaultValue={entry?.course_id ?? ""}
            className={`${inputClass} bg-white`}
          >
            <option value="">— None</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_ap"
            defaultChecked={entry?.is_ap ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>AP (weighted +1.0)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_honors"
            defaultChecked={entry?.is_honors ?? false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Honors (weighted +0.5)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="counts_toward_gpa"
            defaultChecked={entry?.counts_toward_gpa ?? true}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <span>Counts toward GPA (uncheck for Pass / credit-only)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="superseded"
            defaultChecked={entry?.superseded ?? false}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          <span>Retaken at HBA (excluded from GPA + credit)</span>
        </label>
      </div>

      <label className={labelClass}>
        <span className="block">Notes (optional)</span>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={entry?.notes ?? ""}
          className={inputClass}
        />
      </label>
    </>
  )
}

export default function AcademicHistoryCard({
  studentId,
  entries,
  courses,
  hbaCourseIds,
  error,
}: {
  studentId: string
  entries: AcademicHistoryRecord[]
  courses: CourseRecord[]
  /** Course ids the student has an HBA enrollment for. An entry that
   *  articulates to one of these and isn't yet marked superseded is
   *  probably the original attempt of a course retaken at HBA. */
  hbaCourseIds: Set<string>
  error?: string
}) {
  const sortedCourses = [...courses].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <section
      id="academic-history"
      className="scroll-mt-24 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm"
    >
      <h3 className="text-lg font-extrabold text-brand-navy">
        Academic history
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Coursework completed at another school — transfer credit, summer
        school, or concurrent enrollment. These are <strong>not</strong> HBA
        enrollments: the scheduler never sees them and HBA never re-grades
        them. They appear in their own transcript section and fold into the{" "}
        <strong>cumulative</strong> GPA (the HBA-only GPA ignores them). A
        course retaken at HBA should have its original entry marked{" "}
        <strong>Retaken at HBA</strong> so the failing attempt drops out of
        the cumulative GPA.
      </p>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm italic text-slate-500">
          No transfer or external coursework on record.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((entry) => {
            const looksLikeRetake =
              entry.course_id != null &&
              hbaCourseIds.has(entry.course_id) &&
              !entry.superseded
            return (
            <li key={entry.id}>
              <details className="rounded-2xl border border-slate-200 bg-slate-50/60">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-900">
                    {entry.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {entry.school_name}
                    {entry.academic_year ? ` · ${entry.academic_year}` : ""}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {entry.grade_letter ?? "—"} · {entry.credits} cr
                  </span>
                  {entry.is_ap && (
                    <span className="rounded-full border border-brand-orange/30 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
                      AP
                    </span>
                  )}
                  {entry.is_honors && !entry.is_ap && (
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                      Honors
                    </span>
                  )}
                  {entry.superseded && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                      Retaken at HBA
                    </span>
                  )}
                  {!entry.counts_toward_gpa && !entry.superseded && (
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Credit only
                    </span>
                  )}
                </summary>

                <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                  {looksLikeRetake && (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                      This student has an HBA enrollment for the articulated
                      course. If this entry is the original attempt they
                      retook at HBA, check <strong>Retaken at HBA</strong> so
                      it drops out of the cumulative GPA and credit totals.
                    </p>
                  )}
                  <form
                    action={updateAcademicHistoryAction}
                    className="space-y-4"
                  >
                    <input type="hidden" name="id" value={entry.id} />
                    <input
                      type="hidden"
                      name="student_id"
                      value={studentId}
                    />
                    <AcademicHistoryFields
                      entry={entry}
                      courses={sortedCourses}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                    >
                      Save changes
                    </button>
                  </form>

                  <form action={deleteAcademicHistoryAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input
                      type="hidden"
                      name="student_id"
                      value={studentId}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete entry
                    </button>
                  </form>
                </div>
              </details>
            </li>
            )
          })}
        </ul>
      )}

      <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-brand-navy">
          + Add transfer / external coursework
        </summary>
        <form
          action={addAcademicHistoryAction}
          className="space-y-4 border-t border-slate-200 px-4 py-4"
        >
          <input type="hidden" name="student_id" value={studentId} />
          <AcademicHistoryFields courses={sortedCourses} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
          >
            Add entry
          </button>
        </form>
      </details>
    </section>
  )
}
