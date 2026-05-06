// app/community/parents/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function ParentsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="For parents and guardians"
        subtitle="Resources, tools, and ways to stay connected to your student's education."
        image="/images/community/parents-hero.webp"
      />

      <Breadcrumbs />

      {/* WELCOME */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Partners in education
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
            Welcome to the HBA family.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            Educating a young person is a partnership — between the student, their
            teachers, and the family that supports them at home. We’re grateful for the
            trust you place in HBA and committed to keeping you informed, involved, and
            in the loop at every step.
          </p>
        </div>
      </section>

      {/* QUICK LINKS */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Quick links
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Tools you’ll use most.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <a
              href="https://secure.gradelink.com/2962/enrollment"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Parent portal
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Gradelink portal
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Grades, attendance, assignments, and progress reports — all in one place.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                Open Gradelink →
              </span>
            </a>

            <a
              href="/calendar"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Calendar
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Important dates
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Holidays, exam weeks, conferences, and school-wide events.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                View calendar →
              </span>
            </a>

            <a
              href="/contact"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Contact
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Office &amp; admissions
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Reach our team for scheduling, transcripts, billing, or general questions.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                Get in touch →
              </span>
            </a>

            <a
              href="/admissions#tuition"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Tuition
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Tuition &amp; financial aid
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Annual tuition, registration fees, and information on financial assistance.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                See details →
              </span>
            </a>

            <a
              href="/faculty"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Faculty
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Meet your student’s teachers
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Bios, subject areas, and the people guiding your student day to day.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                Faculty directory →
              </span>
            </a>

            <a
              href="/community#advisory"
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
            >
              <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                Advisory
              </div>
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-3">
                Academic support
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                How advisors partner with families to keep students on track.
              </p>
              <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                Learn more →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* COMMUNICATION */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/community/parents-meeting.webp"
            alt="Parents and faculty"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-6 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Communication
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold">
              An open line, always.
            </h2>
            <p className="text-lg text-white/90 leading-relaxed font-light">
              Our small size means real conversations, not impersonal updates. Faculty
              and admissions staff respond directly. Parent-teacher conferences happen
              twice a year, and you can request a meeting any time something needs
              discussion — academic, social, or otherwise.
            </p>
            <p className="text-sm text-white/70">
              For urgent matters, the office line is the fastest path:
              <br />
              <strong className="text-white">(858) 509-9101</strong>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white shadow-2xl space-y-4">
            <h4 className="text-xs font-bold tracking-widest uppercase text-white/70">
              How we keep you in the loop
            </h4>
            <ul className="space-y-3 text-sm">
              <li>• Real-time grades and attendance via Gradelink</li>
              <li>• Quarterly progress reports</li>
              <li>• Parent-teacher conferences twice a year</li>
              <li>• Email updates on school events and deadlines</li>
              <li>• Direct access to faculty and the head of school</li>
            </ul>
          </div>
        </div>
      </section>

      {/* GET INVOLVED */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/community/parents-involved.webp"
              alt="Parents involved at HBA"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Get involved
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Be part of the school.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              Parents are welcome to chaperone field trips, attend school events,
              support athletics and arts, and participate in family-led service
              initiatives. There’s no rigid PTA structure — just an open invitation to
              show up for your student and the community.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
            >
              Ask how to help
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
