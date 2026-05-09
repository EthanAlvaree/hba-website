// app/calendar/InteractiveCalendar.tsx
"use client"

import { useMemo, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg } from "@fullcalendar/core"
import { SchoolEvent, effectiveEnd } from "@/lib/events"
import { categories, categoryList, CategoryKey } from "@/lib/categories"

interface Props {
  events: SchoolEvent[]
}

interface SelectedEvent {
  title: string
  category: CategoryKey
  start: string
  end: string
  description?: string
  location?: string
}

function formatRange(startISO: string, endISO: string, allDay: boolean): string {
  const start = new Date(startISO)
  const end = new Date(endISO)
  if (allDay) {
    // end is exclusive — back up one day for display
    end.setDate(end.getDate() - 1)
  }
  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }
  return `${start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} – ${end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`
}

export default function InteractiveCalendar({ events }: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(categoryList.map((c) => c.key)),
  )
  const [selected, setSelected] = useState<SelectedEvent | null>(null)

  const fcEvents = useMemo(
    () =>
      events
        .filter((ev) => activeCategories.has(ev.category))
        .map((ev) => {
          const cat = categories[ev.category]
          return {
            id: ev.id,
            title: ev.title,
            start: ev.start,
            end: ev.end ?? effectiveEnd(ev),
            allDay: ev.allDay ?? true,
            backgroundColor: cat.color,
            borderColor: cat.color,
            textColor: "#ffffff",
            extendedProps: {
              category: ev.category,
              location: ev.location,
              description: ev.description,
            },
          }
        }),
    [events, activeCategories],
  )

  function toggleCategory(key: CategoryKey) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleEventClick(arg: EventClickArg) {
    const ext = arg.event.extendedProps as {
      category: CategoryKey
      location?: string
      description?: string
    }
    setSelected({
      title: arg.event.title,
      category: ext.category,
      start: arg.event.startStr,
      end: arg.event.endStr || arg.event.startStr,
      location: ext.location,
      description: ext.description,
    })
  }

  return (
    <section
      id="calendar"
      className="py-24 bg-gray-50 scroll-mt-32"
    >
      <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Full calendar
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
              Browse the year.
            </h2>
            <p className="text-base text-gray-600 leading-relaxed font-light">
              Switch between month and list views, filter by category, and tap any
              event for details.
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-3">
          {categoryList.map((cat) => {
            const isActive = activeCategories.has(cat.key)
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleCategory(cat.key)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
                  isActive
                    ? "text-white shadow-sm"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                }`}
                style={
                  isActive
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : undefined
                }
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isActive ? "#ffffff" : cat.color,
                  }}
                />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
          <FullCalendar
            plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,listMonth",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              list: "List",
            }}
            events={fcEvents}
            eventClick={handleEventClick}
            height="auto"
            firstDay={0}
            displayEventTime={false}
            dayMaxEventRows={3}
            fixedWeekCount={false}
          />
        </div>
      </div>

      {/* Event detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white max-w-md w-full rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-8 py-6 text-white"
              style={{ backgroundColor: categories[selected.category].color }}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase opacity-90">
                {categories[selected.category].label}
              </div>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight">
                {selected.title}
              </h3>
            </div>
            <div className="p-8 space-y-3">
              <p className="text-sm font-semibold text-brand-navy">
                {formatRange(selected.start, selected.end, true)}
              </p>
              {selected.location && (
                <p className="text-sm text-gray-600">{selected.location}</p>
              )}
              {selected.description && (
                <p className="text-sm text-gray-600 leading-relaxed mt-3">
                  {selected.description}
                </p>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-4 inline-flex items-center justify-center px-5 py-2 rounded-full bg-brand-navy text-white text-xs font-semibold hover:bg-brand-orange transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
