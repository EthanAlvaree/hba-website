// app/calendar/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function CalendarPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Calendar"
        subtitle="Important dates, school events, and key academic milestones throughout the year."
        image="/images/calendar/calendar-hero.jpg"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Year at a glance
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
            One calendar, many milestones.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            From the first day of class to graduation, the HBA calendar shapes the rhythm
            of student life. Below is an overview of the academic year — for live dates,
            subscribe to our calendar feed or contact the office.
          </p>
        </div>
      </section>

      {/* SEASONS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Academic year
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
                  "AP exam season, college decisions for seniors, athletics in full swing, and the Honor Society induction.",
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
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow"
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

      {/* WHAT'S ON THE CALENDAR */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/calendar/calendar-bg.jpg"
            alt="Campus throughout the year"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              What you’ll find
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Every event, in one place.
            </h2>
            <p className="text-lg text-white/85 leading-relaxed font-light">
              Our calendar is organized by category so families can quickly find what
              matters to them most.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Academic",
                description:
                  "First and last day of class, semester boundaries, exam weeks, AP exam dates, parent-teacher conferences.",
              },
              {
                label: "Holidays & breaks",
                description:
                  "Federal holidays, fall break, winter recess, spring break, and any school-wide closures.",
              },
              {
                label: "Athletics",
                description:
                  "Practice schedules, home games, away games, and team-specific events through our Joy of Life Fitness partnership.",
              },
              {
                label: "Arts & performances",
                description:
                  "Studio art showcases, photography exhibits, music performances, and student-led media presentations.",
              },
              {
                label: "Family & community",
                description:
                  "Open houses, admissions tours, NHS induction, family dinners, and community service days.",
              },
              {
                label: "College counseling",
                description:
                  "Application deadlines, financial aid workshops, college visits, and SAT/ACT testing dates.",
              },
            ].map((category) => (
              <div
                key={category.label}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white shadow-2xl"
              >
                <h3 className="text-lg font-semibold mb-3">{category.label}</h3>
                <p className="text-sm text-white/85 leading-relaxed font-light">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUMMER 2026 CALLOUT */}
      <section className="py-24 bg-white">
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

      {/* SUBSCRIBE */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
            Stay in sync
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Subscribe to the live calendar.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            For the most up-to-date dates and times, families can subscribe to the HBA
            calendar feed or contact the office for a printable academic year overview.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Request the calendar
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
            >
              Contact the office
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
