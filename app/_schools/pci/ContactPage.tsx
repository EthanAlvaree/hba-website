// app/_schools/pci/ContactPage.tsx
//
// Pacific Crest Institute contact page. Reuses the existing
// <ContactForm> component (Turnstile-protected, posts to /api/contact)
// — that endpoint already routes to siteConfig.contact.infoEmail, so
// PCI's submissions go to info@pacificcrestinstitute.com automatically.
// PCI-specific copy lives here; the form itself is school-agnostic.

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
    <main className="bg-gray-50">
      {/* HERO */}
      <section className="bg-gradient-to-br from-brand-navy via-[#1f5f6b] to-brand-navy-deep text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-orange">
            Contact
          </p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-extrabold tracking-tight">
            Talk to {siteConfig.shortName}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-white/90 font-light leading-relaxed">
            Questions about programs, schedules, or whether
            {" "}{siteConfig.shortName} is the right fit? Drop us a note —
            we usually respond within one business day.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 grid gap-10 md:grid-cols-[1fr_2fr]">
          {/* Direct contact info */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Email
              </p>
              <a
                href={`mailto:${contact.infoEmail}`}
                className="mt-1 block text-brand-navy font-semibold hover:underline break-all"
              >
                {contact.infoEmail}
              </a>
            </div>
            {hasPhone && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                  Phone
                </p>
                <a
                  href={`tel:${contact.phoneTel}`}
                  className="mt-1 block text-brand-navy font-semibold hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Admissions
              </p>
              <a
                href={`mailto:${contact.admissionsEmail}`}
                className="mt-1 block text-brand-navy font-semibold hover:underline break-all"
              >
                {contact.admissionsEmail}
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">
            <h2 className="text-2xl font-extrabold text-brand-navy">
              Send a message
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              We&rsquo;ll get back to you by email.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
