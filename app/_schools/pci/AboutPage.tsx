// app/_schools/pci/AboutPage.tsx
//
// PCI's story — the Pacific Crest Trail metaphor, the three founders,
// and the institute's mission. Editorial layout, light typography
// rhythm with heavy display headers.

import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `About — ${siteConfig.name}`,
  description:
    "Pacific Crest Institute was founded in San Diego to support students on their academic and creative journey — a name inspired by the Pacific Crest Trail and the values it represents.",
}

const founders = [
  {
    name: "Ethan Alvarée",
    role: "CEO & Co-founder",
    bio: "Oversees curriculum, instruction, and academic quality. Leads technology, systems, and operational infrastructure, and manages partnerships related to curriculum and publishing — including PCI's relationship with Floating Island Productions.",
  },
  {
    name: "Molly Sun",
    role: "Director of Marketing, Recruitment & Administration · Co-founder",
    bio: "Oversees admissions, family communication, and operational workflows. Manages customer experience, onboarding, and administrative systems. Leads community engagement and parent-facing communication.",
  },
  {
    name: "Kun Xuan",
    role: "Strategic Advisor & Co-founder",
    bio: "Provides strategic guidance, long-term planning, and business development. Supports high-level partnerships and institutional relationships, helping PCI grow into a scalable, multi-program educational brand.",
  },
]

export default function PciAboutPage() {
  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative bg-brand-navy-deep text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-black opacity-95" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-28 lg:pt-40 pb-24 lg:pb-32">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            About Pacific Crest Institute
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-4xl">
            Named for a trail.
            <br />
            <span className="text-brand-orange">Built for the climb.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            Pacific Crest Institute is a San Diego–based academic
            services company founded on a simple idea: real learning,
            like a long trail, rewards perseverance over speed.
          </p>
        </div>
      </section>

      {/* ─── THE NAME ──────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              The name
            </p>
            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Why &ldquo;Pacific Crest&rdquo;?
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6 text-lg leading-relaxed text-gray-700 font-light">
            <p>
              The Pacific Crest Trail runs 2,650 miles from Mexico to
              Canada — through deserts, mountain passes, and forests.
              People who finish it don&rsquo;t do it on talent alone.
              They do it on dedication, planning, and the willingness
              to keep walking even when the view in front of them
              hasn&rsquo;t changed all day.
            </p>
            <p>
              That&rsquo;s the model we wanted for the institute.
              Education is not a sprint — it&rsquo;s a long, deliberate
              climb. PCI exists to walk that path alongside our
              students, locally and internationally, until they reach
              the milestones they&rsquo;ve set for themselves.
            </p>
            <p className="border-l-2 border-brand-orange pl-6 text-xl text-brand-navy-deep font-light italic">
              Perseverance. Growth. Resilience. The journey toward
              success.
            </p>
          </div>
        </div>
      </section>

      {/* ─── MISSION ───────────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Our mission
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Empower students to reach their full academic and lifelong
            potential.
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              [
                "Student-centered",
                "Small cohorts. Real instructors. Diagnostic teaching that adjusts to the student in front of us.",
              ],
              [
                "Milestone-aware",
                "We build toward concrete outcomes: published work, contest scores, AP exams, SAT/ACT, TOEFL.",
              ],
              [
                "Locally rooted, globally open",
                "San Diego is home, but we serve students nationwide and internationally — including bilingual and AP transition support.",
              ],
            ].map(([h, b]) => (
              <div key={h} className="bg-white p-8 border-t-4 border-brand-orange">
                <h3 className="text-xl font-black tracking-tight text-brand-navy-deep">{h}</h3>
                <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDERS ──────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Founders
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Three equal partners.
          </h2>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed font-light max-w-3xl">
            PCI was co-founded by three partners who each bring a
            distinct piece of the institute&rsquo;s operations together:
            curriculum and infrastructure, family engagement and
            administration, and strategic vision.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 border border-gray-200">
            {founders.map((f) => (
              <article key={f.name} className="bg-white p-8 lg:p-10">
                <h3 className="text-2xl font-black tracking-tight text-brand-navy-deep">
                  {f.name}
                </h3>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
                  {f.role}
                </p>
                <p className="mt-6 text-base leading-relaxed text-gray-700 font-light">
                  {f.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INDEPENDENCE STATEMENT ────────────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            How we operate
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-3xl">
            A clean, independent academic services company.
          </h2>
          <p className="mt-8 text-lg lg:text-xl text-white/80 leading-relaxed font-light max-w-3xl">
            PCI is its own brand, with its own identity, infrastructure,
            and operational footprint. We collaborate openly with
            partner schools and publishers, but we are not a subsidiary
            of any of them. That independence is intentional —
            it&rsquo;s what lets us focus first on the student.
          </p>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-brand-navy-deep leading-[1.05]">
            Walk with us.
          </h2>
          <p className="mt-6 text-lg text-gray-700 font-light max-w-2xl mx-auto">
            Whether your student is here for digital art, AP review,
            competition math, or a college-entrance score — we&rsquo;d
            love to start the conversation.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Get in touch →
            </Link>
            <a
              href={`mailto:${siteConfig.contact.infoEmail}`}
              className="inline-flex items-center justify-center border border-brand-navy-deep/30 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-brand-navy-deep hover:bg-brand-navy-deep hover:text-white transition"
            >
              {siteConfig.contact.infoEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
