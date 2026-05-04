// app/programs/online/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "Online high school — High Bluff Academy",
  description:
    "Accredited online high school for grades 9–12. Self-paced from $6,800/year, live instruction from $12,800/year, or individual courses. 26 AP and honors classes, AP testing site in San Diego.",
}

const tiers = [
  {
    name: "Self-paced",
    price: "$6,800",
    cadence: "/ school year",
    enrollment: "$340 new student enrollment fee",
    blurb: "Start any time, on your own schedule.",
    features: [
      "Cognitive skills assessment",
      "Personal college counseling sessions",
      "Up to 8 courses per year",
      "Custom learning levels for each course",
      "26 AP and honors classes",
      "AP testing site in San Diego",
      "In-person graduation in San Diego",
      "Professionally filmed video lessons",
      "Cognitive learning drills",
      "AI writing tutor",
      "AI-powered math remediation",
      "Electronics, robotics & coding",
      "Optional add-ons: tutoring, internships, passion projects, AP & SAT/ACT prep",
    ],
    accent: "secondary" as const,
  },
  {
    name: "Live instruction",
    price: "$12,800",
    cadence: "/ school year",
    enrollment: "Begins August each year",
    blurb: "Live, teacher-led classes with weekly office hours.",
    features: [
      "Everything in Self-paced",
      "Live teacher-moderated discussion groups",
      "Internships and passion projects included",
      "Business, data science & engineering courses",
      "Weekly teacher office hours",
      "Live seminar speakers on careers, majors, and extracurriculars",
      "Live instructional time with HBA faculty",
    ],
    featured: true,
    accent: "primary" as const,
  },
  {
    name: "Individual courses",
    price: "From $1,200",
    cadence: "per course",
    enrollment: "Open enrollment year-round",
    blurb: "For students enrolled at another school who need a class for credit.",
    features: [
      "Self-paced courses from $1,200 (College Prep) – $1,900 (AP)",
      "Live instruction courses from $6,300 (Non-AP) – $8,400 (AP)",
      "Spanish & French I–IV: $1,600 — AP: $1,900",
      "English 9–12: $1,600",
      "Foreign language and English include live conversation with HBA teachers",
      "Tutoring available alongside any course",
    ],
    accent: "secondary" as const,
  },
]

const courseList = [
  {
    label: "A — History / Social science",
    courses: [
      "World History",
      "U.S. History",
      "American Government",
      "AP African American Studies",
      "AP European History",
      "AP Government & Politics — United States",
      "AP Government & Politics — Comparative",
      "AP Human Geography",
      "AP United States History",
      "AP World History",
    ],
  },
  {
    label: "B — English",
    courses: [
      "English 9, 10, 11, 12",
      "Honors English (live instructor only)",
      "AP English Language & Composition",
      "AP English Literature & Composition",
      "AP Seminar (live instruction only)",
    ],
  },
  {
    label: "C — Mathematics",
    courses: [
      "Algebra 1",
      "Algebra 2 / Trigonometry",
      "Geometry",
      "Integrated Math 1, 2, 3",
      "Integrated Math 1, 2, 3 Honors",
      "Introduction to Calculus",
      "Precalculus",
      "Statistics",
      "AP Precalculus (live instructor only)",
      "AP Calculus AB",
      "AP Calculus BC",
      "AP Statistics",
      "AP Computer Science A",
      "Linear Algebra (live instructor only)",
      "Multivariable Calculus (live instructor only)",
    ],
  },
  {
    label: "D — Science",
    courses: [
      "Biology: The Living Earth",
      "Chemistry: In the Earth System",
      "Physics of the Universe",
      "AP Biology",
      "AP Chemistry",
      "AP Environmental Science",
      "AP Physics 1",
      "AP Physics 2",
      "AP Physics C: Mechanics",
      "AP Physics C: E&M",
      "AP Computer Science Principles",
    ],
  },
  {
    label: "E — World languages",
    courses: [
      "Spanish 1, 2, 3, 4",
      "AP Spanish Language & Culture",
      "French 1, 2, 3, 4",
    ],
  },
  {
    label: "F — Visual & performing arts",
    courses: ["AP Art History", "AP Music Theory"],
  },
  {
    label: "G — College preparatory electives",
    courses: [
      "Economics",
      "AP Macroeconomics",
      "AP Microeconomics",
      "AP Psychology",
      "AP Research (live instructor only)",
      "Intro to Ethnic Studies",
      "Intro to Java",
      "Intro to Robotic Engineering",
    ],
  },
]

export default function OnlineHighSchoolPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="HBA Online High School"
        subtitle="An accredited, flexible high school program for students who learn best on their own terms."
        image="/images/online/hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            A full high school. From anywhere.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            HBA Online offers a dynamic, flexible learning environment designed for students
            who need a high-quality college-prep education on a non-traditional schedule —
            elite athletes, international students, family caregivers, and students who simply
            thrive learning at their own pace. Our accredited curriculum, professionally filmed
            video lessons, and credentialed teachers give students the same academic foundation
            as our on-campus program.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto pt-6 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-left">
              <div className="font-semibold text-[#f37021] tracking-widest text-xs uppercase mb-1">
                AP testing
              </div>
              Enroll in any AP and we hold your seat at HBA&rsquo;s San Diego testing site.
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-left">
              <div className="font-semibold text-[#f37021] tracking-widest text-xs uppercase mb-1">
                Counseling
              </div>
              Credentialed college counselor and Mandarin/Cantonese specialist available.
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-left">
              <div className="font-semibold text-[#f37021] tracking-widest text-xs uppercase mb-1">
                Cognitive
              </div>
              Full-time students take a cognitive abilities test that personalizes instruction.
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TIERS */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Packages & pricing
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Three ways to learn online with HBA.
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-3xl p-8 shadow-sm border flex flex-col ${
                  tier.featured
                    ? "bg-[#1f3f66] text-white border-[#1f3f66] shadow-2xl scale-100 lg:scale-[1.02]"
                    : "bg-white text-gray-900 border-gray-200"
                }`}
              >
                {tier.featured && (
                  <div className="inline-block self-start px-3 py-1 bg-[#f37021] text-white font-bold tracking-widest text-[10px] uppercase rounded-full mb-3">
                    Most popular
                  </div>
                )}
                <h3
                  className={`text-2xl font-extrabold ${
                    tier.featured ? "text-white" : "text-[#1f3f66]"
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    tier.featured ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  {tier.blurb}
                </p>

                <div className="mt-5">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  <span
                    className={`text-sm ml-2 ${
                      tier.featured ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {tier.cadence}
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${
                    tier.featured ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {tier.enrollment}
                </p>

                <ul
                  className={`mt-6 space-y-2 text-sm flex-grow ${
                    tier.featured ? "text-white/90" : "text-gray-700"
                  }`}
                >
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span
                        className={
                          tier.featured ? "text-[#f37021]" : "text-[#f37021]"
                        }
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="https://secure.gradelink.com/2962/enrollment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full font-semibold text-sm transition ${
                    tier.featured
                      ? "bg-[#f37021] text-white hover:brightness-110"
                      : "border border-[#1f3f66] text-[#1f3f66] hover:bg-[#1f3f66] hover:text-white"
                  }`}
                >
                  Apply now
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COURSE LIST */}
      <section id="courses" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Full course list
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              UC A–G online course catalogue.
            </h2>
            <p className="text-gray-600 font-light max-w-2xl mx-auto">
              Every course below satisfies UC A–G requirements. Courses marked &ldquo;live
              instructor only&rdquo; are not available in self-paced format.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courseList.map((group) => (
              <div
                key={group.label}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm"
              >
                <h3 className="text-sm font-bold text-[#1f3f66] uppercase tracking-widest mb-4">
                  {group.label}
                </h3>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  {group.courses.map((c) => (
                    <li key={c} className="leading-snug">• {c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Ready to learn from anywhere?
          </h2>
          <p className="text-lg text-white/90 font-light">
            Apply online, and our admissions team will get back to you within one business
            day. We&rsquo;re happy to walk you through the right tier for your student&rsquo;s goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="https://secure.gradelink.com/2962/enrollment"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Apply now
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Talk to admissions
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
