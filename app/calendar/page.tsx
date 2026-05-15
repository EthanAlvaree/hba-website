// app/calendar/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getAllEvents } from "@/lib/events-server"
import { getUpcomingEvents } from "@/lib/events"
import UpcomingEvents from "./UpcomingEvents"
import InteractiveCalendar from "./InteractiveCalendar"
import SubscribeButtons from "./SubscribeButtons"

// `force-dynamic` so admin edits in /admin/academics/calendar surface on
// the public page immediately.
export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const events = await getAllEvents()
  const upcoming = getUpcomingEvents(events, new Date(), 5)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Calendar"
        subtitle="Important dates, school events, and key academic milestones — live and synced to your phone."
        image="/images/hba/calendar/calendar-hero.webp"
      />

      <Breadcrumbs />

      <UpcomingEvents events={upcoming} />

      <InteractiveCalendar events={events} />

      <SubscribeButtons />

      {/* PRINTABLE */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 grid gap-10 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Prefer paper?
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Printable academic year.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              A single-sheet, year-at-a-glance view formatted for letter paper —
              same data as the live calendar, beautifully laid out for the fridge,
              the binder, or the office wall.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/calendar/print/2025"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-navy text-white font-semibold text-sm hover:bg-brand-orange transition"
              >
                2025–2026
              </Link>
              <Link
                href="/calendar/print/2026"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
              >
                2026–2027
              </Link>
            </div>
            <p className="text-xs text-gray-500">
              Tip: from the printable view, press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl/Cmd + P</kbd> and choose <em>Save as PDF</em> as the destination.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-8 text-sm text-gray-600 leading-relaxed">
            <p className="font-semibold text-brand-navy mb-3">
              What’s on the printable sheet
            </p>
            <ul className="space-y-2">
              <li>• Twelve months at a glance, August through July</li>
              <li>• Color-coded holidays, in-service, finals, and graduation</li>
              <li>• Important dates listed below each month</li>
              <li>• Letter-size, portrait, fits on one page</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SUMMER 2026 CALLOUT */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Summer 2026
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
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
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition mt-4"
            >
              View summer programs
            </a>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hba/calendar/calendar-summer.webp"
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
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
            Need anything else?
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            We’re happy to help.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            Looking for exact times for an event, or a date we haven’t posted
            yet? Reach out and we’ll get it to you.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact the office
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
