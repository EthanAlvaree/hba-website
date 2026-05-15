// app/programs/page.tsx

import Image from "next/image"
import Link from "next/link"
import {
  AcademicCapIcon,
  BeakerIcon,
  CogIcon,
  CpuChipIcon,
  GlobeAltIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline"
import type { ComponentType, SVGProps } from "react"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "Academic programs — High Bluff Academy",
  description:
    "HBA offers a college-preparatory curriculum with 30+ AP courses, six distinctive academic pathways, and the AP Capstone Diploma program — all UC A–G aligned, on campus, online, or hybrid.",
}

const apCategories: { label: string; courses: string[] }[] = [
  {
    label: "AP Math, Statistics & Computer Science",
    courses: [
      "AP Precalculus",
      "AP Calculus AB & BC",
      "AP Statistics",
      "AP Computer Science Principles",
      "AP Computer Science A",
    ],
  },
  {
    label: "AP Sciences",
    courses: [
      "AP Biology",
      "AP Chemistry",
      "AP Environmental Science",
      "AP Physics 1 & 2",
      "AP Physics C: Mechanics",
      "AP Physics C: Electricity and Magnetism",
    ],
  },
  {
    label: "AP English & History",
    courses: [
      "AP English Language and Composition",
      "AP English Literature and Composition",
      "AP Seminar",
      "AP Research",
      "AP United States History",
      "AP World History: Modern",
      "AP European History",
      "AP African American Studies",
    ],
  },
  {
    label: "AP Social Sciences, Languages & Arts",
    courses: [
      "AP U.S. & Comparative Government and Politics",
      "AP Macroeconomics & Microeconomics",
      "AP Psychology",
      "AP Human Geography",
      "AP Business with Personal Finance",
      "AP Spanish, French & Chinese Language and Culture",
      "AP Art History",
      "AP Music Theory",
    ],
  },
]

type Pathway = {
  id: string
  name: string
  tagline: string
  courses: string[]
  capstone: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const pathways: Pathway[] = [
  {
    id: "data-science",
    name: "Data Science & Quantitative Reasoning",
    tagline:
      "The mathematics, programming, and modeling foundation for the most quantitative degrees at university.",
    courses: [
      "AP Statistics",
      "AP Calculus BC",
      "AP Computer Science A",
      "Linear Algebra (H)",
      "Multivariable Calculus (H)",
      "Mathematics of Machine Learning (H)",
    ],
    capstone: "AWS Cloud Practitioner certification",
    icon: CpuChipIcon,
  },
  {
    id: "engineering",
    name: "Engineering & Robotics",
    tagline:
      "From classical mechanics to mechatronics — the design pathway for future engineers.",
    courses: [
      "AP Physics 1",
      "AP Physics C: Mechanics",
      "AP Physics C: Electricity and Magnetism",
      "AP Calculus BC",
      "Intro to Robotic Engineering",
      "AP Computer Science A",
    ],
    capstone: "Independent engineering portfolio reviewed by a working engineer mentor",
    icon: CogIcon,
  },
  {
    id: "pre-medical",
    name: "Pre-Medical & Life Sciences",
    tagline:
      "Foundations deeper than the standard three sciences for future physicians, biologists, and researchers.",
    courses: [
      "Chemistry: In the Earth System (H)",
      "AP Biology",
      "AP Chemistry",
      "AP Environmental Science",
      "AP Psychology",
      "AP Statistics",
    ],
    capstone: "Bioethics seminar with an independent literature-review project",
    icon: BeakerIcon,
  },
  {
    id: "visual-arts",
    name: "Visual Arts & Publication",
    tagline:
      "Classical drawing foundations paired with digital production craft and a real publication credit.",
    courses: [
      "Studio Art",
      "Digital Art",
      "AP Art History",
    ],
    capstone:
      "Co-credited contribution to a professionally printed hardcover book, offered in partnership with our partner organization Pacific Crest Institute (PCI)",
    icon: PaintBrushIcon,
  },
  {
    id: "ap-capstone",
    name: "AP Capstone Diploma",
    tagline:
      "The College Board's most recognized research distinction, earned alongside other coursework.",
    courses: [
      "AP Seminar (live instructor only)",
      "AP Research (live instructor only)",
      "Plus four additional AP exams in subjects of the student's choice",
    ],
    capstone:
      "AP Capstone Diploma — explicitly recognized by Stanford, the UC system, NYU, and many others",
    icon: AcademicCapIcon,
  },
  {
    id: "global-studies",
    name: "Global Studies & Modern Languages",
    tagline:
      "Four years of language alongside the world's most consequential history and politics.",
    courses: [
      "AP World History: Modern",
      "AP Comparative Government and Politics",
      "AP Human Geography",
      "Four years of Spanish, French, or Chinese — through AP",
      "Model UN",
    ],
    capstone: "Independent research paper on a contemporary global issue",
    icon: GlobeAltIcon,
  },
]

export default function ProgramsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      {/* HERO */}
      <PageHero
        title="Academic programs"
        subtitle="A flexible, college-preparatory pathway tailored to each student's strengths and goals."
        image="/images/hba/programs/programs-hero.webp"
      />

      <Breadcrumbs />

      {/* CORE COURSES */}
      <section id="courses" className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Core curriculum
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-brand-navy leading-tight">
              A strong academic foundation.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              High Bluff Academy offers a comprehensive college-preparatory curriculum that
              emphasizes critical thinking, communication, and problem-solving. Small class
              sizes allow teachers to know each student well and adapt instruction to their
              needs and pace.
            </p>

            <div className="grid gap-6 sm:grid-cols-2 mt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-navy uppercase tracking-widest mb-3">
                  English
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Literature, composition, and honors English — building strong readers,
                  writers, and communicators.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-navy uppercase tracking-widest mb-3">
                  Mathematics
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Algebra through calculus, with honors tracks extending into linear algebra,
                  multivariable calculus, and abstract algebra.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-navy uppercase tracking-widest mb-3">
                  Science
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Biology, chemistry, physics, and environmental science — hands-on,
                  inquiry-based learning.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-brand-navy uppercase tracking-widest mb-3">
                  Social science
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  World and U.S. history, government, economics, and psychology — understanding
                  society, culture, and global issues.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[520px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/hba/programs/courses.webp"
                alt="Students engaged in class"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  College-preparatory academics
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Rigorous coursework with the flexibility to accelerate or reinforce as needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AP COURSES */}
      <section id="ap" className="py-24 bg-brand-navy relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/hba/programs/ap-courses.webp"
            alt=""
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              30+ AP courses
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Advanced placement at the breadth of a major university.
            </h2>
            <p className="text-white/80 text-lg font-light leading-relaxed">
              High Bluff Academy is an authorized AP Capstone school and an official College
              Board testing site (CEEB {siteConfig.ceebCode}) — students complete AP coursework and sit for
              AP exams on the same campus where they learn every day.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
            {apCategories.map((cat) => (
              <div
                key={cat.label}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white shadow-xl flex flex-col"
              >
                <h3 className="text-base font-bold mb-4 leading-snug">{cat.label}</h3>
                <ul className="space-y-1.5 text-sm text-white/85">
                  {cat.courses.map((c) => (
                    <li key={c} className="flex gap-2 leading-snug">
                      <span className="text-brand-orange font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-white/70">
            AP course availability may vary based on student enrollment and demand.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/programs/courses"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-brand-navy font-semibold text-sm shadow-lg hover:bg-brand-orange hover:text-white transition"
            >
              See the full UC A–G course catalogue →
            </Link>
            <Link
              href="/programs/graduation-requirements"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Graduation requirements →
            </Link>
          </div>
        </div>
      </section>

      {/* PATHWAYS */}
      <section id="pathways" className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Academic pathways
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Six distinctive pathways through HBA.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              Beyond the core diploma, students can shape their AP and honors coursework into
              a focused track. Each pathway pairs a sequence of demanding courses with a
              capstone credential that signals real depth to admissions readers.
            </p>
          </div>

          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pathways.map((p, i) => {
              const Icon = p.icon
              return (
              <li
                key={p.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-5 lg:p-6 shadow-sm hover:shadow-lg hover:border-brand-orange transition flex flex-col"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-orange tabular-nums pt-1">
                    Pathway {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="h-6 w-6 text-brand-navy/60 flex-shrink-0"
                  />
                </div>
                <h3 className="text-lg font-extrabold text-brand-navy leading-tight">
                  {p.name}
                </h3>
                <p className="text-xs text-gray-600 font-light leading-relaxed mt-2">
                  {p.tagline}
                </p>
                <ul className="space-y-1 mt-4 text-xs text-gray-700 flex-grow">
                  {p.courses.map((c) => (
                    <li key={c} className="flex gap-2 leading-snug">
                      <span className="text-brand-orange font-bold">→</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-navy">
                    Capstone
                  </div>
                  <p className="text-xs text-gray-700 mt-1 leading-snug">{p.capstone}</p>
                </div>
              </li>
              )
            })}
          </ol>

          <p className="text-center text-sm text-gray-500 italic max-w-2xl mx-auto">
            Pathways are advisory — they reflect the most common ways HBA students stack
            coursework. Counselors work one-on-one with each family to tune the sequence.
          </p>
        </div>
      </section>

      {/* SUMMER PROGRAMS */}
      <section id="summer" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Summer 2026
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              High-impact summer programs.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              High Bluff Academy is widely recognized for its exceptional summer programs,
              which have supported thousands of students in strengthening core skills,
              exploring new subjects, and preparing for college-level coursework.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Live group classes on campus starting June 8, 2026</li>
              <li>• Flexible online, hybrid, and in-person options</li>
              <li>• Official College Board testing site (CEEB Code: {siteConfig.ceebCode})</li>
              <li>• Six-, seven-, and eight-week course formats</li>
            </ul>
            <Link
              href="/summer-programs"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition mt-4"
            >
              View summer programs
            </Link>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hba/programs/summer-programs.webp"
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
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">
          <div className="relative h-[340px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hba/programs/online-programs.webp"
              alt="Student learning online"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 to-transparent" />
          </div>

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Flexible pathways
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Online & hybrid learning.
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
            <div className="pt-2">
              <Link
                href="/programs/online"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-white font-semibold text-sm shadow hover:brightness-110 transition"
              >
                Explore HBA Online High School →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
