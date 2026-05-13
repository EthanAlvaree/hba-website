// Period-by-period availability for a single student. Reused by:
//   - /portal/trajectory (student edits themselves)
//   - /admin/students/[id] (admin edits on behalf of any student)
// Both surfaces post to the same server action, gated by either the
// signed-in student matching the target or the caller carrying admin.

import {
  buildStudentAvailabilityMap,
  type StudentAvailabilityRecord,
} from "@/lib/scheduler"
import { periodDisplayLabel } from "@/lib/scheduler"
import { sectionPeriodSchema } from "@/lib/sis"
import { saveStudentAvailabilityAction } from "@/app/portal/trajectory/actions"

export default function StudentAvailabilityCard({
  studentId,
  availability,
  asAdmin = false,
}: {
  studentId: string
  availability: StudentAvailabilityRecord[]
  asAdmin?: boolean
}) {
  const map = buildStudentAvailabilityMap(availability)
  const noteFromAny = availability.find((r) => r.notes)?.notes ?? ""

  const heading = asAdmin
    ? "Periods they can take a class"
    : "Periods I can take a class"
  const lead = asAdmin
    ? "Untick any period this student can't be scheduled into (commute, after-school activity, etc.). The scheduler treats unticked periods as off-limits when placing core graduation courses."
    : "Tick every period you can attend a class. Untick any you can't (commute, after-school activity, family obligation, etc.). The scheduler uses this when picking sections for you next year."

  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <div>
        <h2 className="text-lg font-extrabold text-brand-navy">{heading}</h2>
        <p className="mt-1 text-sm text-slate-600">{lead}</p>
      </div>

      <form action={saveStudentAvailabilityAction} className="space-y-3">
        <input type="hidden" name="student_id" value={studentId} />
        {asAdmin && <input type="hidden" name="admin" value="1" />}

        <ul className="grid gap-2 sm:grid-cols-2">
          {sectionPeriodSchema.options.map((period) => (
            <li
              key={period}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
            >
              <label className="flex items-center gap-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  name={`available_${period}`}
                  defaultChecked={map.get(period) ?? true}
                  className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                />
                <span>{periodDisplayLabel[period]}</span>
              </label>
            </li>
          ))}
        </ul>

        <label className="block space-y-1 text-xs font-medium text-slate-700">
          <span className="block">Notes (optional)</span>
          <textarea
            name="availability_notes"
            rows={2}
            maxLength={2000}
            defaultValue={noteFromAny ?? ""}
            placeholder={
              asAdmin
                ? "Anything the scheduler should know — Brynn has soccer practice 3:30 onward, etc."
                : "Anything the scheduler should know — practice every afternoon, family obligations, etc."
            }
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
        >
          Save availability
        </button>
      </form>
    </section>
  )
}
