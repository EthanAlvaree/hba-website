// app/_schools/pci/FacultyPage.tsx
//
// PCI faculty/bios list page. Three rows — leadership, guest artists,
// STEM/contest faculty — with equal-size round portraits that link to
// individual /faculty/<slug> pages. Mirrors HBA's /faculty UX but with
// a smaller, hand-curated roster.

import Image from "next/image"
import Link from "next/link"
import {
  getPciPeopleByCategory,
  type PciPerson,
} from "@/app/_schools/pci/people"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `Faculty & Mentors — ${siteConfig.name}`,
  description:
    "The leadership, guest artists, and STEM faculty behind Pacific Crest Institute's programs.",
}

function PersonCircle({ person }: { person: PciPerson }) {
  return (
    <Link
      href={`/faculty/${person.slug}`}
      className="group flex flex-col items-center text-center"
    >
      <div className="relative w-40 h-40 lg:w-44 lg:h-44 rounded-full overflow-hidden bg-gray-100 ring-4 ring-white shadow-lg transition group-hover:shadow-2xl group-hover:ring-brand-orange">
        <Image
          src={person.image}
          alt={person.name}
          fill
          sizes="(max-width: 1024px) 160px, 176px"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-brand-navy-deep">
        {person.name}
      </h3>
      <p className="mt-1 max-w-[16rem] text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
        {person.role}
      </p>
      <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-gray-600 font-light">
        {person.shortBio}
      </p>
      <span className="mt-3 text-[11px] font-bold uppercase tracking-widest text-brand-navy-deep group-hover:text-brand-orange transition">
        Read bio →
      </span>
    </Link>
  )
}

function Row({
  eyebrow,
  heading,
  people,
}: {
  eyebrow: string
  heading: string
  people: PciPerson[]
}) {
  if (people.length === 0) return null
  return (
    <section className="py-16 lg:py-20 border-b border-gray-200 last:border-0">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl lg:text-4xl font-black tracking-tight text-brand-navy-deep">
            {heading}
          </h2>
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-x-12 gap-y-14">
          {people.map((p) => (
            <PersonCircle key={p.slug} person={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function PciFacultyPage() {
  const leadership = getPciPeopleByCategory("leadership")
  const artists = getPciPeopleByCategory("artists")
  const stem = getPciPeopleByCategory("stem")

  return (
    <main className="bg-white text-brand-navy-deep">
      {/* HERO */}
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
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-24 lg:pt-32 pb-16 lg:pb-20 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Faculty &amp; Mentors
          </p>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.0]">
            The people behind PCI.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base lg:text-lg text-white/80 leading-relaxed font-light">
            Leadership, guest artists from the comics industry, and STEM
            faculty who&rsquo;ve done the science. Click any portrait to
            read the full bio.
          </p>
        </div>
      </section>

      {/* ROWS */}
      <div className="bg-[#f6f4ef]">
        <Row eyebrow="Leadership" heading="Founders &amp; directors" people={leadership} />
        <Row
          eyebrow="Guest artists &amp; instructors"
          heading="Working professionals, in the room."
          people={artists}
        />
        <Row
          eyebrow="STEM &amp; contest faculty"
          heading="Behind the test-prep tracks."
          people={stem}
        />
      </div>

      {/* CTA */}
      <section className="bg-brand-navy-deep text-white py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-12 text-center">
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05]">
            Want to meet them in person?
          </h2>
          <p className="mt-6 text-base lg:text-lg text-white/80 font-light max-w-xl mx-auto">
            Reach out about a program, cohort, or campus visit. We&rsquo;re
            happy to set up an intro call.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Get in touch →
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center border border-white/40 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-white hover:text-brand-navy-deep transition"
            >
              About PCI
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
