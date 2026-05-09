// app/community/partnerships/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "Partnerships — High Bluff Academy",
  description:
    "HBA partners with leading San Diego organizations in test prep, tutoring, fitness, and student dining to extend the resources available to every student.",
}

type Partner = {
  name: string
  category: string
  shortDesc: string
  description: string
  image: string
  /** External website. Omit if not yet shareable. */
  website?: string
  /** "Coming soon" or "TBA" tag. */
  status?: string
}

const partners: Partner[] = [
  {
    name: "Pacific Crest Institute",
    category: "Test prep · Visual arts",
    shortDesc: "Targeted SAT/ACT preparation and serious visual-arts instruction.",
    description:
      "Pacific Crest Institute partners with HBA to extend our test prep and arts offerings — from focused SAT and ACT courses to portfolio-grade studio and digital art instruction. Students benefit from specialist teachers and a structured approach that complements our in-house college counseling.",
    image: "/images/partnerships/pacific-crest.webp",
  },
  {
    name: "Study Hut Tutoring",
    category: "Tutoring · Academic support",
    shortDesc: "On-demand tutoring across every subject HBA teaches.",
    description:
      "Study Hut Tutoring is a longtime San Diego partner. HBA students can access one-on-one and small-group tutoring through Study Hut for math, science, writing, world languages, and standardized test prep — including extra support over evenings and weekends.",
    image: "/images/partnerships/study-hut.webp",
  },
  {
    name: "Joy of Life Fitness",
    category: "Fitness · Wellness",
    shortDesc: "Structured PE, weight training, Pilates, and yoga in small groups.",
    description:
      "Through our partnership with Joy of Life Fitness, students have access to a full physical education program: regular PE classes, weight training, Pilates, yoga, and small-group fitness sessions. The collaboration supports strength, flexibility, and overall wellness while keeping the personalized attention that defines an HBA experience.",
    image: "/images/partnerships/joy-of-life.webp",
  },
  {
    name: "Student dining partner",
    category: "Catering · Daily meals",
    shortDesc: "A trusted local restaurant providing fresh daily lunches.",
    description:
      "We’re finalizing a partnership with a local restaurant to provide fresh, balanced lunches to HBA students every school day. Details and the partner announcement will be shared here soon.",
    image: "/images/partnerships/dining.webp",
    status: "Coming soon",
  },
]

export default function PartnershipsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Partnerships"
        subtitle="Specialist organizations that extend the resources available to every HBA student."
        image="/images/partnerships/hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Better together
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
            Specialists in their fields, partnered with HBA.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            We focus on what we do best — small-class, college-preparatory academics — and
            partner with trusted organizations for the specialist services that round out
            an HBA education. The result is more depth, more options, and better outcomes
            for our students.
          </p>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="pb-24 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 pt-16 space-y-10">
          {partners.map((partner, idx) => (
            <article
              key={partner.name}
              className={`grid gap-10 lg:grid-cols-12 items-center ${
                idx % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="lg:col-span-5">
                <div className="relative h-[320px] rounded-3xl overflow-hidden shadow-xl bg-white">
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    fill
                    className="object-contain p-8"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-bold tracking-widest text-brand-orange uppercase">
                    {partner.category}
                  </div>
                  {partner.status && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-brand-navy bg-brand-navy/10 px-3 py-1 rounded-full">
                      {partner.status}
                    </span>
                  )}
                </div>

                <h3 className="text-3xl font-extrabold text-brand-navy">{partner.name}</h3>
                <p className="text-lg font-medium text-gray-800">{partner.shortDesc}</p>
                <p className="text-gray-600 font-light leading-relaxed">
                  {partner.description}
                </p>

                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-semibold text-brand-orange hover:underline pt-2"
                  >
                    Visit website →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* PARTNER WITH US CTA */}
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Interested in partnering with HBA?
          </h2>
          <p className="text-lg text-white/90 font-light">
            We’re always open to thoughtful collaborations with organizations that share
            our commitment to small-group, student-centered learning. Reach out to start a
            conversation.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Get in touch
            </Link>
            <Link
              href="/community"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Back to community
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
