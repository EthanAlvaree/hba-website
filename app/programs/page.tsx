import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function ProgramsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      {/* HERO */}
      <PageHero
        title="Academic Programs"
        subtitle="A flexible, college-preparatory pathway tailored to each student’s strengths and goals."
        image="/images/programs-hero.jpg"
      />

      <Breadcrumbs />

      {/* CORE COURSES – Editorial Split */}
      <section id="courses" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Core Curriculum
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
              A Strong Academic Foundation.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              High Bluff Academy offers a comprehensive college-preparatory curriculum that
              emphasizes critical thinking, communication, and problem-solving. Small class
              sizes allow teachers to know each student well and adapt instruction to their
              needs and pace.
            </p>

            <div className="grid gap-6 sm:grid-cols-2 mt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#1f3f66] uppercase tracking-widest mb-3">
                  English
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Literature, Composition, Honors English — building strong readers, writers,
                  and communicators.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#1f3f66] uppercase tracking-widest mb-3">
                  Mathematics
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Algebra I & II, Geometry, Pre-Calculus, Calculus — from foundations to
                  advanced problem-solving.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#1f3f66] uppercase tracking-widest mb-3">
                  Science
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Biology, Chemistry, Physics, Environmental Science — hands-on, inquiry-based
                  learning.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-[#1f3f66] uppercase tracking-widest mb-3">
                  Social Sciences
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  World History, U.S. History, Government, Economics — understanding society,
                  culture, and global issues.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[520px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/courses.jpg"
                alt="Students engaged in class"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  College-Preparatory Academics
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Rigorous coursework with the flexibility to accelerate or reinforce as needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AP COURSES – Highlighted Section */}
      <section id="ap" className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/ap-courses.jpg"
            alt="Student studying for AP exam"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Advanced Placement (AP) Courses
            </h2>
            <p className="mt-4 text-white/80 text-lg max-w-3xl mx-auto font-light">
              High Bluff Academy is an official College Board testing site, offering students
              a seamless pathway from AP coursework to AP exams — on the same campus where
              they learn every day.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              ["AP English", ["AP English Language", "AP English Literature"]],
              ["AP Math & Science", ["AP Calculus AB/BC", "AP Statistics", "AP Biology", "AP Chemistry", "AP Physics"]],
              ["AP Humanities & Social Science", ["AP U.S. History", "AP World History", "AP U.S. Government", "AP Macro/Microeconomics", "AP Computer Science"]],
            ].map(([title, items]) => (
              <div
                key={title as string}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white shadow-xl"
              >
                <h3 className="text-lg font-semibold mb-3">{title}</h3>
                <ul className="space-y-1 text-sm text-white/80">
                  {(items as string[]).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-white/70">
            AP course availability may vary based on student enrollment and demand.
          </p>
        </div>
      </section>

      {/* AREAS OF STUDY – Iconic Grid */}
      <section id="areas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5">
              <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/areas-study.jpg"
                  alt="STEM and arts learning"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/50 to-transparent" />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <div>
                <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
                  Areas of Study
                </div>
                <h2 className="mt-4 text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
                  Pathways for Every Learner.
                </h2>
                <p className="mt-4 text-lg text-gray-600 leading-relaxed font-light">
                  Students can explore a wide range of disciplines while building a strong
                  academic foundation. Our flexible structure allows for both depth and
                  breadth — from STEM to the arts to college preparation.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  {
                    label: "STEM",
                    items: [
                      "Algebra I & II, Geometry, Pre-Calculus, Calculus",
                      "Biology, Chemistry, Physics, Environmental Science",
                      "Computer Science and Coding",
                    ],
                  },
                  {
                    label: "Arts",
                    items: [
                      "Drawing and Painting",
                      "Digital Art and Graphic Design",
                      "Photography, Film & Media Studies",
                    ],
                  },
                  {
                    label: "College Prep",
                    items: [
                      "Honors & AP English",
                      "U.S. & World History, Government, Economics",
                      "SAT/ACT Test Preparation",
                      "College Counseling & Application Support",
                    ],
                  },
                  {
                    label: "Language & ESL",
                    items: [
                      "World Languages (e.g., Spanish, French)",
                      "ESL for international students",
                      "Public Speaking & Writing Workshops",
                    ],
                  },
                ].map((area) => (
                  <div
                    key={area.label}
                    className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm"
                  >
                    <h3 className="text-sm font-semibold text-[#1f3f66] uppercase tracking-widest mb-3">
                      {area.label}
                    </h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      {area.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUMMER PROGRAMS – Feature Banner */}
      <section id="summer" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Summer 2026
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              High-Impact Summer Programs.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              High Bluff Academy is widely recognized for its exceptional summer programs,
              which have supported thousands of students in strengthening core skills,
              exploring new subjects, and preparing for college-level coursework.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Live group classes on campus starting June 8, 2026</li>
              <li>• Flexible online, hybrid, and in-person options</li>
              <li>• Official College Board testing site (CEEB Code: 053036)</li>
              <li>• Six-, seven-, and eight-week course formats</li>
            </ul>
            <a
              href="/summer-programs"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition mt-4"
            >
              View Summer Programs
            </a>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/summer-programs.jpg"
              alt="Students in summer class"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* ONLINE & FLEXIBLE LEARNING */}
      <section id="online" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="relative h-[340px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/online-programs.jpg"
              alt="Student learning online"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
          </div>

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Flexible Pathways
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Online & Hybrid Learning.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              For students who need additional flexibility, High Bluff Academy offers online
              and hybrid options that maintain the same academic rigor and personalized
              support as our on-campus programs.
            </p>
            <p className="text-sm text-gray-600">
              If you do not see the course you are interested in, many classes can be offered
              online through our virtual learning platform or taken one-on-one with an
              in-person teacher.
            </p>
            <a
              href="/programs/online"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
            >
              Explore Online Options
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}