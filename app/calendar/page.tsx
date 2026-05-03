// app/calendar/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getAllEvents } from "@/lib/events-server"
import { getUpcomingEvents } from "@/lib/events"
import UpcomingEvents from "./UpcomingEvents"
import InteractiveCalendar from "./InteractiveCalendar"
import SubscribeButtons from "./SubscribeButtons"

export const revalidate = 3600

export default function CalendarPage() {
  const events = getAllEvents()
  const upcoming = getUpcomingEvents(events, new Date(), 5)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Calendar"
        subtitle="Important dates, school events, and key academic milestones — live and synced to your phone."
        image="/images/calendar/calendar-hero.jpg"
      />

      <Breadcrumbs />

      <UpcomingEvents events={upcoming} />

      <InteractiveCalendar events={events} />

      <SubscribeButtons />

      {/* SEASONS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Year at a glance
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Four seasons, four chapters.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                season: "Fall",
                title: "A new beginning.",
                description:
                  "Welcome week, opening assemblies, fall sports, and the return to small-class learning.",
              },
              {
                season: "Winter",
                title: "Depth and reflection.",
                description:
                  "Mid-year exams, winter performances, and the focused work of finishing first semester strong.",
              },
              {
                season: "Spring",
                title: "Momentum.",
                description:
                  "AP exam season, college decisions for seniors, athletics in full swing, and graduation.",
              },
              {
                season: "Summer",
                title: "Acceleration.",
                description:
                  "Summer programs from June through July — six-, seven-, and eight-week courses on campus and online.",
              },
            ].map((season) => (
              <div
                key={season.season}
                className="bg-gray-50 rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow"
              >
                <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                  {season.season}
                </div>
                <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                  {season.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {season.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUMMER 2026 CALLOUT */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Summer 2026
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Confirmed summer dates.
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Live group classes begin <strong>June 8, 2026</strong></li>
              <li>• Six-week courses: June 8 – July 24 (off June 29 – July 3)</li>
              <li>• Seven-week courses: June 8 – July 24 (except July 3)</li>
              <li>• Eight-week courses: June 8 – July 31 (except July 3)</li>
              <li>• Sessions run Monday through Friday</li>
            </ul>
            <a
              href="/summer-programs"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition mt-4"
            >
              View summer programs
            </a>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/calendar/calendar-summer.jpg"
              alt="Summer at HBA"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
            Need anything else?
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            We’re happy to help.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            Looking for a printable calendar, exact times for an event, or a date
            we haven’t posted yet? Reach out and we’ll get it to you.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact the office
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
