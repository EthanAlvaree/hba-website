// app/_schools/pci/TestPrepPage.tsx
//
// PCI's second pillar — test prep, AP review, contest math, and the
// olympiad track. Catalog-style page with grouped sections.

import Image from "next/image"
import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `Test Prep & Academics — ${siteConfig.name}`,
  description:
    "PCI's test prep and academic programs — competition math, science olympiads, AP review, SAT/ACT, and TOEFL preparation.",
}

const tracks = [
  {
    n: "01",
    label: "College entrance exams",
    title: "SAT, ACT & TOEFL",
    courses: [
      "SAT preparation",
      "ACT preparation",
      "TOEFL preparation",
      "Academic English & vocabulary",
      "College and university English readiness",
    ],
  },
  {
    n: "02",
    label: "AP exam preparation",
    title: "Advanced Placement",
    courses: [
      "AP Calculus AB / BC intensive review",
      "AP Biology exam preparation",
      "AP Chemistry problem-solving workshop",
      "AP Physics 1 & C supplemental classes",
      "AP English Language & Composition writing lab",
      "AP English Literature reading & essay coaching",
      "AP U.S. History (APUSH) review",
      "AP World History skills & essay training",
      "AP Computer Science Principles / Java prep",
      "AP Statistics test strategies",
    ],
  },
  {
    n: "03",
    label: "Math olympiads",
    title: "Competition math",
    courses: [
      "AMC 8 / AMC 10 / AMC 12 preparation",
      "AIME intensive training",
      "USA Mathematical Olympiad (USAMO) foundations",
      "Competitive problem-solving strategies",
      "Algebra, number theory, geometry, combinatorics workshops",
      "MATHCOUNTS training",
      "Math Kangaroo preparation",
    ],
  },
  {
    n: "04",
    label: "Science olympiads",
    title: "STEM competitions",
    courses: [
      "USAPhO / F=ma physics olympiad preparation",
      "USNCO chemistry olympiad preparation",
      "USABO biology olympiad preparation",
      "Earth science & environmental science competitions",
      "Scientific research and lab skills training",
    ],
  },
]

export default function PciTestPrepPage() {
  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-brand-navy-deep text-white">
        <Image
          src="/images/pci/students-working2.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover -z-10"
          priority
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy-deep/90 via-brand-navy/75 to-black/85" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-28 lg:pt-40 pb-24 lg:pb-32">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Pillar 02 · Test Prep & Academics
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-4xl">
            Scores that move.
            <br />
            <span className="text-brand-orange">Real preparation.</span>
            <br />
            No shortcuts.
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            Weekend courses for students serious about competition math,
            science olympiads, AP exams, and the SAT/ACT — taught by
            instructors who&rsquo;ve sat for the same tests and scored.
          </p>
        </div>
      </section>

      {/* ─── INTRO ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              How we work
            </p>
            <div className="mt-6 h-px w-12 bg-brand-orange" />
          </div>
          <div className="lg:col-span-8 space-y-6 text-lg leading-relaxed text-gray-700 font-light">
            <p>
              Most test prep is impersonal — recorded videos, generic
              practice books, drilling without diagnosis. PCI&rsquo;s
              courses run in small cohorts, with real instructors who
              track your data, identify your weak spots, and rebuild
              from there.
            </p>
            <p>
              For competition tracks (AMC, AIME, USAMO, USABO, USAPhO,
              USACO), we drill problems from the actual exam history and
              teach the strategic shape of each test. For SAT, ACT, and
              TOEFL, we measure baseline, set targets, and run the cycle
              of practice → review → re-test until the scores hold.
            </p>
            <p className="text-brand-navy-deep">
              International students welcome. We support bilingual
              students through TOEFL, academic English, and AP
              transition.
            </p>
          </div>
        </div>
      </section>

      {/* ─── COURSE CATALOG ────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            The catalog
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Four tracks. One student at a time.
          </h2>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-300 border border-gray-300">
            {tracks.map(({ n, label, title, courses }) => (
              <article key={n} className="bg-white p-8 lg:p-10">
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl lg:text-5xl font-black text-brand-orange leading-none">
                    {n}
                  </span>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">
                    {label}
                  </p>
                </div>
                <h3 className="mt-4 text-2xl lg:text-3xl font-black tracking-tight text-brand-navy-deep">
                  {title}
                </h3>
                <ul className="mt-6 space-y-2 text-base text-gray-700 font-light leading-relaxed">
                  {courses.map((c) => (
                    <li key={c} className="flex gap-3">
                      <span className="text-brand-orange font-bold">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CALLOUT: NOT ON THE LIST? ─────────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              Not on the list?
            </p>
            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Ask us anyway.
            </h2>
            <p className="mt-6 text-lg text-white/75 leading-relaxed font-light">
              Our catalog reflects what we run regularly — but if
              there&rsquo;s a competition, exam, or skill we haven&rsquo;t
              listed, send us a note. We&rsquo;ll tell you honestly
              whether we&rsquo;re the right fit, and if not, point you to
              someone who is.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Ask us →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-brand-navy-deep leading-[1.05]">
            Enrolling now for the next cohort.
          </h2>
          <p className="mt-6 text-lg text-gray-700 font-light max-w-2xl mx-auto">
            Weekend classes run year-round. Reach out to find out which
            track and start date is right for your student.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Get in touch →
            </Link>
            <a
              href={`mailto:${siteConfig.contact.admissionsEmail}`}
              className="inline-flex items-center justify-center border border-brand-navy-deep/30 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:bg-brand-navy-deep hover:text-white transition"
            >
              {siteConfig.contact.admissionsEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
