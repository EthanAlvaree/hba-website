// app/admissions/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export default function AdmissionsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      {/* HERO */}
      <PageHero
        title="Admissions at High Bluff Academy"
        subtitle="A personalized, welcoming process designed to get to know your student as an individual."
        image="/images/admissions/admissions-hero.webp"
      />

      <Breadcrumbs />

      {/* HOW TO APPLY – Conversion-Focused Steps */}
      <section id="apply" className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Admissions process
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-navy leading-tight">
              A thoughtful, human admissions experience.
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              Joining the High Bluff Academy community is a personal, relational process.
              We want to understand your student’s strengths, goals, and learning style so
              we can determine the best path forward together.
            </p>

            <div className="grid gap-6 md:grid-cols-3 mt-8">
              {[
                {
                  step: "Step 1",
                  title: "Schedule a tour",
                  text: "Visit campus to experience our classrooms, community, and culture firsthand.",
                },
                {
                  step: "Step 2",
                  title: "Submit application",
                  text: "Complete our online application and upload recent transcripts.",
                },
                {
                  step: "Step 3",
                  title: "Meet with admissions",
                  text: "Have a personal conversation about fit, goals, and next steps.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm"
                >
                  <div className="text-xs font-bold tracking-widest text-brand-orange uppercase mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href={siteConfig.external.enrollment}
                target="_blank"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
              >
                Start online application
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-brand-navy text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white transition"
              >
                Schedule a campus tour
              </a>
            </div>
          </div>

          {/* Visual Panel */}
          <div className="lg:col-span-5">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="/images/admissions/admissions-family.webp"
                alt="Family meeting with admissions"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                  Personalized admissions
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Every application is reviewed with care, context, and the whole student in mind.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TUITION & FEES – Premium Cards */}
      <section id="tuition" className="py-24 bg-brand-navy relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/admissions/tuition-bg.webp"
            alt="Campus architecture"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Tuition & financial investment
            </h2>
            <p className="mt-4 text-white/80 text-lg max-w-2xl mx-auto font-light">
              High Bluff Academy offers a highly personalized education with small class sizes,
              expert faculty, and flexible pathways designed to support each student’s goals.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Domestic */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white shadow-2xl">
              <h3 className="text-xl font-semibold mb-2">Domestic students</h3>
              <p className="text-3xl font-bold mb-4">$28,000</p>
              <p className="text-sm text-white/80 mb-4">
                Annual tuition for full-time domestic students.
              </p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• Small class sizes and individualized instruction</li>
                <li>• College-preparatory curriculum</li>
                <li>• Academic support and tutoring options</li>
              </ul>
            </div>

            {/* International */}
            <div className="bg-white rounded-3xl p-8 text-gray-900 shadow-2xl border border-gray-100">
              <h3 className="text-xl font-semibold mb-2">International students</h3>
              <p className="text-3xl font-bold mb-1">$45,580</p>
              <p className="text-xs text-gray-500 mb-4">
                Annual cost for full-time international students on an F-1 visa.
              </p>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold tracking-widest uppercase text-brand-orange mb-3">
                  Breakdown including
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex justify-between gap-3">
                    <span>Tuition</span>
                    <span className="font-medium text-gray-900 tabular-nums">$29,580</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>I-20 issuing fee</span>
                    <span className="font-medium text-gray-900 tabular-nums">+ $10,000</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span>International student services fee</span>
                    <span className="font-medium text-gray-900 tabular-nums">+ $6,000</span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-gray-200 mt-2 pt-2 font-semibold text-brand-navy">
                    <span>Total</span>
                    <span className="tabular-nums">= $45,580</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between gap-3 text-sm">
                <span className="text-gray-700">
                  (Optional) ESL program fee
                  <span className="block text-xs text-gray-500 mt-1">
                    If needed; based on placement assessment.
                  </span>
                </span>
                <span className="font-medium text-gray-900 tabular-nums whitespace-nowrap">+ $6,000</span>
              </div>

              <a
                href="/admissions/international"
                className="mt-5 inline-flex items-center text-sm font-semibold text-brand-orange hover:underline"
              >
                F-1 visa application steps →
              </a>
            </div>
          </div>

          <div className="mt-10 max-w-2xl mx-auto text-center text-sm text-white/80 space-y-2">
            <p>Registration fee: $350 (non-refundable)</p>
            <p>Late enrollment (after April 10): $1,000</p>
            <p>
              Graduation fee (12th grade): $600 — includes cap and gown, senior activities,
              and the graduation luncheon.
            </p>
          </div>
        </div>
      </section>

      {/* FINANCIAL AID */}
      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-3xl font-bold text-brand-navy mb-4">Financial aid & support</h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light mb-6">
            We recognize that an independent school education is a significant investment.
            If financial assistance is needed, our team will work with your family to explore
            available options and determine how we can best support your student’s success.
          </p>
          <p className="text-sm text-gray-500">
            Please contact our office to discuss financial aid opportunities and payment options.
          </p>
        </div>
      </section>

      {/* VISIT CAMPUS – Strong CTA */}
      <section id="visit" className="py-24 bg-white">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Visit campus
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              See High Bluff Academy in person.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              The best way to understand our community is to experience it. Walk our campus,
              visit classrooms, and meet the educators who will be working closely with your student.
            </p>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Phone:</strong> {siteConfig.contact.phone}</p>
              <p><strong>Location:</strong> {siteConfig.address.locality}, {siteConfig.address.region}</p>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
              >
                Schedule a tour
              </a>
              <a
                href={siteConfig.external.enrollment}
                target="_blank"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-brand-navy text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white transition"
              >
                Start application
              </a>
            </div>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/admissions/visit-campus.webp"
              alt="Families touring campus"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>
        </div>
      </section>
    </main>
  )
}
