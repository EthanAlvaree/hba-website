// app/programs/courses/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "Course catalogue — High Bluff Academy",
  description:
    "The full High Bluff Academy course catalogue. Mathematics, science, language arts, social science, world languages, and electives — including 25+ AP and honors courses, all UC A–G aligned.",
}

type Category = {
  id: string
  label: string
  description: string
  courses: string[]
}

const categories: Category[] = [
  {
    id: "math",
    label: "Mathematics",
    description:
      "From Algebra 1 through Multivariable Calculus, with honors and AP tracks at every level.",
    courses: [
      "Algebra 1 / Geometry / Algebra 2",
      "Integrated Math 1, 2, 3",
      "Integrated Math 1, 2, 3 Honors",
      "Intro to Calculus / Honors Precalculus",
      "AP Precalculus",
      "AP Statistics",
      "AP Calculus AB",
      "AP Calculus BC",
      "Honors Linear Algebra",
      "Honors Multivariable Calculus",
      "Honors Group Theory and Abstract Algebra",
      "Honors Set Theory and Real Analysis",
      "Honors Mathematics of Machine Learning",
    ],
  },
  {
    id: "science",
    label: "Science",
    description:
      "NGSS-aligned lab science with honors and AP options.",
    courses: [
      "Biology: The Living Earth",
      "Chemistry: In the Earth System",
      "Honors Chemistry: In the Earth System",
      "Physics of the Universe",
      "AP Biology",
      "AP Chemistry",
      "AP Environmental Science",
      "AP Physics 1",
      "AP Physics 2",
      "AP Physics C: Mechanics",
      "AP Physics C: E&M",
    ],
  },
  {
    id: "computer-science",
    label: "Computer Science",
    description:
      "From digital media and robotics to two AP computer science courses, including the rigorous Java-based AP CS A.",
    courses: [
      "Digital Art",
      "Intro to Robotic Engineering",
      "AP Computer Science Principles",
      "AP Computer Science A",
    ],
  },
  {
    id: "social-science",
    label: "Social science",
    description:
      "World and U.S. history, government, economics, psychology, and the full slate of AP humanities.",
    courses: [
      "World History",
      "U.S. History",
      "Economics",
      "AP Business Principles & Personal Finance",
      "AP Government & Politics — United States",
      "AP Government & Politics — Comparative",
      "AP World History",
      "AP United States History",
      "AP European History",
      "AP African American Studies",
      "AP Psychology",
      "AP Human Geography",
      "AP Macroeconomics",
      "AP Microeconomics",
    ],
  },
  {
    id: "language-arts",
    label: "English language arts",
    description:
      "Core English 9–12 and honors and AP literature and language. AP Seminar and AP Research together comprise the AP Capstone Diploma program — a College Board credential not offered at most high schools.",
    courses: [
      "English Support",
      "English 9, 10, 11, 12",
      "AP English Language & Composition",
      "AP English Literature & Composition",
      "AP Seminar (live instructor only)",
      "AP Research (live instructor only)",
    ],
  },
  {
    id: "world-languages",
    label: "World languages",
    description:
      "Four years of Spanish and French with live conversational practice with HBA teachers — not a recorded-only experience.",
    courses: [
      "Spanish 1, 2, 3, 4/AP",
      "French 1, 2, 3, 4/AP",
      "Chinese 1, 2, 3, 4/AP",
    ],
  },
  {
    id: "electives",
    label: "Electives",
    description:
      "Visual and performing arts AP courses alongside introductory technology and ethnic studies electives.",
    courses: [
      "Studio Art",
      "AP Art History",
      "AP Music Theory",
      "Logic and Philosophy",
      "Cooking",
      "PE Fitness",
      "PE Golf",
      "PE Hiking",
    ],
  },
]

export default function CourseCataloguePage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Course catalogue"
        subtitle="The full slate of courses offered at High Bluff Academy — every course satisfies UC A–G requirements."
        image="/images/programs/courses.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            One catalogue. On campus, online, or hybrid.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            HBA students choose from more than 60 courses across mathematics, science, language
            arts, social science, world languages, and electives — including 25+ AP and honors
            classes. The same catalogue serves our on-campus, hybrid, and online students.
            Courses noted as &ldquo;live instructor only&rdquo; are not available in self-paced
            format.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4 text-xs">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="inline-flex items-center px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-brand-navy font-semibold tracking-wide uppercase hover:bg-brand-navy hover:text-white hover:border-brand-navy transition"
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-16">
          {categories.map((cat) => (
            <div key={cat.id} id={cat.id} className="scroll-mt-24">
              <div className="grid gap-10 lg:grid-cols-12 items-start">
                <div className="lg:col-span-4 space-y-3">
                  <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
                    {cat.label}
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-brand-navy leading-tight">
                    {cat.label}
                  </h3>
                  <p className="text-gray-600 font-light leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="lg:col-span-8">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 shadow-sm">
                    <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm text-gray-700">
                      {cat.courses.map((c) => (
                        <li key={c} className="leading-snug flex gap-2">
                          <span className="text-brand-orange">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Find the right course load.
          </h2>
          <p className="text-lg text-white/90 font-light">
            Our admissions team can walk you through course selection, prerequisites, and the
            mix of on-campus, hybrid, and online options that fit your student best.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href={siteConfig.external.enrollment}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Apply now
            </Link>
            <Link
              href="/programs/online"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Online high school
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Talk to admissions
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}