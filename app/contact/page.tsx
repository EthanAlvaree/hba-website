import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { schoolKey, siteConfig } from "@/lib/site"
import ContactForm from "./ContactForm"
import PciContactPage from "@/app/_schools/pci/ContactPage"

export default function ContactPage() {
  if (schoolKey === "pci") return <PciContactPage />
  return <HbaContact />
}

function HbaContact() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      {/* HERO */}
      <PageHero
        title="Contact High Bluff Academy"
        subtitle="We’re here to help — reach out anytime."
        image="/images/hba/contact/contact-hero.webp"
      />

      <Breadcrumbs />

      <section className="bg-white py-16 lg:py-20">
        <div className="reveal mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-12 xl:gap-14">
          <div className="space-y-8 lg:pt-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Contact HBA
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-[#12233d] lg:text-5xl">
                Let’s connect.
              </h2>
              <p className="text-lg leading-relaxed text-slate-600">
                Reach out with questions about admissions, scheduling, student support, or next steps. The form stays front and center, and our office team can also help by phone, email, or in person.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Call us
                </p>
                <a
                  href={`tel:${siteConfig.contact.phoneTel}`}
                  className="mt-3 block text-2xl font-semibold tracking-tight text-[#12233d] transition hover:text-brand-orange"
                >
                  {siteConfig.contact.phone}
                </a>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  Best for quick questions about scheduling, admissions timing, and general office support.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Email admissions
                </p>
                <a
                  href={`mailto:${siteConfig.contact.admissionsEmail}`}
                  className="mt-3 block break-all text-xl font-semibold tracking-tight text-[#12233d] transition hover:text-brand-orange"
                >
                  {siteConfig.contact.admissionsEmail}
                </a>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  A good fit for sending school records, longer questions, or follow-up information.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-6 shadow-sm sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Visit us
                </p>
                <div className="mt-3 space-y-1 text-xl font-semibold tracking-tight text-[#12233d]">
                  <p>5531 Cancha de Golf, Ste 202</p>
                  <p>Rancho Santa Fe, CA 92091</p>
                </div>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  Schedule a campus visit to meet the team and get a feel for the HBA experience in person.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href={`mailto:${siteConfig.contact.admissionsEmail}`}
                className="inline-flex items-center justify-center rounded-full bg-brand-navy px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Email admissions
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=5531+Cancha+de+Golf+Ste+202,+Rancho+Santa+Fe,+CA+92091"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-brand-navy px-6 py-3 text-sm font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white"
              >
                Get directions
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-[2rem] bg-brand-orange/12 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_24px_80px_rgba(18,35,61,0.18)]">
              <div className="border-b border-slate-200 bg-gradient-to-r from-[#24375a] via-[#31466b] to-[#486184] px-8 py-8 text-white sm:px-10">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
                  Send us a message
                </p>
                <h3 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Start the conversation here.
                </h3>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
                  Share a question, request a call, or ask about scheduling a tour. We typically respond within one business day.
                </p>
              </div>

              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* MAP SECTION */}
      <section className="bg-slate-100 py-20 lg:py-24">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#12233d]">
              Find us
            </h2>
            <p className="text-sm text-gray-600">
              5531 Cancha de Golf, Ste 202 · Rancho Santa Fe, CA 92091
            </p>
          </div>

          <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
            <iframe
              title="High Bluff Academy on Google Maps"
              src="https://www.google.com/maps?q=5531+Cancha+de+Golf+Ste+202,+Rancho+Santa+Fe,+CA+92091&output=embed"
              width="100%"
              height="100%"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="border-0"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=5531+Cancha+de+Golf+Ste+202,+Rancho+Santa+Fe,+CA+92091"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-navy text-white font-semibold text-sm hover:brightness-110 transition"
            >
              Get directions
            </a>
            <a
              href="https://www.google.com/maps/place/5531+Cancha+de+Golf+Ste+202,+Rancho+Santa+Fe,+CA+92091"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-brand-navy text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white transition"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
