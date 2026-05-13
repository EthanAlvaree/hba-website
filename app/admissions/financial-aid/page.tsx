// app/admissions/financial-aid/page.tsx
//
// Public page answering the "Do you offer financial aid?" question
// that prospective families repeatedly ask the admissions office.
// Written intentionally with soft commitments ("contact admissions
// for current rates") so the office stays the source of truth on
// specific numbers — the page exists to convey that aid is on the
// table and how to ask about it.

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "Financial aid — " + siteConfig.name,
  description:
    "Need-based financial aid at " +
    siteConfig.name +
    ". How to ask, what we consider, and what to expect.",
}

export default function FinancialAidPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Financial aid"
        subtitle="Need-based support to make the right school the affordable school."
        image="/images/admissions/admissions-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Affordability
          </div>
          <h2 className="text-4xl font-extrabold text-brand-navy leading-tight">
            We don&rsquo;t want cost to be the reason a student misses out.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            {siteConfig.name} offers need-based financial aid to families for
            whom full tuition would be a real stretch. Aid is awarded on a
            case-by-case basis after a short, confidential conversation with
            the admissions office. We&rsquo;d rather have the conversation
            and figure it out than have a family rule us out without asking.
          </p>
        </div>
      </section>

      {/* WHAT WE CONSIDER */}
      <section className="py-16 bg-gray-50">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              How decisions are made
            </div>
            <h2 className="text-3xl font-extrabold text-brand-navy leading-tight">
              What we look at.
            </h2>
            <p className="text-base text-gray-600 leading-relaxed font-light">
              Need-based aid means we&rsquo;re trying to assess what your
              family can reasonably contribute, not who has the most
              compelling story. We use the same lens for every applicant.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Household income & assets",
                body:
                  "Standard inputs: household income, dependents, significant assets, recurring obligations. We use the SSS (School and Student Services) framework most independent schools use, so the methodology is familiar if you&rsquo;ve applied for aid at peer schools.",
              },
              {
                title: "Family circumstances",
                body:
                  "Things that don&rsquo;t show up neatly on a tax return: medical events, supporting an aging parent, recently relocated, divorce in progress. We invite you to share what&rsquo;s relevant during the conversation.",
              },
              {
                title: "Multiple children",
                body:
                  "If you&rsquo;re paying private-school tuition for more than one child (here or elsewhere), the calculation reflects that. Multi-child families often qualify for more aid than they expect.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-brand-navy mb-2">
                  {item.title}
                </h3>
                <p
                  className="text-sm text-gray-600 leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ __html: item.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              The process
            </div>
            <h2 className="text-3xl font-extrabold text-brand-navy leading-tight">
              Three steps, in this order.
            </h2>
          </div>

          <ol className="space-y-6">
            {[
              {
                step: "1",
                title: "Submit the application first.",
                body: (
                  <>
                    Aid decisions follow admissions decisions — we want to
                    evaluate your student on their merits, then talk
                    affordability. Start at{" "}
                    <Link
                      href="/apply"
                      className="font-semibold text-brand-navy underline-offset-4 hover:underline"
                    >
                      our application
                    </Link>
                    .
                  </>
                ),
              },
              {
                step: "2",
                title: "Tell us you&rsquo;re considering aid.",
                body: (
                  <>
                    During the admissions conversation, mention that aid is a
                    factor in your decision. We&rsquo;ll send you the
                    financial aid form (about 20 minutes, supported by SSS)
                    and a list of documents to gather.
                  </>
                ),
              },
              {
                step: "3",
                title: "We come back with an offer together.",
                body: (
                  <>
                    Admissions decisions and aid decisions are communicated
                    together so you can make one informed choice. We&rsquo;re
                    transparent about how we got to the number; if it
                    doesn&rsquo;t pencil out, we&rsquo;ll say so honestly.
                  </>
                ),
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-5">
                <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-navy text-white text-base font-bold">
                  {item.step}
                </span>
                <div>
                  <h3
                    className="text-lg font-semibold text-brand-navy mb-1"
                    dangerouslySetInnerHTML={{ __html: item.title }}
                  />
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHAT FAMILIES ASK */}
      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-6">
          <div className="space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              What families ask
            </div>
            <h2 className="text-3xl font-extrabold text-brand-navy leading-tight">
              Honest answers to the questions we hear most.
            </h2>
          </div>

          <dl className="space-y-4">
            {[
              {
                q: "How much aid is typically awarded?",
                a: "It varies — we&rsquo;ve awarded amounts ranging from a small discount to most of tuition. We don&rsquo;t publish averages because the right answer depends on each family. Ask us in conversation; we won&rsquo;t be cagey.",
              },
              {
                q: "Does asking for aid hurt my child&rsquo;s admissions chances?",
                a: "No. Admissions and financial aid are evaluated separately, by different conversations and different criteria. Our admit decisions are made before we ever look at your aid paperwork.",
              },
              {
                q: "When&rsquo;s the deadline?",
                a: "We accept aid applications on a rolling basis through the admissions cycle. Earlier is better — funds are not unlimited and we award until they&rsquo;re committed. If you&rsquo;re considering aid, mention it on your first call with admissions.",
              },
              {
                q: "Is aid renewable year-to-year?",
                a: "Yes, with a brief annual re-application — usually a short update form rather than a full restart. Aid amounts can adjust up or down with changes in family circumstances.",
              },
              {
                q: "Do you offer merit scholarships?",
                a: "Not at this time. We focus our resources on need-based aid so that families who need it most can access the same education.",
              },
              {
                q: "Can international families apply for aid?",
                a: "We&rsquo;re glad to discuss the specifics — international financial aid is more complex (F-1 visa requirements, banking, etc.). Reach out and we&rsquo;ll walk you through what&rsquo;s possible.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
              >
                <dt
                  className="text-base font-semibold text-brand-navy"
                  dangerouslySetInnerHTML={{ __html: item.q }}
                />
                <dd
                  className="mt-2 text-sm text-gray-600 leading-relaxed font-light"
                  dangerouslySetInnerHTML={{ __html: item.a }}
                />
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-navy relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/admissions/admissions-hero.webp"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="reveal relative max-w-3xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
            Let&rsquo;s talk
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Reach out before you rule us out.
          </h2>
          <p className="text-base text-white/85 leading-relaxed font-light">
            A 15-minute conversation is the fastest way to know whether
            financial aid makes {siteConfig.shortName} a real option for
            your family. We&rsquo;ll be straight with you.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/apply"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Start an application
            </Link>
            <a
              href={`mailto:${siteConfig.contact.admissionsEmail}?subject=Financial%20aid%20inquiry`}
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Email admissions
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
