// app/_schools/pci/ArtInstitutePage.tsx
//
// Flagship program page: PCI's digital art conservatory in partnership
// with Floating Island Productions. Heavier editorial layout — large
// numerals, full-bleed sections, mentor cards.

import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: `Art Institute — ${siteConfig.name}`,
  description:
    "PCI's flagship Saturday studio in digital art, in partnership with Floating Island Productions. Students earn published credits in printed hardcover books.",
}

const curriculum = [
  {
    n: "01",
    h: "Drawing & lineart fundamentals",
    b: "Anatomy, shape language, silhouette clarity, perspective, environment sketching, spatial design.",
  },
  {
    n: "02",
    h: "Light & color",
    b: "The physics of light — key, rim, ambient, fill. Form, core, cast, and occlusion shadows. Falloff, materials, color theory across value, saturation, and hue.",
  },
  {
    n: "03",
    h: "Software & digital production",
    b: "Industry pipelines in Clip Studio Paint and Photoshop. Selections, masks, adjustment layers, brushes, non-destructive workflows.",
  },
  {
    n: "04",
    h: "Narrative production",
    b: "Storytelling with color, color scripting, atmospheric control, emotional keying — moving from coloring to deliberate visual narrative.",
  },
  {
    n: "05",
    h: "Portfolio & publication",
    b: "Finalizing professional pieces. Page proofs. Print prep. Real publication credit in a hardcover book that ships to bookstores.",
  },
]

const mentors = [
  {
    name: "Ken Penders",
    role: "Author / Illustrator / Publisher",
    bio: "Wrote and illustrated Sonic the Hedgehog comics from 1993–2006, including every issue of Knuckles the Echidna and the Princess Sally miniseries. Has worked on Star Trek, King of the Hill, and Zelda. Founder of Floating Island Productions.",
  },
  {
    name: "Scott Shaw",
    role: "Penciller / Animator / Writer",
    bio: "Award-winning artist with 50+ years experience. First artist on Archie's Sonic the Hedgehog series (1992). Co-creator on The Simpsons comics and The Flintstones. Co-founded San Diego Comic-Con in 1970.",
  },
  {
    name: "Kurt Michael Russell",
    role: "Professional Colorist",
    bio: "Working colorist since 2011 — DC, Image, Vault, IDW, Dark Horse, and more. Teaches digital coloring online to thousands of students. Specializes in lighting, mood, and rendering workflow.",
  },
  {
    name: "Adam Bryce Thomas",
    role: "Comic Artist (IDW)",
    bio: "Known for his work on IDW's Sonic the Hedgehog series. Guest drawing workshops focused on dynamic posing, character design, and clean professional lineart.",
  },
]

export default function PciArtInstitutePage() {
  return (
    <main className="bg-white text-brand-navy-deep">
      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative bg-brand-navy-deep text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-black opacity-95" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-28 lg:pt-40 pb-24 lg:pb-32">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Flagship program · The Art Institute
          </p>
          <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-4xl">
            A real studio.
            <br />
            A real publisher.
            <br />
            <span className="text-brand-orange">Real published credit.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg lg:text-xl text-white/80 leading-relaxed font-light">
            PCI&rsquo;s 16-week Saturday conservatory in digital art, run
            in partnership with Floating Island Productions. Students
            don&rsquo;t graduate with a sketchbook. They graduate with
            their names in a printed hardcover book.
          </p>
        </div>
      </section>

      {/* ─── PROGRAM-AT-A-GLANCE STRIP ─────────────────────────────── */}
      <section className="bg-[#f6f4ef] border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            ["Format", "Saturday weekend studio"],
            ["Length", "16 weeks"],
            ["Sessions", "3 hours per Saturday"],
            ["Tuition", "$4,800"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
                {label}
              </p>
              <p className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-brand-navy-deep">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHY THIS EXISTS ───────────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              Why this exists
            </p>
            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Most art classes teach in a vacuum.
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6 text-lg leading-relaxed text-gray-700 font-light">
            <p>
              Students leave with technique but no audience — sketchbooks
              that never get printed, characters no one ever meets,
              portfolios that exist only on a hard drive.
            </p>
            <p>
              The Art Institute fixes that. Every cohort works inside an
              active publishing pipeline. Students learn the same tools
              and workflows used by professionals shipping hardcovers
              today: Clip Studio Paint, layered PSDs, non-destructive
              workflows, flatting, holds, rendering, lettering — and
              they apply them to pages that get printed and bound.
            </p>
            <p className="border-l-2 border-brand-orange pl-6 text-xl text-brand-navy-deep font-light italic">
              We don&rsquo;t use AI prompts. We don&rsquo;t teach
              shortcuts. We teach why every line and every color
              matters.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CURRICULUM ROADMAP ────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            The curriculum
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Five chapters, one finished book.
          </h2>

          <div className="mt-16 space-y-px bg-gray-200 border-y border-gray-200">
            {curriculum.map(({ n, h, b }) => (
              <div key={n} className="bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 py-8 px-2">
                <div className="lg:col-span-2">
                  <span className="text-5xl lg:text-6xl font-black text-brand-orange leading-none">
                    {n}
                  </span>
                </div>
                <div className="lg:col-span-4">
                  <h3 className="text-2xl lg:text-3xl font-black tracking-tight text-brand-navy-deep">
                    {h}
                  </h3>
                </div>
                <div className="lg:col-span-6">
                  <p className="text-base lg:text-lg text-gray-700 leading-relaxed font-light">
                    {b}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MENTOR PANEL ──────────────────────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Guest mentors
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            The people in the room aren&rsquo;t just teachers.
          </h2>
          <p className="mt-6 text-lg text-white/75 leading-relaxed font-light max-w-3xl">
            Each cohort includes feedback sessions and workshops with
            working professionals — the artists, colorists, and
            publishers whose work students will see on bookstore shelves.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/15">
            {mentors.map((m) => (
              <article key={m.name} className="bg-brand-navy-deep p-8 lg:p-10">
                <h3 className="text-2xl lg:text-3xl font-black tracking-tight">
                  {m.name}
                </h3>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-orange">
                  {m.role}
                </p>
                <p className="mt-6 text-base leading-relaxed text-white/75 font-light">
                  {m.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTNERSHIP ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
              Partnership
            </p>
            <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              In partnership with Floating Island Productions.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-6 text-lg leading-relaxed text-gray-700 font-light">
            <p>
              Floating Island Productions, founded by Ken Penders, is
              currently releasing hardcover editions of his original
              stories — restored, recolored, and re-lettered for a new
              generation of readers.
            </p>
            <p>
              PCI students contribute directly to that pipeline. Their
              flatting, rendering, and lighting work appears on real
              pages in real books. Each student gets a complimentary
              copy of the hardcover when it prints, and their name
              appears in the credits page alongside the working
              professionals on the team.
            </p>
            <p className="text-brand-navy-deep">
              That credit travels with them — to college applications,
              to LinkedIn, to the next interview.
            </p>
          </div>
        </div>
      </section>

      {/* ─── REQUIREMENTS / LOGISTICS ──────────────────────────────── */}
      <section className="bg-[#f6f4ef] py-24 lg:py-32 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            What students need
          </p>
          <h2 className="mt-4 text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight">
            Bring a tablet. We provide the rest.
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border-t-4 border-brand-orange">
              <h3 className="text-xl font-black tracking-tight text-brand-navy-deep">
                Hardware
              </h3>
              <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">
                A digital drawing tablet — typically an iPad with Apple
                Pencil, or a Surface Pro with Surface Pen.
              </p>
            </div>
            <div className="bg-white p-8 border-t-4 border-brand-orange">
              <h3 className="text-xl font-black tracking-tight text-brand-navy-deep">
                Software
              </h3>
              <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">
                Clip Studio Paint — industry standard, around $35/year.
                PCI provides licenses for enrolled students.
              </p>
            </div>
            <div className="bg-white p-8 border-t-4 border-brand-orange">
              <h3 className="text-xl font-black tracking-tight text-brand-navy-deep">
                Background
              </h3>
              <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">
                None required. Students at every skill level start
                from the fundamentals and build up — but motivated
                students with prior experience accelerate fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-brand-navy-deep text-white py-24 lg:py-32">
        <div className="mx-auto max-w-4xl px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.05]">
            Ready to talk?
          </h2>
          <p className="mt-6 text-lg text-white/75 font-light max-w-2xl mx-auto">
            Cohorts are intentionally small. Reach out and we&rsquo;ll
            walk you through the next start date, the curriculum, and
            what your student needs to begin.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-orange px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg hover:brightness-110 transition"
            >
              Contact admissions →
            </Link>
            <a
              href={`mailto:${siteConfig.contact.admissionsEmail}`}
              className="inline-flex items-center justify-center border border-white/40 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white hover:bg-white hover:text-brand-navy-deep transition"
            >
              {siteConfig.contact.admissionsEmail}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
