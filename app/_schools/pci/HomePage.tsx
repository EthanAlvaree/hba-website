// app/_schools/pci/HomePage.tsx
//
// Pacific Crest Institute home page. Editorial / art-institute layout —
// large display type, asymmetric grids, big section numerals, lots of
// negative space. Distinct from HBA's prep-school card-grid pattern.

import Image from "next/image"
import Link from "next/link"
import { siteConfig } from "@/lib/site"

export default function PciHomePage() {
  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden text-white">
        <Image
          src="/images/pci/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover -z-10"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-navy-deep/90 via-brand-navy/75 to-black/85" />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-32 lg:pt-44 pb-28 lg:pb-36">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Pacific Crest Institute · San Diego
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
            We don&rsquo;t just teach.
            <br />
            <span className="text-brand-orange">We publish.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            A San Diego art and academic institute where students learn
            from working professionals, build college-ready portfolios,
            and earn real publication credits in printed books.
          </p>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href="/art"
              className="inline-flex items-center justify-center rounded-none bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              The Art Institute →
            </Link>
            <Link
              href="/test-prep"
              className="inline-flex items-center justify-center rounded-none border border-white/40 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-white hover:text-brand-navy-deep transition"
            >
              Test prep & academics
            </Link>
          </div>
        </div>
      </section>

      {/* ─── POSITIONING STATEMENT ─────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              About PCI
            </p>
            <div className="mt-6 h-px w-12 bg-brand-orange" />
          </div>
          <div className="lg:col-span-8 space-y-7 text-lg lg:text-xl leading-relaxed text-gray-700 font-light">
            <p>
              Founded in San Diego and named for the Pacific Crest Trail,
              PCI is built on the idea that real learning is a long walk
              with steady footing — not a sprint.
            </p>
            <p>
              We work with students on weekends and after hours, where
              their passions actually live: in digital art, in serious
              math and science competition, in the long climb toward a
              test score that opens doors. Our instructors don&rsquo;t
              moonlight in this — they live in it.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TWO PILLARS ───────────────────────────────────────────── */}
      <section id="programs" className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Two pillars
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight text-brand-navy-deep max-w-3xl leading-tight">
            What we teach, in two words.
          </h2>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Pillar 01 — Art */}
            <article className="group relative">
              <div className="flex items-baseline gap-4">
                <span className="text-6xl lg:text-7xl font-black text-brand-orange leading-none">
                  01
                </span>
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight">
                  Art Institute
                </h3>
              </div>
              <div className="mt-6 h-px w-full bg-brand-navy-deep/15" />
              <p className="mt-6 text-base lg:text-lg text-gray-700 leading-relaxed font-light">
                Our flagship Saturday studio — a 16-week conservatory in
                digital art, run in partnership with Floating Island
                Productions. Students don&rsquo;t just learn rendering and
                color theory; they contribute pages to real hardcover
                books and earn formal credits inside them.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-brand-navy-deep">
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> Industry pros from Sonic, Marvel, DC, IDW, Image</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> Published credits in printed hardcovers</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> Portfolio pieces for college art-school review</li>
              </ul>
              <Link
                href="/art"
                className="mt-8 inline-flex items-center text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:text-brand-orange transition"
              >
                Explore the program →
              </Link>
            </article>

            {/* Pillar 02 — Test prep */}
            <article className="group relative">
              <div className="flex items-baseline gap-4">
                <span className="text-6xl lg:text-7xl font-black text-brand-orange leading-none">
                  02
                </span>
                <h3 className="text-3xl lg:text-4xl font-black tracking-tight">
                  Test Prep & Academics
                </h3>
              </div>
              <div className="mt-6 h-px w-full bg-brand-navy-deep/15" />
              <p className="mt-6 text-base lg:text-lg text-gray-700 leading-relaxed font-light">
                Competition math, science olympiads, AP review, and the
                full suite of college-entrance tests — taught by
                instructors who have walked the road themselves. Small
                cohorts, real practice, and no AI shortcuts.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-brand-navy-deep">
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> AMC 8 / 10 / 12, AIME, USAMO preparation</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> SAT, ACT, TOEFL, and AP exam review</li>
                <li className="flex gap-3"><span className="text-brand-orange font-bold">·</span> Physics, chemistry, and biology olympiads</li>
              </ul>
              <Link
                href="/test-prep"
                className="mt-8 inline-flex items-center text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:text-brand-orange transition"
              >
                Explore the catalog →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ─── PULL QUOTE ────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-brand-navy-deep text-white py-24 lg:py-32">
        <Image
          src="/images/pci/student-working.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover -z-10 opacity-25"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-navy-deep via-brand-navy-deep/85 to-brand-navy-deep/60" />
        <div className="mx-auto max-w-5xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            What makes PCI different
          </p>
          <blockquote className="mt-8 text-3xl lg:text-5xl font-black leading-[1.1] tracking-tight">
            &ldquo;The test prep market is saturated. We chose to build a
            category of one — a real studio with a real publishing
            pipeline, where high-schoolers ship work that adults
            buy.&rdquo;
          </blockquote>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.24em] text-white/60">
            Ethan Alvarée · CEO, Pacific Crest Institute
          </p>
        </div>
      </section>

      {/* ─── OUTCOMES STRIP ────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
                What students walk away with
              </p>
              <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Real evidence of real work.
              </h2>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
              {[
                ["Published credit", "Your name in the credits page of a printed hardcover, with the book on your shelf at home."],
                ["A real portfolio", "Finished, high-resolution pieces ready for college art-school review — not sketchbook fragments."],
                ["Industry feedback", "Guest critiques from working pros: Adam Bryce Thomas, Kurt Michael Russell, Scott Shaw, Ken Penders."],
                ["Test scores", "Measurable score improvement on the SAT, ACT, TOEFL, and AP exams — backed by a teacher who tracks your data."],
              ].map(([h, b]) => (
                <div key={h}>
                  <h3 className="text-lg font-black tracking-tight text-brand-navy-deep">{h}</h3>
                  <p className="mt-2 text-base text-gray-600 leading-relaxed font-light">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT CTA ───────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-12 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Get in touch
          </p>
          <h2 className="mt-4 text-4xl lg:text-6xl font-black tracking-tight text-brand-navy-deep leading-[1.05]">
            Tell us what your student is into.
          </h2>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed font-light max-w-2xl mx-auto">
            We&rsquo;ll tell you whether {siteConfig.shortName} is a fit
            — and if it isn&rsquo;t, we&rsquo;ll tell you that too.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Send a message →
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
