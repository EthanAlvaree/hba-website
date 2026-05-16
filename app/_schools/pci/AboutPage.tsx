// app/_schools/pci/AboutPage.tsx
//
// PCI's About page. People are condensed into a single row at the top
// (leadership + artists + STEM) with a link to /faculty for the full
// bios page. Below that: the Pacific Crest Trail story, mission,
// independence statement, and CTA.

import Image from "next/image"
import Link from "next/link"
import { pciPeople } from "@/app/_schools/pci/people"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `About — ${siteConfig.name}`,
  description:
    "Pacific Crest Institute was founded in San Diego to support students on their academic and creative journey — a name inspired by the Pacific Crest Trail and the values it represents.",
}

export default function PciAboutPage() {
  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative isolate bg-brand-navy-deep text-white overflow-hidden">
        <Image
          src="/images/pci/about.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover -z-10"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy-deep/90 via-brand-navy/75 to-black/85" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-28 lg:pt-40 pb-24 lg:pb-32">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            About Pacific Crest Institute
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-4xl">
            Named for a trail.
            <br />
            <span className="text-brand-orange">Built for the climb.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            Pacific Crest Institute is a San Diego–based academic
            services company founded on a simple idea: real learning,
            like a long trail, rewards perseverance over speed.
          </p>
        </div>
      </section>

      {/* ─── PEOPLE (condensed row, links to /faculty) ─────────────── */}
      <section className="bg-white py-20 lg:py-24 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
                The team
              </p>
              <h2 className="mt-3 text-3xl lg:text-4xl font-black tracking-tight max-w-2xl leading-tight">
                Founders, guest artists, and faculty.
              </h2>
            </div>
            <Link
              href="/faculty"
              className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:text-brand-orange transition"
            >
              All bios →
            </Link>
          </div>

          {/* 6 circles. On large screens, all 6 fit in one row. On
              smaller widths, the grid wraps to 3+3 so the layout never
              leaves a single orphan card on its own row. */}
          <div className="mt-10 grid grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-10">
            {pciPeople.map((p) => (
              <Link
                key={p.slug}
                href={`/faculty/${p.slug}`}
                className="group flex flex-col items-center text-center"
              >
                <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-md transition group-hover:shadow-xl group-hover:ring-brand-orange">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 1024px) 96px, 112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-sm font-black tracking-tight text-brand-navy-deep">
                  {p.name}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-orange leading-tight">
                  {p.role}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE NAME ──────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              The name
            </p>
            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Why &ldquo;Pacific Crest&rdquo;?
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6 text-lg leading-relaxed text-gray-700 font-light">
            <p>
              The Pacific Crest Trail runs 2,650 miles from Mexico to
              Canada — through deserts, mountain passes, and forests.
              People who finish it don&rsquo;t do it on talent alone.
              They do it on dedication, planning, and the willingness
              to keep walking even when the view in front of them
              hasn&rsquo;t changed all day.
            </p>
            <p>
              That&rsquo;s the model we wanted for the institute.
              Education is not a sprint — it&rsquo;s a long, deliberate
              climb. PCI exists to walk that path alongside our
              students, locally and internationally, until they reach
              the milestones they&rsquo;ve set for themselves.
            </p>
            <p className="border-l-2 border-brand-orange pl-6 text-xl text-brand-navy-deep font-light italic">
              Perseverance. Growth. Resilience. The journey toward
              success.
            </p>
          </div>
        </div>
      </section>

      {/* ─── MISSION ───────────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Our mission
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Empower students to reach their full academic and lifelong
            potential.
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              [
                "Student-centered",
                "Small cohorts. Real instructors. Diagnostic teaching that adjusts to the student in front of us.",
              ],
              [
                "Milestone-aware",
                "We build toward concrete outcomes: published work, contest scores, AP exams, SAT/ACT, TOEFL.",
              ],
              [
                "Locally rooted, globally open",
                "San Diego is home, but we serve students nationwide and internationally — including bilingual and AP transition support.",
              ],
            ].map(([h, b]) => (
              <div key={h} className="bg-white p-8 border-t-4 border-brand-orange">
                <h3 className="text-xl font-black tracking-tight text-brand-navy-deep">{h}</h3>
                <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INDEPENDENCE STATEMENT ────────────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            How we operate
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-3xl">
            A clean, independent academic services company.
          </h2>
          <p className="mt-8 text-lg lg:text-xl text-white/80 leading-relaxed font-light max-w-3xl">
            PCI is its own brand, with its own identity, infrastructure,
            and operational footprint. We collaborate openly with
            partner schools and publishers, but we are not a subsidiary
            of any of them. That independence is intentional —
            it&rsquo;s what lets us focus first on the student.
          </p>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-brand-navy-deep leading-[1.05]">
            Walk with us.
          </h2>
          <p className="mt-6 text-lg text-gray-700 font-light max-w-2xl mx-auto">
            Whether your student is here for digital art, AP review,
            competition math, or a college-entrance score — we&rsquo;d
            love to start the conversation.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Get in touch →
            </Link>
            <a
              href={`mailto:${siteConfig.contact.infoEmail}`}
              className="inline-flex items-center justify-center border border-brand-navy-deep/30 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:bg-brand-navy-deep hover:text-white transition"
            >
              {siteConfig.contact.infoEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
