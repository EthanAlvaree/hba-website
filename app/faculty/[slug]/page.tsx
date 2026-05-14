// app/faculty/[slug]/page.tsx

import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getFacultyBySlug, getNeighbors } from "@/lib/faculty"
import { siteConfig } from "@/lib/site"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const member = await getFacultyBySlug(slug)
  if (!member) return { title: "Faculty — High Bluff Academy" }

  return {
    title: `${member.name} — High Bluff Academy`,
    description: member.shortBio,
    openGraph: {
      title: `${member.name} — High Bluff Academy`,
      description: member.shortBio,
      images: [{ url: member.image }],
      type: "profile",
    },
  }
}

export default async function FacultyDetailPage({ params }: Props) {
  const { slug } = await params
  const member = await getFacultyBySlug(slug)
  if (!member) notFound()

  const neighbors = await getNeighbors(slug)
  const paragraphs = member.fullBio.split("\n\n").filter(Boolean)

  // Schema.org Person markup — helps search engines understand the page.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: member.name,
    jobTitle: member.title,
    image: member.image,
    description: member.shortBio,
    worksFor: {
      "@type": "EducationalOrganization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  }

  return (
    <main className="bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <Breadcrumbs />

      {/* Profile header */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-12 lg:grid-cols-12 items-start">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl bg-gray-100">
              <Image
                src={member.image}
                alt={member.name}
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
              className="inline-flex items-center text-sm font-semibold text-brand-navy hover:text-brand-orange transition"
            >
              ← Faculty and staff
            </Link>

            <div className="text-xs font-bold tracking-[0.18em] uppercase text-brand-orange">
              {member.area}
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-navy leading-tight">
              {member.name}
            </h1>

            <p className="text-lg text-gray-600 font-medium">{member.title}</p>

            <p className="text-lg text-gray-700 leading-relaxed font-light italic border-l-4 border-brand-orange pl-5">
              {member.shortBio}
            </p>

            {(member.hbaStart ||
              member.careerStart ||
              (member.coursesTaught && member.coursesTaught.length > 0)) && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 lg:p-7 space-y-5">
                {(member.hbaStart || member.careerStart) && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {member.hbaStart && (
                      <div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-brand-orange mb-1.5">
                          At HBA since
                        </div>
                        <div className="text-base font-semibold text-brand-navy">
                          {member.hbaStart}
                        </div>
                      </div>
                    )}
                    {member.careerStart && (
                      <div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-brand-orange mb-1.5">
                          Teaching since
                        </div>
                        <div className="text-base font-semibold text-brand-navy">
                          {member.careerStart}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {member.coursesTaught && member.coursesTaught.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-brand-orange mb-2.5">
                      Courses taught at HBA
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {member.coursesTaught.map((c) => (
                        <li
                          key={c}
                          className="inline-block rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-brand-navy"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full bio */}
      <section className="pb-20 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12">
          <div className="space-y-5 text-gray-700 leading-relaxed text-base lg:text-lg font-light">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Prev / next navigation */}
      {neighbors && (
        <section className="border-y border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 py-8 grid gap-4 sm:grid-cols-3 items-center">
            <Link
              href={`/faculty/${neighbors.prev.slug}`}
              className="group block text-left"
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">
                ← Previous
              </div>
              <div className="text-sm font-semibold text-brand-navy group-hover:text-brand-orange transition">
                {neighbors.prev.name}
              </div>
              <div className="text-xs text-gray-500">{neighbors.prev.title}</div>
            </Link>

            <div className="text-center">
              <Link
                href="/faculty"
                className="inline-flex items-center justify-center px-5 py-2 rounded-full border border-brand-navy text-brand-navy font-semibold text-xs hover:bg-brand-navy hover:text-white transition"
              >
                All faculty
              </Link>
            </div>

            <Link
              href={`/faculty/${neighbors.next.slug}`}
              className="group block text-right"
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">
                Next →
              </div>
              <div className="text-sm font-semibold text-brand-navy group-hover:text-brand-orange transition">
                {neighbors.next.name}
              </div>
              <div className="text-xs text-gray-500">{neighbors.next.title}</div>
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-brand-navy">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Want to learn more?
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light">
            Get in touch with our admissions team to learn more about {member.name.split(",")[0]}’s
            classes, schedule a campus tour, or ask any question about life at HBA.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact admissions
            </Link>
            <Link
              href="/admissions"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Explore admissions
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
