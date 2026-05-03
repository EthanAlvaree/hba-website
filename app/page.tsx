// app/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"

export default function Home() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="A community where students thrive"
        image="/images/campus-hero.png"
      />

      {/* WELCOME */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Welcome
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
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
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Explore HBA
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Find your path forward.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
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
                eyebrow: "Student Life",
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
                <div className="text-xs font-bold tracking-widest uppercase text-[#f37021] mb-3">
                  {p.eyebrow}
                </div>
                <h3 className="text-2xl font-extrabold text-[#1f3f66] mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {p.description}
                </p>
                <span className="mt-auto text-sm font-semibold text-[#1f3f66] group-hover:text-[#f37021]">
                  {p.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <blockquote className="text-2xl lg:text-3xl italic text-white/90 leading-relaxed font-light">
            “At High Bluff Academy, students don’t just learn — they grow into confident, capable young adults.”
          </blockquote>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Visit
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Ready to visit High Bluff Academy?
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            Schedule a campus visit and discover how our personalized approach helps
            students thrive.
          </p>
          <div className="pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Schedule a visit
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
