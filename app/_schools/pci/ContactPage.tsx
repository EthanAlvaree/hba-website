// app/_schools/pci/ContactPage.tsx
//
// Pacific Crest Institute contact page. Reuses the existing
// <ContactForm> component (Turnstile-protected, posts to /api/contact)
// — that endpoint already routes to siteConfig.contact.infoEmail, so
// PCI's submissions go to info@pacificcrestinstitute.com automatically.

import ContactForm from "@/app/contact/ContactForm"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `Contact — ${siteConfig.name}`,
  description: `Get in touch with ${siteConfig.name}. We respond to most inquiries within one business day.`,
}

export default function PciContactPage() {
  const { contact } = siteConfig
  const hasPhone = !contact.phone.startsWith("TODO_")

  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative bg-brand-navy-deep text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-black opacity-95" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-28 lg:pt-36 pb-20 lg:pb-28">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Get in touch
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-3xl">
            Tell us what your student is into.
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            Questions about programs, cohorts, schedules, or whether
            PCI is the right fit? Drop a note — we usually respond
            within one business day.
          </p>
        </div>
      </section>

      {/* ─── CONTACT GRID ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid gap-14 lg:grid-cols-12">
          {/* Direct contact column */}
          <aside className="lg:col-span-4 space-y-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                General inquiries
              </p>
              <a
                href={`mailto:${contact.infoEmail}`}
                className="mt-2 block text-xl lg:text-2xl font-black tracking-tight break-all hover:text-brand-orange transition"
              >
                {contact.infoEmail}
              </a>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                Admissions
              </p>
              <a
                href={`mailto:${contact.admissionsEmail}`}
                className="mt-2 block text-xl lg:text-2xl font-black tracking-tight break-all hover:text-brand-orange transition"
              >
                {contact.admissionsEmail}
              </a>
            </div>
            {hasPhone && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                  Phone
                </p>
                <a
                  href={`tel:${contact.phoneTel}`}
                  className="mt-2 block text-xl lg:text-2xl font-black tracking-tight hover:text-brand-orange transition"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                Response time
              </p>
              <p className="mt-2 text-base text-gray-700 leading-relaxed font-light">
                We aim to respond within one business day. For urgent
                program questions, email admissions directly.
              </p>
            </div>
          </aside>

          {/* Form column */}
          <div className="lg:col-span-8">
            <div className="bg-[#f6f4ef] p-6 lg:p-10 border-t-4 border-brand-orange">
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-brand-navy-deep">
                Send a message
              </h2>
              <p className="mt-2 text-base text-gray-700 font-light">
                We&rsquo;ll reply by email. Fields marked with an
                asterisk are required.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
