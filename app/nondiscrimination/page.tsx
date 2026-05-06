// app/nondiscrimination/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function NondiscriminationPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Non-discrimination statement"
        subtitle="High Bluff Academy welcomes students and employees of every background."
        image="/images/policies/policy-hero.webp"
      />

      <Breadcrumbs />

      {/* STATEMENT */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Our policy
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
            One school, every student.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            High Bluff Academy admits students of any race, color, national or ethnic
            origin, religion, sex, sexual orientation, gender identity or expression,
            age, disability, or other status protected by law to all the rights,
            privileges, programs, and activities generally accorded or made available to
            students at the school.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            We do not discriminate on the basis of any of these characteristics in the
            administration of our educational policies, admissions policies,
            scholarship and tuition assistance programs, athletics, or other
            school-administered programs. The same standard applies to employment.
          </p>
        </div>
      </section>

      {/* DETAIL */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 space-y-12">
          {[
            {
              heading: "Programs covered",
              body: (
                <p>
                  This statement applies to all aspects of school life, including
                  admissions, instruction, academic counseling, financial aid,
                  athletics, extracurricular activities, discipline, and access to
                  facilities. It also applies to recruitment, hiring, promotion,
                  compensation, and treatment of employees.
                </p>
              ),
            },
            {
              heading: "Reporting concerns",
              body: (
                <p>
                  Students, families, employees, and applicants who believe they have
                  experienced or witnessed discrimination, harassment, or retaliation
                  are encouraged to report it to the head of school or the director of
                  admissions and operations. Reports can be made in person, by phone,
                  or in writing. Concerns will be taken seriously, investigated
                  promptly, and handled with appropriate care for everyone involved.
                </p>
              ),
            },
            {
              heading: "Retaliation is prohibited",
              body: (
                <p>
                  HBA prohibits retaliation against any individual who in good faith
                  reports a concern, participates in an investigation, or otherwise
                  exercises their rights under this policy.
                </p>
              ),
            },
            {
              heading: "Continuous review",
              body: (
                <p>
                  This statement is reviewed periodically and updated as needed to
                  reflect changes in law and best practice. Families and employees are
                  notified when material changes are made.
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
            Speak up
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            We’re here to listen.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto">
            Whether you want to report a concern, ask a question, or talk through a
            situation in confidence, the HBA office is here to help.
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
