// app/summer-programs/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { ENROLLMENT_URL, summerCategories } from "@/lib/summer-courses"

export const metadata = {
  title: "Summer programs 2026 — High Bluff Academy",
  description:
    "Live group classes, online, and hybrid courses for grades 9–12. AP and honors prep, six-, seven-, and eight-week formats. Starts June 8, 2026 in Rancho Santa Fe.",
}

export default function SummerProgramsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Summer programs 2026"
        subtitle="High-impact courses designed to accelerate learning, build confidence, and prepare students for the year ahead."
        image="/images/summer/summer-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66]">
            A summer that moves students forward.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            High Bluff Academy is widely recognized for its summer programs, which have
            supported thousands of students in achieving their academic and personal goals.
            Our small classes, individualized instruction, and flexible learning options give
            students the focus and support they need to strengthen core skills, explore new
            subjects, and prepare for college-level coursework.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto pt-6 text-sm">
            <div className="bg-[#f37021]/10 text-[#1f3f66] rounded-2xl px-5 py-4">
              <div className="font-semibold text-[#f37021] tracking-widest text-xs uppercase mb-1">
                Live group classes
              </div>
              Starting June 8, 2026 in Rancho Santa Fe.
            </div>
            <div className="bg-[#1f3f66]/10 text-[#1f3f66] rounded-2xl px-5 py-4">
              <div className="font-semibold text-[#1f3f66] tracking-widest text-xs uppercase mb-1">
                Flexible options
              </div>
              In-person, hybrid, and online — including 1:1 sessions.
            </div>
            <div className="bg-[#f37021]/10 text-[#1f3f66] rounded-2xl px-5 py-4">
              <div className="font-semibold text-[#f37021] tracking-widest text-xs uppercase mb-1">
                AP testing site
              </div>
              CEEB Code 053036. Enroll in any AP and we hold your seat.
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE & ENROLLMENT NOTES */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 grid gap-12 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Summer 2026 dates
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
              Three course lengths, all starting June 8.
            </h2>
            <p className="text-gray-600 font-light leading-relaxed">
              Sessions run Monday through Friday. Six-week courses pause for the
              week of June 29 – July 3.
            </p>
          </div>

          <div className="lg:col-span-7 grid gap-4 sm:grid-cols-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase mb-2">
                Six-week
              </div>
              <p className="text-sm font-semibold text-gray-900">
                June 8 – July 24
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Off June 29 – July 3
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase mb-2">
                Seven-week
              </div>
              <p className="text-sm font-semibold text-gray-900">
                June 8 – July 24
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Off July 3 only
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase mb-2">
                Eight-week
              </div>
              <p className="text-sm font-semibold text-gray-900">
                June 8 – July 31
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Off July 3 only
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-12 mt-10">
          <div className="bg-[#1f3f66] text-white rounded-2xl px-6 py-5 text-sm leading-relaxed">
            <span className="font-semibold">Enrollment notes: </span>
            For all math classes, an unofficial transcript must be submitted with
            the application; in some cases a placement test may be required.
            On-demand and one-on-one options are available for any course not
            offered in a group class — just contact us.
          </div>
        </div>
      </section>

      {/* COURSE CATALOGUE */}
      <section id="catalog" className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Course catalogue
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Summer 2026 courses
            </h2>
            <p className="text-gray-600 font-light">
              Live group classes are listed below. Don&rsquo;t see a course? Almost any HBA
              course can be offered online, on-demand, or one-on-one — just{" "}
              <Link href="/contact" className="text-[#f37021] font-medium hover:underline">
                get in touch
              </Link>
              .
            </p>
          </div>

          {summerCategories.map((cat) => (
            <div key={cat.id} id={cat.id} className="space-y-6 scroll-mt-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-[#1f3f66]">
                    {cat.label}
                  </h3>
                  <p className="text-gray-600 font-light mt-2 max-w-3xl">
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[#1f3f66] text-white text-xs uppercase tracking-widest">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">Course</th>
                      <th className="px-5 py-3 text-left font-semibold">Dates</th>
                      <th className="px-5 py-3 text-left font-semibold">Time</th>
                      <th className="px-5 py-3 text-left font-semibold">Tuition</th>
                      <th className="px-5 py-3 text-right font-semibold">Enroll</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cat.courses.map((course) => (
                      <tr key={course.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-[#1f3f66]">
                          {course.name}
                          {course.sixWeek && (
                            <span
                              title="Six-week course (off June 29 – July 3)"
                              className="ml-1 text-[#f37021] cursor-help"
                            >
                              *
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-700">{course.dates}</td>
                        <td className="px-5 py-4 text-gray-700">{course.time}</td>
                        <td className="px-5 py-4 text-gray-900 font-medium">{course.price}</td>
                        <td className="px-5 py-4 text-right">
                          <a
                            href={ENROLLMENT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#f37021] text-white text-xs font-semibold hover:brightness-110 transition"
                          >
                            Enroll
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {cat.courses.map((course) => (
                  <div
                    key={course.name}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-semibold text-[#1f3f66]">
                        {course.name}
                        {course.sixWeek && <span className="ml-1 text-[#f37021]">*</span>}
                      </h4>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                        {course.price}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Dates</dt>
                        <dd className="text-right">{course.dates}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Time</dt>
                        <dd className="text-right">{course.time}</dd>
                      </div>
                    </dl>
                    <a
                      href={ENROLLMENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center px-4 py-2 rounded-full bg-[#f37021] text-white text-xs font-semibold hover:brightness-110 transition"
                    >
                      Enroll
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-500 text-center pt-4">
            * Six-week course — not in session June 29 – July 3.
          </p>
        </div>
      </section>

      {/* FLEXIBLE LEARNING */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/summer/summer-flex.webp"
            alt="Flexible learning"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Don&rsquo;t see what you&rsquo;re looking for?
          </h2>

          <p className="text-lg text-white/90 leading-relaxed font-light max-w-3xl mx-auto">
            Almost any HBA course can be offered online through our virtual learning
            platform or taken one-on-one with an in-person teacher. Contact us about
            custom scheduling for travel, athletics, or accelerated tracks.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact us
            </Link>
            <a
              href={ENROLLMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Start enrollment
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
