"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { moveDraftAssignmentAction } from "./actions"

type Student = {
  id: string
  legal_first_name: string
  legal_last_name: string
  preferred_name: string | null
}

type Assignment = {
  id: string
  student: Student | null
}

export type BoardSection = {
  id: string
  course_id: string
  course_name: string
  course_code: string | null
  section_code: string | null
  period: string | null
  period_label: string
  teacher_label: string
  max_enrollment: number | null
  assignments: Assignment[]
}

export type BoardData = {
  draft_id: string
  draft_status: string
  /** Period code → label, ordered. We preserve the page's ordering. */
  periods: Array<{ key: string; label: string }>
  /** section.id → BoardSection */
  sections: BoardSection[]
}

function studentDisplay(s: Student | null): string {
  if (!s) return "(unknown)"
  const preferred = s.preferred_name?.trim()
  const legal = `${s.legal_first_name} ${s.legal_last_name}`.trim()
  return preferred ? `${preferred} (${legal})` : legal
}

export function DraftAssignmentsBoard({ data }: { data: BoardData }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [hoverSectionId, setHoverSectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const readOnly = data.draft_status === "committed" || data.draft_status === "discarded"

  // Group sections by period for the rendering layout.
  const sectionsByPeriod = new Map<string, BoardSection[]>()
  for (const section of data.sections) {
    const key = section.period ?? "__unscheduled__"
    const list = sectionsByPeriod.get(key) ?? []
    list.push(section)
    sectionsByPeriod.set(key, list)
  }

  // The course_id of the assignment currently being dragged — used to
  // disable drop targets for incompatible courses.
  const draggedSection = data.sections.find((section) =>
    section.assignments.some((a) => a.id === dragId)
  )
  const draggedCourseId = draggedSection?.course_id ?? null

  function handleDrop(targetSection: BoardSection) {
    if (!dragId) return
    setError(null)

    const sourceSection = data.sections.find((s) =>
      s.assignments.some((a) => a.id === dragId)
    )
    if (!sourceSection) return

    // Optimistic checks — gives an instant error instead of a server round trip.
    if (sourceSection.id === targetSection.id) {
      setDragId(null)
      setHoverSectionId(null)
      return
    }
    if (sourceSection.course_id !== targetSection.course_id) {
      setError(
        `Can't move a student between different courses (${sourceSection.course_name} → ${targetSection.course_name}).`
      )
      setDragId(null)
      setHoverSectionId(null)
      return
    }
    if (
      typeof targetSection.max_enrollment === "number" &&
      targetSection.assignments.length >= targetSection.max_enrollment
    ) {
      setError(
        `Target section is at max enrollment (${targetSection.max_enrollment}).`
      )
      setDragId(null)
      setHoverSectionId(null)
      return
    }

    const assignmentId = dragId
    setDragId(null)
    setHoverSectionId(null)

    startTransition(async () => {
      const result = await moveDraftAssignmentAction({
        draft_id: data.draft_id,
        assignment_id: assignmentId,
        target_section_id: targetSection.id,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Server action revalidated /admin/academics/scheduler; refresh the
      // route so the server-rendered board picks up the new state.
      router.refresh()
    })
  }

  return (
    <section className="space-y-3 rounded-[2rem] border border-brand-navy/15 bg-white px-6 py-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-brand-navy">
            Student assignments
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {readOnly
              ? "Read-only — this draft has been committed or discarded."
              : "Drag a student chip onto another section of the same course to reassign. Capacity and course constraints are enforced — invalid drops show an error."}
          </p>
        </div>
        {pending && (
          <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Saving…
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-900">
            Couldn&rsquo;t move that student.
          </p>
          <p className="mt-1 text-sm text-rose-800">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {data.periods.map((period) => {
          const periodSections = sectionsByPeriod.get(period.key) ?? []
          if (periodSections.length === 0) return null
          return (
            <div key={period.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {period.label}
              </p>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                {periodSections.map((section) => {
                  const isHover = hoverSectionId === section.id
                  const isSource = section.id === draggedSection?.id
                  // Highlight valid drop targets for the current drag, dim invalid ones.
                  const droppable =
                    dragId !== null &&
                    !isSource &&
                    section.course_id === draggedCourseId
                  const incompatible =
                    dragId !== null && !isSource && !droppable

                  return (
                    <div
                      key={section.id}
                      onDragOver={(event) => {
                        if (readOnly || !dragId) return
                        if (incompatible) return
                        event.preventDefault()
                        setHoverSectionId(section.id)
                      }}
                      onDragLeave={() => {
                        if (hoverSectionId === section.id) {
                          setHoverSectionId(null)
                        }
                      }}
                      onDrop={(event) => {
                        if (readOnly || !dragId) return
                        event.preventDefault()
                        handleDrop(section)
                      }}
                      className={`rounded-2xl border px-4 py-3 transition ${
                        isHover && droppable
                          ? "border-emerald-400 bg-emerald-50 shadow-md"
                          : droppable
                          ? "border-slate-300 bg-slate-50"
                          : incompatible
                          ? "border-slate-200 bg-slate-100 opacity-60"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {section.course_name}
                        </p>
                        {section.course_code && (
                          <code className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {section.course_code}
                          </code>
                        )}
                        {section.section_code && (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                            Sec {section.section_code}
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          · {section.teacher_label}
                        </span>
                        <span className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
                          {section.assignments.length}
                          {typeof section.max_enrollment === "number"
                            ? ` / ${section.max_enrollment}`
                            : ""}
                        </span>
                      </div>

                      {section.assignments.length === 0 ? (
                        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                          No students assigned.
                          {!readOnly && " Drop a student chip here."}
                        </p>
                      ) : (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {section.assignments.map((assignment) => {
                            const isDragging = dragId === assignment.id
                            return (
                              <li key={assignment.id}>
                                <span
                                  draggable={!readOnly}
                                  onDragStart={(event) => {
                                    if (readOnly) return
                                    setDragId(assignment.id)
                                    event.dataTransfer.effectAllowed = "move"
                                    // Some browsers require a payload.
                                    event.dataTransfer.setData(
                                      "text/plain",
                                      assignment.id
                                    )
                                  }}
                                  onDragEnd={() => {
                                    setDragId(null)
                                    setHoverSectionId(null)
                                  }}
                                  className={`inline-flex cursor-grab select-none rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                    isDragging
                                      ? "border-brand-orange bg-brand-orange/10 text-brand-orange opacity-50"
                                      : readOnly
                                      ? "border-slate-200 bg-white text-slate-700 cursor-default"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-navy/30 hover:bg-brand-navy/5 active:cursor-grabbing"
                                  }`}
                                >
                                  {studentDisplay(assignment.student)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
