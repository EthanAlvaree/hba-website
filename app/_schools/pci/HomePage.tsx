// app/_schools/pci/HomePage.tsx
//
// Pacific Crest Institute home page. Intentionally minimal — a clean
// starting point so PCI's site is visibly distinct from HBA's instead
// of a teal-tinted clone. Replace any section with real PCI content
// when ready. The hero image lives at /public/images/pci/hero.webp
// (drop a real file there and it appears automatically); until then,
// the hero uses a CSS gradient.

import Image from "next/image"
import Link from "next/link"
import { siteConfig } from "@/lib/site"

export default function PciHomePage() {
  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden text-white">
        <Image
          src="/images/pci/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover -z-10"
        />
        {/* Dark overlay so text stays legible on top of the photo. */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy/85 via-[#1f5f6b]/75 to-brand-navy-deep/90 -z-10" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-12 py-28 lg:py-40">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-orange">
            {siteConfig.shortName}
          </p>
          <h1 className="mt-3 text-4xl lg:text-6xl font-extrabold tracking-tight">
            {siteConfig.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg lg:text-xl text-white/90 leading-relaxed font-light">
            {siteConfig.tagline}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Get in touch
            </Link>
            <Link
              href="#what-we-do"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Learn more ↓
            </Link>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section id="what-we-do" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              What we do
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Placeholder — replace with real content.
            </h2>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              This is a clean home page stub. Edit
              {" "}<code className="text-sm">app/_schools/pci/HomePage.tsx</code>{" "}
              to replace it with the real PCI story — programs, partnerships,
              the publisher relationship for digital art, guest-artist
              events, the test-prep tracks.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Program 1 placeholder
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-brand-navy">
                Digital Art
              </h3>
              <p className="mt-3 text-gray-700 leading-relaxed">
                Replace this paragraph with PCI's digital art program copy —
                the publisher partnership, guest artists, portfolio reviews,
                weekend cohort structure, etc.
              </p>
            </article>
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Program 2 placeholder
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-brand-navy">
                Test Prep
              </h3>
              <p className="mt-3 text-gray-700 leading-relaxed">
                Replace this with the test-prep program copy — SAT/ACT
                tracks, the relationship with HBA (which can&rsquo;t offer
                test prep since it&rsquo;s a test center), weekend schedule,
                results.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-navy text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold">
            Interested? Talk to us.
          </h2>
          <p className="text-lg text-white/90 font-light">
            We&rsquo;re happy to walk you through programs, schedules, and
            whether {siteConfig.shortName} is the right fit for your student.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
          >
            Contact us →
          </Link>
        </div>
      </section>
    </main>
  )
}
