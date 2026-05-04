// app/community/store/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "School store — High Bluff Academy",
  description:
    "Order official transcripts through Parchment, request graduation caps and gowns, and reserve yearbooks.",
}

const PARCHMENT_URL = "https://www.parchment.com/u/registration/34903511/institution"

type Service = {
  eyebrow: string
  title: string
  description: string
  detail: string
  href: string
  cta: string
  external?: boolean
  /** Optional inline tag, e.g. "12th grade only" */
  tag?: string
  icon: React.ReactNode
}

const services: Service[] = [
  {
    eyebrow: "Transcripts",
    title: "Order an official transcript.",
    description:
      "Current and former students can order official transcripts and credentials securely through our Parchment partner.",
    detail:
      "Electronic delivery to colleges, employers, or any verified recipient — typically within 1–2 business days.",
    href: "/transcripts",
    cta: "Order through Parchment",
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="14 3 14 9 20 9" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
  {
    eyebrow: "Graduation",
    title: "Caps and gowns.",
    description:
      "Seniors order their graduation regalia through the school office. Gowns, caps, and tassels in HBA colors are included with the senior graduation fee.",
    detail:
      "Sizing happens in early spring. Contact the office with questions about replacements or guests.",
    href: "/contact",
    cta: "Contact the office",
    tag: "12th grade",
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 10 12 5 2 10l10 5 10-5z" />
        <path d="M6 12v5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-5" />
        <line x1="22" y1="10" x2="22" y2="16" />
      </svg>
    ),
  },
  {
    eyebrow: "Yearbooks",
    title: "Reserve a yearbook.",
    description:
      "Students publish an art and literary magazine each fall and spring, and the annual yearbook captures the full school year — clubs, athletics, events, and senior pages.",
    detail:
      "Yearbook orders are taken in late spring. Contact the office to reserve a copy or check on past editions.",
    href: "/contact",
    cta: "Reserve a yearbook",
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
]

export default function StorePage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="School store"
        subtitle="Order official documents, graduation regalia, and keepsakes from High Bluff Academy."
        image="/images/community/store-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Official orders
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
            Everything you need to order from HBA.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            Whether you&rsquo;re a senior preparing for graduation, an alumnus requesting a
            transcript for a college or employer, or a parent reserving a yearbook,
            you&rsquo;ll find the right link below.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="pb-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 space-y-12">
          <div className="grid gap-8 md:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.eyebrow}
                className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 hover:shadow-2xl transition-shadow p-8 flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-[#1f3f66] text-white flex items-center justify-center">
                    {service.icon}
                  </div>
                  {service.tag && (
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#f37021] bg-[#f37021]/10 px-3 py-1 rounded-full">
                      {service.tag}
                    </span>
                  )}
                </div>

                <div className="mt-6 text-xs font-bold tracking-widest uppercase text-[#f37021]">
                  {service.eyebrow}
                </div>
                <h3 className="mt-2 text-xl font-extrabold text-[#1f3f66] leading-tight">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                  {service.description}
                </p>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  {service.detail}
                </p>

                {service.external ? (
                  <a
                    href={service.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow hover:brightness-110 transition"
                  >
                    {service.cta} →
                  </a>
                ) : (
                  <Link
                    href={service.href}
                    className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow hover:brightness-110 transition"
                  >
                    {service.cta} →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* QUICK PARCHMENT CARD */}
          <div className="bg-[#1f3f66] rounded-3xl px-8 py-10 lg:px-12 lg:py-12 text-white grid gap-6 lg:grid-cols-12 items-center shadow-2xl">
            <div className="lg:col-span-8 space-y-3">
              <div className="text-xs font-bold tracking-widest uppercase text-white/70">
                Need a transcript right now?
              </div>
              <h3 className="text-2xl lg:text-3xl font-extrabold">
                Skip ahead to Parchment.
              </h3>
              <p className="text-white/85 font-light text-sm">
                If you&rsquo;ve ordered through HBA before, you can go straight to your
                Parchment account.
              </p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <a
                href={PARCHMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-[#1f3f66] font-semibold text-sm hover:bg-[#f37021] hover:text-white transition"
              >
                Open Parchment →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT FALLBACK */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Need something else?
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            For special requests — duplicate diplomas, replacement regalia, archival
            yearbooks, or anything we haven&rsquo;t listed — the school office is happy to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a
              href="mailto:info@highbluffacademy.com"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Email the office
            </a>
            <a
              href="tel:+18585099101"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
            >
              Call (858) 509-9101
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
