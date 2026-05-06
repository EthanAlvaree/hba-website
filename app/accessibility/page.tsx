// app/accessibility/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function AccessibilityPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Accessibility"
        subtitle="Our commitment to making High Bluff Academy welcoming to every student and family."
        image="/images/policies/policy-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Our commitment
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
            A school for everyone.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            High Bluff Academy is committed to making our website, programs, and
            campus accessible to people with a wide range of abilities. We design with
            real students and families in mind — and we keep improving as we learn what
            works.
          </p>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-12">
          {[
            {
              heading: "Standards we follow",
              body: (
                <p>
                  We aim for our website to conform to the Web Content Accessibility
                  Guidelines (WCAG) 2.1 Level AA, the standard published by the World
                  Wide Web Consortium (W3C). These guidelines explain how to make web
                  content more accessible to people with disabilities, including
                  visual, auditory, motor, and cognitive differences.
                </p>
              ),
            },
            {
              heading: "What that looks like in practice",
              body: (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Semantic HTML so screen readers can navigate the site</li>
                  <li>• Sufficient color contrast for headings, body text, and links</li>
                  <li>• Keyboard navigation for menus, forms, and interactive elements</li>
                  <li>• Descriptive alt text on photographs and decorative images</li>
                  <li>• Clear focus styles so you always know where you are</li>
                  <li>• Forms that work with assistive technology</li>
                </ul>
              ),
            },
            {
              heading: "Ongoing work",
              body: (
                <p>
                  Accessibility isn’t a checkbox — it’s an ongoing practice. As we add
                  new pages, photographs, and forms, we test them against our standards
                  and fix issues we find. We also welcome feedback from families,
                  applicants, and visitors who notice something we’ve missed.
                </p>
              ),
            },
            {
              heading: "Known limitations",
              body: (
                <p>
                  Some third-party tools embedded on our site (for example, our
                  enrollment portal and form provider) are maintained by other
                  organizations. We choose accessible vendors when we can and contact
                  them when we discover issues, but we cannot guarantee third-party
                  content meets every standard.
                </p>
              ),
            },
            {
              heading: "Get help or report a barrier",
              body: (
                <p>
                  If you encounter a barrier on the website or at HBA, or if you need
                  information in an alternative format (large print, audio, plain
                  text), please contact us. We’ll respond promptly and work with you to
                  find a solution.
                </p>
              ),
            },
            {
              heading: "Campus accessibility",
              body: (
                <p>
                  Our Rancho Santa Fe campus is small and personal, and we’re happy to
                  walk through specific accessibility questions before a visit or
                  enrollment decision. Reach out and we’ll talk it through.
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
            Tell us
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            See something we should fix?
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto">
            Your feedback makes the site better for everyone. Let us know what you
            found and we’ll get to work.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Send feedback
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
