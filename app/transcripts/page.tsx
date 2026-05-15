// app/transcripts/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "Order a transcript — High Bluff Academy",
  description:
    "Current and former HBA students can order official transcripts and other credentials securely through Parchment.",
}

const PARCHMENT_URL = "https://www.parchment.com/u/registration/34903511/institution"

export default function TranscriptsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Order a transcript"
        subtitle="Securely request official transcripts and credentials through Parchment."
        image="/images/hba/transcripts/hero.webp"
      />

      <Breadcrumbs />

      <section className="py-24 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 text-center space-y-8">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Powered by Parchment
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            High Bluff Academy has partnered with Parchment.
          </h2>

          <p className="text-lg text-gray-600 font-light leading-relaxed">
            Current and former HBA students can order and send official transcripts and
            other credentials securely through Parchment. Transcripts are delivered
            electronically to colleges, employers, and any verified recipient you specify.
          </p>

          <div className="pt-2">
            <a
              href={PARCHMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-brand-navy text-white font-semibold shadow-lg hover:brightness-110 transition"
            >
              Order through Parchment →
            </a>
          </div>

          <p className="text-sm text-gray-500">
            You’ll be redirected to Parchment to register and complete your order.
          </p>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 grid gap-6 sm:grid-cols-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-brand-navy mb-2">
              First-time users
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Create a free Parchment account using the link above, verify your identity, and
              place your order. Most electronic transcripts deliver within 1–2 business days.
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-brand-navy mb-2">
              Need help?
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have trouble ordering or have questions about an in-progress request,
              email{" "}
              <a
                href={`mailto:${siteConfig.contact.admissionsEmail}`}
                className="text-brand-orange font-medium hover:underline"
              >
                {siteConfig.contact.admissionsEmail}
              </a>
              {" "}or call {siteConfig.contact.phone}.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/community/alumni"
            className="text-sm font-semibold text-brand-navy hover:text-brand-orange"
          >
            Back to alumni resources →
          </Link>
        </div>
      </section>
    </main>
  )
}
