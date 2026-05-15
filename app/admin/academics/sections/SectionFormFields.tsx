import {
  facultyLabel,
  type CourseRecord,
  type CourseSectionRecord,
  type FacultyOption,
  type SectionModality,
  type SectionPeriod,
  type TermRecord,
} from "@/lib/sis"

export const periodOptions: Array<{ value: SectionPeriod; label: string }> = [
  { value: "period_1", label: "Period 1 (Mon-Thu 8:30-9:30)" },
  { value: "period_2", label: "Period 2 (Mon-Thu 9:35-10:35)" },
  { value: "period_3", label: "Period 3 (Mon-Thu 10:40-11:40)" },
  { value: "period_4", label: "Period 4 (Mon-Thu 12:25-1:25)" },
  { value: "period_5", label: "Period 5 (Mon/Wed 1:30-3:00, Fri 12:55-1:55)" },
  { value: "period_6", label: "Period 6 (Tue/Thu 1:30-3:00, Fri 2:00-3:00)" },
  { value: "elective_1", label: "Elective 1 (Fri 8:30-10:15)" },
  { value: "elective_2", label: "Elective 2 (Fri 10:20-12:05)" },
  { value: "async", label: "Online async (no fixed meeting time)" },
]

export const modalityOptions: Array<{ value: SectionModality; label: string }> = [
  { value: "in_person", label: "In person" },
  { value: "online_async", label: "Online (async)" },
  { value: "online_sync", label: "Online (synchronous)" },
  { value: "hybrid", label: "Hybrid" },
]

export function periodLabel(period: SectionPeriod | null): string {
  if (!period) return "Unscheduled"
  return periodOptions.find((option) => option.value === period)?.label ?? period
}

export function modalityLabel(modality: SectionModality): string {
  return modalityOptions.find((option) => option.value === modality)?.label ?? modality
}

export default function SectionFormFields({
  courses,
  terms,
  faculty,
  defaults,
}: {
  courses: CourseRecord[]
  terms: TermRecord[]
  faculty: FacultyOption[]
  defaults?: CourseSectionRecord
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Course</span>
        <select
          name="course_id"
          required
          defaultValue={defaults?.course_id ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Pick a course…</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Term</span>
        <select
          name="term_id"
          required
          defaultValue={defaults?.term_id ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Pick a term…</option>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
              {term.is_current ? " (current)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Teacher</span>
        <select
          name="teacher_profile_id"
          defaultValue={defaults?.teacher_profile_id ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Unassigned</option>
          {faculty.map((option) => (
            <option key={option.id} value={option.id}>
              {facultyLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Section code (optional)</span>
        <input
          name="section_code"
          maxLength={20}
          defaultValue={defaults?.section_code ?? ""}
          placeholder="A, B, 01, etc."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Period</span>
        <select
          name="period"
          defaultValue={defaults?.period ?? ""}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="">Unscheduled</option>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Room (optional)</span>
        <input
          name="room"
          maxLength={40}
          defaultValue={defaults?.room ?? ""}
          placeholder="Library, Lab 2, etc."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Max enrollment (optional)</span>
        <input
          name="max_enrollment"
          type="number"
          min="1"
          defaultValue={defaults?.max_enrollment ?? ""}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span className="block">Modality</span>
        <select
          name="modality"
          defaultValue={defaults?.modality ?? "in_person"}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
        >
          {modalityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
        <span className="block">Notes (optional)</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          placeholder="Anything specific to this section — co-teachers, lab requirements, etc."
          className="w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
        />
      </label>
    </div>
  )
}
