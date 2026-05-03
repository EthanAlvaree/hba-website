// app/summer-programs/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function SummerProgramsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">

      {/* HERO */}
      <PageHero
        title="Summer programs 2026"
        subtitle="High‑impact courses designed to accelerate learning, build confidence, and prepare students for the year ahead."
        image="/images/summer/summer-hero.jpg"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66]">
            A summer that moves students forward.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            High Bluff Academy’s summer programs are known throughout San Diego for their
            academic rigor, small class sizes, and personalized support. Whether students
            want to get ahead, catch up, or explore new subjects, our summer courses provide
            a focused, motivating environment that sets them up for success.
          </p>
          <p className="text-sm text-gray-500">
            Live group classes begin June 8, 2026 · Online, hybrid, and in‑person options available.
          </p>
        </div>
      </section>

      {/* FEATURED SUMMER COURSES */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-16">

          {/* GRID */}
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
                Summer courses
              </div>

              <h2 className="text-4xl font-extrabold text-[#1f3f66] leading-tight">
                High‑impact academic classes.
              </h2>

              <p className="text-lg text-gray-600 leading-relaxed font-light">
                Our summer courses are taught by experienced HBA faculty who specialize in
                helping students master challenging material quickly and effectively. With
                small classes and individualized attention, students stay engaged and make
                meaningful progress.
              </p>

              <ul className="space-y-3 text-sm text-gray-700">
                <li>• Six‑, seven‑, and eight‑week course formats</li>
                <li>• Official College Board testing site (CEEB Code: 053036)</li>
                <li>• Honors and AP preparation options</li>
                <li>• Personalized pacing and flexible scheduling</li>
              </ul>
            </div>

            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/summer/summer-class.jpg"
                alt="Summer class"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
            </div>
          </div>

        </div>
      </section>

      {/* SUBJECT AREAS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-16">

          <div className="text-center space-y-4">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Explore summer subjects
            </h2>
            <p className="text-lg text-gray-600 font-light max-w-3xl mx-auto">
              Students can strengthen core skills, explore new interests, or prepare for
              advanced coursework.
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">

            {/* Math */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-math.jpg"
                  alt="Math courses"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">Mathematics</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Algebra I & II, Geometry, Pre‑Calculus, Calculus, Statistics, and more.
              </p>
            </div>

            {/* Science */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-lab.jpg"
                  alt="Science courses"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">Science</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Biology, Chemistry, Physics, Environmental Science, and AP preparation.
              </p>
            </div>

            {/* English */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-writing.jpg"
                  alt="English courses"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">English</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Writing, literature, reading comprehension, and honors English preparation.
              </p>
            </div>

            {/* Social Science */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-students.jpg"
                  alt="Social science courses"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">Social science</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                U.S. History, World History, Government, Economics, and AP support.
              </p>
            </div>

            {/* World Languages */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-flex.jpg"
                  alt="Language courses"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">World languages</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Spanish, French, ESL, and accelerated language options.
              </p>
            </div>

            {/* Electives */}
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition">
              <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                <Image
                  src="/images/summer/summer-campus.jpg"
                  alt="Electives"
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-[#1f3f66] mb-2">Electives</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Digital art, study skills, test prep, and enrichment workshops.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FLEXIBLE LEARNING */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/summer/summer-flex.jpg"
            alt="Flexible learning"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Flexible options for every student.
          </h2>

          <p className="text-lg text-white/90 leading-relaxed font-light max-w-3xl mx-auto">
            Many courses are available in online, hybrid, or one‑on‑one formats. Students
            can customize their summer schedule to fit travel, athletics, or personal needs
            while still making strong academic progress.
          </p>

          <p className="text-sm text-white/70 max-w-2xl mx-auto">
            If you don’t see the course you’re looking for, contact us — we can often offer
            additional classes through our virtual learning platform.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Ready to get started?
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            Summer is the perfect time to build momentum. Join us for a season of growth,
            challenge, and discovery.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact us
            </a>
            <a
              href="/admissions"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
            >
              Admissions & enrollment
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
