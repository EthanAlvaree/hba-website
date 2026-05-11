// app/privacy/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export default function PrivacyPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Privacy policy"
        subtitle="How we collect, use, and protect information at High Bluff Academy."
        image="/images/policies/policy-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Effective May 2026
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
            Your privacy matters.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            High Bluff Academy (“HBA,” “we,” “us”) is committed to protecting the privacy
            of students, families, alumni, and visitors to our website. This policy
            explains what information we collect, how we use it, and the choices you have.
          </p>
          <p className="text-sm text-gray-500">
            By using {siteConfig.domain} or sharing information with us through forms,
            email, or in person, you agree to the practices described here.
          </p>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-12">
          {[
            {
              heading: "Information we collect",
              body: (
                <>
                  <p>We collect information in three ways:</p>
                  <ul className="space-y-2 mt-3 text-gray-700 text-sm">
                    <li>
                      <strong>Information you provide.</strong> When you complete a
                      contact form, request a tour, apply for admission, or correspond
                      with us, you may share your name, email, phone number, your
                      student’s information, and any details you choose to include in
                      your message.
                    </li>
                    <li>
                      <strong>Information collected automatically.</strong> Our website
                      records standard technical data such as IP address, browser type,
                      pages visited, and referring URLs. This is used for site
                      performance and security.
                    </li>
                    <li>
                      <strong>Information from third-party services.</strong> Tools like
                      our enrollment platform (Gradelink), spam-prevention tools,
                      cloud-hosted storage, and Microsoft 365 may process the
                      information you submit through the site. Their handling of your
                      data is governed by their own privacy policies and service terms.
                    </li>
                  </ul>
                </>
              ),
            },
            {
              heading: "How we use information",
              body: (
                <>
                  <p>
                    We use the information we collect to operate the school and respond
                    to inquiries — for example, to schedule tours, process applications,
                    deliver instruction, communicate with families, and improve our
                    programs and website. We do not sell personal information.
                  </p>
                </>
              ),
            },
            {
              heading: "Sharing and disclosure",
              body: (
                <>
                  <p>
                    We share information only with people and services that need it to
                    do their jobs: faculty and staff, our enrollment and learning
                    platforms, payment processors, accreditors, and government agencies
                    when required by law. We do not share student information with third
                    parties for marketing purposes.
                  </p>
                </>
              ),
            },
            {
              heading: "Cookies and analytics",
              body: (
                <>
                  <p>
                    We use a small number of cookies and analytics tools to understand
                    how the website is used and to keep it secure. You can control
                    cookies through your browser settings; some features may not work as
                    expected if cookies are disabled.
                  </p>
                </>
              ),
            },
            {
              heading: "Student records (FERPA)",
              body: (
                <>
                  <p>
                    Educational records are protected under the Family Educational
                    Rights and Privacy Act (FERPA) and California state law. Parents and
                    eligible students have the right to inspect, request corrections to,
                    and consent to the disclosure of personally identifiable information
                    in those records, subject to the exceptions FERPA allows.
                  </p>
                </>
              ),
            },
            {
              heading: "Your rights and choices",
              body: (
                <>
                  <p>
                    You can ask us what information we have about you, request
                    corrections, or ask us to delete information that is no longer
                    needed. You can also unsubscribe from school communications at any
                    time. Contact the office to make a request.
                  </p>
                </>
              ),
            },
            {
              heading: "Data security",
              body: (
                <>
                  <p>
                    We use reasonable administrative, technical, and physical
                    safeguards to protect information. No system is perfectly secure, so
                    we encourage families to share sensitive information through trusted
                    channels rather than over open email.
                  </p>
                </>
              ),
            },
            {
              heading: "Children’s privacy",
              body: (
                <>
                  <p>
                    Our website is intended for parents, students, and prospective
                    families. We do not knowingly collect information from children
                    under 13 outside the context of school-related activities, where
                    such collection is governed by parental consent and FERPA.
                  </p>
                </>
              ),
            },
            {
              heading: "Updates to this policy",
              body: (
                <>
                  <p>
                    We may update this policy from time to time. The effective date at
                    the top reflects the most recent revision. Material changes will be
                    communicated to families when appropriate.
                  </p>
                </>
              ),
            },
          ].map((section) => (
            <div
              key={section.heading}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <h3 className="text-xl font-extrabold text-brand-navy mb-4">
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
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
            Questions?
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            We’re happy to talk it through.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto">
            If you have questions about this policy or want to make a request about your
            information, contact the HBA office.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact the office
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
