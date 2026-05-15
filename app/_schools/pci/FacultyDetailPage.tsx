// app/_schools/pci/FacultyDetailPage.tsx
//
// Per-person detail page for PCI faculty/mentors. Mirrors HBA's bio
// detail UX (portrait, role, lead paragraph, full bio, prev/next, CTA)
// but reads from the hand-curated app/_schools/pci/people.ts roster.

import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  getPciPersonBySlug,
  getPciNeighbors,
} from "@/app/_schools/pci/people"
import { siteConfig } from "@/lib/site"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const person = getPciPersonBySlug(slug)
  if (!person) return { title: `Faculty — ${siteConfig.name}` }
  return {
    title: `${person.name} — ${siteConfig.name}`,
    description: person.shortBio,
    openGraph: {
      title: `${person.name} — ${siteConfig.name}`,
      description: person.shortBio,
      images: [{ url: person.image }],
      type: "profile",
    },
  }
}

export default async function PciFacultyDetailPage({ params }: Props) {
  const { slug } = await params
  const person = getPciPersonBySlug(slug)
  if (!person) notFound()

  const neighbors = getPciNeighbors(slug)
  const paragraphs = person.fullBio.split("\n\n").filter(Boolean)

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.role,
    image: person.image,
    description: person.shortBio,
    worksFor: {
      "@type": "EducationalOrganization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  }

  return (
    <main className="bg-white text-brand-navy-deep">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      {/* Profile header */}
      <section className="bg-[#f6f4ef] py-20 lg:py-28 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid gap-12 lg:grid-cols-12 items-start">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 shadow-2xl">
              <Image
                src={person.image}
                alt={person.name}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* Heading + lead */}
          <div className="lg:col-span-7 space-y-5">
            <Link
              href="/faculty"
              className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:text-brand-orange transition"
            >
              ← Faculty &amp; Mentors
            </Link>

            <div className="text-[11px] font-bold tracking-[0.24em] uppercase text-brand-orange">
              {person.role}
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
              {person.name}
            </h1>

            <p className="text-lg text-brand-navy-deep leading-relaxed font-light italic border-l-4 border-brand-orange pl-5">
              {person.shortBio}
            </p>
          </div>
        </div>
      </section>

      {/* Full bio */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-6 lg:px-12">
          <div className="space-y-5 text-gray-700 leading-relaxed text-base lg:text-lg font-light">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Prev / next */}
      {neighbors && (
        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 lg:px-12 py-8 grid gap-4 sm:grid-cols-3 items-center">
            <Link href={`/faculty/${neighbors.prev.slug}`} className="group block text-left">
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">
                ← Previous
              </div>
              <div className="text-sm font-bold text-brand-navy-deep group-hover:text-brand-orange transition">
                {neighbors.prev.name}
              </div>
              <div className="text-xs text-gray-500">{neighbors.prev.role}</div>
            </Link>

            <div className="text-center">
              <Link
                href="/faculty"
                className="inline-flex items-center justify-center px-5 py-2 rounded-none border border-brand-navy-deep text-brand-navy-deep font-bold uppercase tracking-widest text-xs hover:bg-brand-navy-deep hover:text-white transition"
              >
                All faculty
              </Link>
            </div>

            <Link href={`/faculty/${neighbors.next.slug}`} className="group block text-right">
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">
                Next →
              </div>
              <div className="text-sm font-bold text-brand-navy-deep group-hover:text-brand-orange transition">
                {neighbors.next.name}
              </div>
              <div className="text-xs text-gray-500">{neighbors.next.role}</div>
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-brand-navy-deep text-white py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-12 text-center">
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
            Want to learn more?
          </h2>
          <p className="mt-5 text-base lg:text-lg text-white/80 font-light max-w-2xl mx-auto">
            Reach out about a program, schedule, or whether {siteConfig.shortName} is the
            right fit for your student.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Contact admissions
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
