"use client"

import { useEffect, useState } from "react"
import {
  deleteQualificationAction,
  saveQualificationOrderAction,
} from "./actions"

export type QualificationItem = {
  /** teacher_qualification.id — stable across reorders. */
  id: string
  course_id: string
  course_name: string
  course_code: string | null
  notes: string | null
}

type Props = {
  profileId: string
  initial: QualificationItem[]
}

export function QualificationsDragList({ profileId, initial }: Props) {
  const [items, setItems] = useState<QualificationItem[]>(initial)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [savingState, setSavingState] = useState<"idle" | "saving">("idle")

  // When the server data changes (e.g. after add / remove via the other
  // forms), reset our local state to the new snapshot.
  useEffect(() => {
    setItems(initial)
  }, [initial])

  const dirty = !sameOrder(items, initial)

  function moveItem(from: number, to: number) {
    setItems((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current
      }
      const next = current.slice()
      const [taken] = next.splice(from, 1)
      next.splice(to, 0, taken)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No qualifications listed yet. Add your first course below.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {items.map((item, index) => {
          const isBeingDragged = dragIndex === index
          const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index
          return (
            <li
              key={item.id}
              draggable
              onDragStart={(event) => {
                setDragIndex(index)
                event.dataTransfer.effectAllowed = "move"
                // Some browsers need a payload to enable the drag.
                event.dataTransfer.setData("text/plain", String(index))
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setOverIndex(index)
              }}
              onDragLeave={() => {
                if (overIndex === index) setOverIndex(null)
              }}
              onDrop={(event) => {
                event.preventDefault()
                if (dragIndex !== null) {
                  moveItem(dragIndex, index)
                }
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              className={`rounded-2xl border px-4 py-3 transition ${
                isBeingDragged
                  ? "border-brand-orange bg-brand-orange/10 opacity-60"
                  : isDropTarget
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="cursor-grab select-none text-slate-400 active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    ⋮⋮
                  </span>
                  <span className="rounded-full border border-brand-navy/20 bg-white px-2.5 py-0.5 text-xs font-semibold text-brand-navy">
                    #{index + 1}
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.course_name}
                    {item.course_code && (
                      <code className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {item.course_code}
                      </code>
                    )}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                  )}
                </div>

                {/* Remove still goes through its own server action so the
                    user doesn't have to commit the order to remove one. */}
                <form action={deleteQualificationAction}>
                  <input type="hidden" name="profile_id" value={profileId} />
                  <input type="hidden" name="course_id" value={item.course_id} />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          )
        })}
      </ul>

      <form
        action={saveQualificationOrderAction}
        onSubmit={() => setSavingState("saving")}
        className="flex flex-wrap items-center justify-between gap-3 pt-1"
      >
        <input type="hidden" name="profile_id" value={profileId} />
        {items.map((item) => (
          <input
            key={item.id}
            type="hidden"
            name="ordered_course_ids"
            value={item.course_id}
          />
        ))}

        <p className="text-xs text-slate-500">
          {dirty
            ? "Order changed — click Save to commit the new ranking."
            : "Drag any row to reorder, then Save."}
        </p>
        <button
          type="submit"
          disabled={!dirty || savingState === "saving"}
          className="inline-flex items-center justify-center rounded-full bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingState === "saving" ? "Saving…" : "Save order"}
        </button>
      </form>
    </div>
  )
}

function sameOrder(a: QualificationItem[], b: QualificationItem[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].course_id !== b[i].course_id) return false
  }
  return true
}
