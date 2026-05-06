// app/terms/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function TermsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Terms of use"
        subtitle="The rules of the road for using highbluffacademy.com."
        image="/images/policies/policy-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Effective May 2026
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
            A clear set of expectations.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            By using highbluffacademy.com, you agree to these terms. They’re short,
            written in plain language, and meant to keep the site safe and useful for
            everyone in the HBA community.
          </p>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-12">
          {[
            {
              heading: "Acceptance of terms",
              body: (
                <p>
                  Accessing or using this website constitutes acceptance of these terms.
                  If you do not agree, please do not use the site.
                </p>
              ),
            },
            {
              heading: "Permitted use",
              body: (
                <>
                  <p>
                    You may use this site for personal, non-commercial purposes, and to
                    learn about, apply to, or stay connected with High Bluff Academy.
                    You agree not to:
                  </p>
                  <ul className="space-y-2 mt-3 text-gray-700 text-sm">
                    <li>• Attempt to disrupt or compromise the site or its security</li>
                    <li>• Scrape or copy the site at scale without written permission</li>
                    <li>• Submit false, misleading, or another person’s information</li>
                    <li>• Use the site to harass, threaten, or impersonate anyone</li>
                  </ul>
                </>
              ),
            },
            {
              heading: "Intellectual property",
              body: (
                <p>
                  Site content — including text, photographs, graphics, logos, and the
                  HBA name — is the property of High Bluff Academy or its licensors and
                  is protected by U.S. copyright and trademark law. You may share links
                  to public pages but may not reproduce content without permission.
                </p>
              ),
            },
            {
              heading: "User-submitted content",
              body: (
                <p>
                  When you send us a message, application, or photo, you give HBA
                  permission to use it for the purpose for which it was submitted (for
                  example, to evaluate an admissions inquiry, respond to a question, or
                  publish a faculty bio). You confirm you have the right to share it.
                </p>
              ),
            },
            {
              heading: "Third-party links and services",
              body: (
                <p>
                  This site links to and embeds third-party services such as Gradelink
                  (enrollment), Tally (forms), and social platforms. We don’t control
                  those services and aren’t responsible for their content or practices.
                  Their terms and privacy policies govern your use of them.
                </p>
              ),
            },
            {
              heading: "Disclaimers",
              body: (
                <p>
                  The site is provided “as is.” We make reasonable efforts to keep
                  information accurate and current, but we don’t guarantee completeness
                  or availability. Course offerings, tuition, dates, and other details
                  may change.
                </p>
              ),
            },
            {
              heading: "Limitation of liability",
              body: (
                <p>
                  To the fullest extent permitted by law, HBA is not liable for indirect
                  or consequential damages arising out of your use of the site. Nothing
                  here limits liability for matters that cannot lawfully be limited.
                </p>
              ),
            },
            {
              heading: "Changes to these terms",
              body: (
                <p>
                  We may update these terms from time to time. The effective date at the
                  top reflects the most recent revision. Continued use of the site after
                  an update means you accept the changes.
                </p>
              ),
            },
            {
              heading: "Governing law",
              body: (
                <p>
                  These terms are governed by the laws of the State of California,
                  without regard to its conflict-of-laws principles.
                </p>
              ),
            },
          ].map((section) => (
            <div
              key={section.heading}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <h3 className="text-xl font-extrabold text-[#1f3f66] mb-4">
                {section.heading}
              </h3>
              <div className="text-gray-600 leading-relaxed font-light text-base space-y-3">
                {section.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
            Questions?
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Reach out anytime.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto">
            If something on this page is unclear or you’d like to flag an issue, the HBA
            office is happy to help.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact the office
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
