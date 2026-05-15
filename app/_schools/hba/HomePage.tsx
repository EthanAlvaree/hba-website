// app/_schools/hba/HomePage.tsx
//
// High Bluff Academy home page content. Extracted from app/page.tsx so
// HBA and PCI sit symmetrically in app/_schools/ rather than HBA living
// at the top level as the "default" tenant. The route handler at
// app/page.tsx is a thin dispatcher.

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"

export default function HbaHomePage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="A community where students thrive"
        image="/images/hba/home/home-hero.webp"
      />

      {/* WELCOME */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Welcome
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-brand-navy leading-tight">
            Welcome to High Bluff Academy.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            At High Bluff Academy, students discover their strengths, build confidence,
            and grow into capable, compassionate young adults. Our small class sizes,
            expert teachers, and personalized approach create a learning environment
            where every student is seen, supported, and inspired.
          </p>
        </div>
      </section>

      {/* PATHWAYS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="reveal text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Explore HBA
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Find your path forward.
            </h2>
          </div>

          <div className="reveal grid gap-8 md:grid-cols-3">
            {[
              {
                eyebrow: "Admissions",
                title: "Begin your journey.",
                description:
                  "Learn about our admissions process, tuition, and how to apply.",
                link: "/admissions",
                cta: "Explore admissions",
              },
              {
                eyebrow: "Programs",
                title: "Rigorous academics.",
                description:
                  "Discover our college-preparatory curriculum and supportive environment.",
                link: "/programs",
                cta: "Explore programs",
              },
              {
                eyebrow: "Student life",
                title: "A vibrant community.",
                description:
                  "Explore clubs, athletics, and the experiences that shape our students.",
                link: "/student-life",
                cta: "Explore student life",
              },
            ].map((p) => (
              <Link
                key={p.eyebrow}
                href={p.link}
                className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
              >
                <div className="text-xs font-bold tracking-widest uppercase text-brand-orange mb-3">
                  {p.eyebrow}
                </div>
                <h3 className="text-2xl font-extrabold text-brand-navy mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {p.description}
                </p>
                <span className="mt-auto text-sm font-semibold text-brand-navy group-hover:text-brand-orange">
                  {p.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <blockquote className="text-2xl lg:text-3xl italic text-white/90 leading-relaxed font-light">
            “At High Bluff Academy, students don’t just learn — they grow into confident, capable young adults.”
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Visit
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            Ready to visit High Bluff Academy?
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            Schedule a campus visit and discover how our personalized approach helps
            students thrive.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Schedule a visit
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-brand-navy text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white transition"
            >
              Start an application
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
