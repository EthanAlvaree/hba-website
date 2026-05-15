// app/_schools/pci/AboutPage.tsx
//
// PCI's About page. Leads with the people (Ethan + Molly), then guest
// artists, then STEM teachers, then the Pacific Crest Trail story and
// mission. Bios are intentionally distinct from each person's HBA bio.

import Image from "next/image"
import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `About — ${siteConfig.name}`,
  description:
    "Pacific Crest Institute was founded in San Diego to support students on their academic and creative journey — a name inspired by the Pacific Crest Trail and the values it represents.",
}

const leadership = [
  {
    name: "Ethan Alvarée",
    role: "CEO & Co-founder",
    image: "/images/pci/people/ethan-alvaree.webp",
    bio: "Ethan founded PCI to build the kind of weekend-deep, professionally-anchored programs the school week never has time for. They lead curriculum, instruction, and technology, manage the partnership with Floating Island Productions, and personally teach the Art Institute's flagship Saturday studio. Beyond PCI, Ethan is a College Board curriculum writer for AP Precalculus and SpringBoard, with more than a decade teaching mathematics, statistics, and computer science.",
  },
  {
    name: "Molly Sun",
    role: "Director of Marketing, Recruitment & Administration · Co-founder",
    image: "/images/pci/people/molly-sun.webp",
    bio: "Molly leads PCI's recruitment, marketing, and family-facing operations — guiding new students and parents through every step from first inquiry to first class. She holds a Master's in Higher Education Administration from Northeastern University, taught Chinese at San Diego State, and brings particular care to international and bilingual families. She designs the onboarding workflows and builds the community programs that turn first-time visitors into long-term PCI families.",
  },
]

const guestArtists = [
  {
    name: "Ken Penders",
    role: "Author / Illustrator / Publisher",
    image: "/images/pci/bios/ken-penders.webp",
    bio: "Wrote and illustrated Sonic the Hedgehog comics from 1993–2006, including every issue of Knuckles the Echidna and the Princess Sally miniseries. Has worked on Star Trek, King of the Hill, and Zelda. Founder of Floating Island Productions and PCI's publishing partner.",
  },
  {
    name: "Scott Shaw",
    role: "Penciller / Animator / Writer",
    image: "/images/pci/bios/scott-shaw.webp",
    bio: "Award-winning artist with 50+ years experience. First artist on Archie's Sonic the Hedgehog series (1992). Co-creator on The Simpsons comics and The Flintstones. Co-founded San Diego Comic-Con in 1970. Visits PCI for character-design and visual-humor workshops.",
  },
  {
    name: "Kurt Michael Russell",
    role: "Professional Colorist",
    image: "/images/pci/bios/kurt-michael-russell.webp",
    bio: "Working colorist since 2011 — DC, Image, Vault, IDW, Dark Horse, and more. Teaches digital coloring online to thousands of students. Brings PCI students master-class instruction in lighting, mood, and rendering workflow.",
  },
]

const stemFaculty = [
  {
    name: "Will Anderson, Ph.D.",
    role: "Science · Olympiad Track",
    image: "/images/pci/people/will-anderson.webp",
    bio: "Dr. Will is a Ph.D. biochemist with nearly two decades in San Diego science education. He earned his B.S. in Biochemistry and Molecular Biology from Cornell, his Ph.D. in Chemistry from UC San Diego, and conducted more than a decade of research at Cornell, UCSD, and The Scripps Research Institute. At PCI he leads science-track instruction — AP biology and chemistry review, USABO and USNCO olympiad preparation, and the kind of deep-conceptual teaching that turns memorizers into thinkers.",
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

      {/* ─── LEADERSHIP ────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Leadership
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            The people running PCI.
          </h2>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border border-gray-200">
            {leadership.map((p) => (
              <article key={p.name} className="bg-white p-8 lg:p-10 flex flex-col">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-6 text-2xl lg:text-3xl font-black tracking-tight text-brand-navy-deep">
                  {p.name}
                </h3>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
                  {p.role}
                </p>
                <p className="mt-6 text-base leading-relaxed text-gray-700 font-light">
                  {p.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GUEST ARTISTS & INSTRUCTORS ───────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Guest artists &amp; instructors
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Working professionals, in the room.
          </h2>
          <p className="mt-6 text-lg text-white/75 leading-relaxed font-light max-w-3xl">
            PCI&rsquo;s Art Institute brings in active industry artists,
            colorists, and publishers for cohort workshops and feedback
            sessions. Students learn from people whose work is on
            bookstore shelves right now.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/15">
            {guestArtists.map((p) => (
              <article key={p.name} className="bg-brand-navy-deep p-8 lg:p-10 flex flex-col">
                <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover grayscale contrast-110"
                  />
                </div>
                <h3 className="mt-6 text-2xl lg:text-3xl font-black tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-orange">
                  {p.role}
                </p>
                <p className="mt-6 text-base leading-relaxed text-white/75 font-light">
                  {p.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STEM / CONTEST FACULTY ────────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            STEM &amp; contest faculty
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            The people behind the test-prep tracks.
          </h2>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed font-light max-w-3xl">
            Olympiad and AP-level instruction at PCI is led by faculty
            who have done the science — not just taught from a textbook.
            More instructors join as cohorts grow.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {stemFaculty.map((p) => (
              <article key={p.name} className="bg-white p-8 border-t-4 border-brand-orange flex flex-col">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-6 text-xl lg:text-2xl font-black tracking-tight text-brand-navy-deep">
                  {p.name}
                </h3>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange">
                  {p.role}
                </p>
                <p className="mt-6 text-base leading-relaxed text-gray-700 font-light">
                  {p.bio}
                </p>
              </article>
            ))}
          </div>
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
