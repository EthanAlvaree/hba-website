// app/calendar/UpcomingEvents.tsx

import { SchoolEvent, effectiveEnd } from "@/lib/events"
import { categories } from "@/lib/categories"

interface Props {
  events: SchoolEvent[]
}

const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00")
}

function spanLabel(ev: SchoolEvent): string {
  const start = parseDate(ev.start)
  // effectiveEnd is the day AFTER the last day; subtract 1 for the inclusive last day
  const lastInclusive = parseDate(effectiveEnd(ev))
  lastInclusive.setDate(lastInclusive.getDate() - 1)

  const sameDay = start.toDateString() === lastInclusive.toDateString()
  if (sameDay) {
    return start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }
  const sameMonth =
    start.getFullYear() === lastInclusive.getFullYear() &&
    start.getMonth() === lastInclusive.getMonth()
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })} – ${lastInclusive.getDate()}`
  }
  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${lastInclusive.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`
}

export default function UpcomingEvents({ events }: Props) {
  return (
    <section className="py-24 bg-white">
      <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Coming up
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
              What’s next at HBA.
            </h2>
            <p className="text-base text-gray-600 leading-relaxed font-light">
              The next few dates on our calendar — at a glance.
            </p>
          </div>
          <a
            href="#calendar"
            className="text-sm font-semibold text-brand-navy hover:text-brand-orange transition-colors"
          >
            See full calendar →
          </a>
        </div>

        {events.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center">
            <p className="text-gray-600 font-light">
              No upcoming events on the calendar right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {events.map((ev) => {
              const cat = categories[ev.category]
              const start = parseDate(ev.start)
              return (
                <article
                  key={ev.id}
                  className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
                >
                  <div
                    className="px-6 pt-6 pb-4 text-white relative"
                    style={{ backgroundColor: cat.color }}
                  >
                    <div className="text-xs font-bold tracking-widest uppercase opacity-80">
                      {monthShort[start.getMonth()]}
                    </div>
                    <div className="text-5xl font-extrabold leading-none mt-1">
                      {start.getDate()}
                    </div>
                    <div className="mt-3 text-[10px] font-bold tracking-widest uppercase opacity-90">
                      {cat.label}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1 gap-2">
                    <h3 className="text-lg font-extrabold text-brand-navy leading-snug">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      {spanLabel(ev)}
                    </p>
                    {ev.location && (
                      <p className="text-xs text-gray-500">{ev.location}</p>
                    )}
                    {ev.description && (
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                        {ev.description}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
