// app/about/college-acceptances/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "College acceptances — High Bluff Academy",
  description:
    "Where HBA graduates have been admitted: Stanford, UCLA, UC Berkeley, USC, NYU, Northwestern, Dartmouth, Pomona, Amherst, Middlebury, and more. Class average SAT 1359.",
}

type Tier = "elite" | "highly-competitive" | "competitive" | "liberal-arts" | "popular"

type School = {
  name: string
  tier: Tier
  /** City and state, shown on the featured spotlight cards. */
  location?: string
  /** Optional annotation, e.g., "4 recent grads" or "9% admit rate". */
  note?: string
  /** Whether this destination appears in the featured spotlight up top. */
  featured?: boolean
}

const tiers: Record<Tier, { label: string; description: string }> = {
  elite: {
    label: "Elite universities",
    description:
      "U.S. News & Forbes top 30 — institutions with admit rates under 15%.",
  },
  "highly-competitive": {
    label: "Highly competitive",
    description: "U.S. News top 50 research universities.",
  },
  competitive: {
    label: "Competitive",
    description:
      "U.S. News top 100 — including respected regional flagships.",
  },
  "liberal-arts": {
    label: "National liberal arts",
    description:
      "Selective small-college environments where HBA students thrive.",
  },
  popular: {
    label: "Popular destinations",
    description: "Other schools where HBA grads regularly enroll.",
  },
}

const tierOrder: Tier[] = [
  "elite",
  "highly-competitive",
  "competitive",
  "liberal-arts",
  "popular",
]

// Single source of truth — each school appears exactly once.
const schools: School[] = [
  // ── Elite universities ──────────────────────────────────────────
  { name: "Stanford University", tier: "elite", location: "Stanford, California", featured: true },
  { name: "Dartmouth College", tier: "elite", location: "Hanover, New Hampshire", featured: true },
  { name: "UCLA", tier: "elite", location: "Los Angeles, California", featured: true },
  { name: "UC Berkeley", tier: "elite", location: "Berkeley, California", note: "6 recent grads", featured: true },
  { name: "USC", tier: "elite", location: "Los Angeles, California", note: "4 recent grads", featured: true },
  { name: "Northwestern University", tier: "elite", location: "Evanston, Illinois", featured: true },
  { name: "New York University", tier: "elite", location: "New York, New York", featured: true },
  { name: "Carnegie Mellon University", tier: "elite", location: "Pittsburgh, Pennsylvania", featured: true },
  { name: "University of Michigan, Ann Arbor", tier: "elite", location: "Ann Arbor, Michigan", featured: true },
  { name: "Emory University", tier: "elite" },
  { name: "UC San Diego", tier: "elite" },
  { name: "University of Virginia", tier: "elite" },
  { name: "UNC Chapel Hill", tier: "elite" },
  { name: "University of Waterloo", tier: "elite", note: "Canada" },
  { name: "University of Edinburgh", tier: "elite", note: "United Kingdom" },

  // ── Highly competitive ──────────────────────────────────────────
  { name: "University of Illinois Urbana-Champaign", tier: "highly-competitive" },
  { name: "UC Santa Barbara", tier: "highly-competitive" },
  { name: "Tufts University", tier: "highly-competitive" },
  { name: "UC Irvine", tier: "highly-competitive" },
  { name: "Boston College", tier: "highly-competitive" },
  { name: "UC Davis", tier: "highly-competitive" },
  { name: "Rutgers — New Brunswick", tier: "highly-competitive" },
  { name: "University of Maryland", tier: "highly-competitive" },
  { name: "Northeastern University", tier: "highly-competitive" },
  { name: "Ohio State University", tier: "highly-competitive" },
  { name: "Santa Clara University", tier: "highly-competitive" },
  { name: "Syracuse University", tier: "highly-competitive" },
  { name: "University of Miami", tier: "highly-competitive" },
  { name: "Purdue University", tier: "highly-competitive" },
  { name: "University of Washington", tier: "highly-competitive" },
  { name: "Case Western Reserve University", tier: "highly-competitive" },
  { name: "Cal Poly San Luis Obispo", tier: "highly-competitive" },
  { name: "American University", tier: "highly-competitive" },

  // ── Competitive ─────────────────────────────────────────────────
  { name: "Colorado School of Mines", tier: "competitive" },
  { name: "SUNY Stony Brook", tier: "competitive" },
  { name: "Texas Christian University", tier: "competitive" },
  { name: "Gonzaga University", tier: "competitive" },
  { name: "Loyola Marymount University", tier: "competitive" },
  { name: "Johnson & Wales University", tier: "competitive" },
  { name: "UC Riverside", tier: "competitive" },
  { name: "University of Iowa", tier: "competitive" },
  { name: "University of San Diego", tier: "competitive" },
  { name: "University of Colorado, Boulder", tier: "competitive" },
  { name: "University of Denver", tier: "competitive" },
  { name: "University of San Francisco", tier: "competitive" },
  { name: "University of Arizona", tier: "competitive" },
  { name: "UC Santa Cruz", tier: "competitive" },
  { name: "UC Merced", tier: "competitive" },
  { name: "Clemson University", tier: "competitive" },
  { name: "Fordham University", tier: "competitive" },
  { name: "Pepperdine University", tier: "competitive" },
  { name: "Stevens Institute of Technology", tier: "competitive" },
  { name: "George Washington University", tier: "competitive" },
  { name: "Baylor University", tier: "competitive" },

  // ── National liberal arts ───────────────────────────────────────
  { name: "Pomona College", tier: "liberal-arts", location: "Claremont, California", note: "7% admit rate", featured: true },
  { name: "Amherst College", tier: "liberal-arts", location: "Amherst, Massachusetts", note: "9% admit rate", featured: true },
  { name: "Middlebury College", tier: "liberal-arts", location: "Middlebury, Vermont", note: "12% admit rate", featured: true },
  { name: "Claremont McKenna College", tier: "liberal-arts", note: "11% admit rate" },
  { name: "Carleton College", tier: "liberal-arts" },
  { name: "Colby College", tier: "liberal-arts" },
  { name: "Colgate University", tier: "liberal-arts", note: "12% admit rate" },
  { name: "Scripps College", tier: "liberal-arts" },
  { name: "Brandeis University", tier: "liberal-arts" },

  // ── Popular destinations ────────────────────────────────────────
  { name: "Arizona State University", tier: "popular" },
  { name: "University of Oregon", tier: "popular" },
  { name: "Western Washington University", tier: "popular" },
  { name: "Chapman University", tier: "popular" },
  { name: "San Diego State University", tier: "popular" },
  { name: "University of Hawai'i, Mānoa", tier: "popular" },
  { name: "Cal State San Marcos", tier: "popular" },
  { name: "Sonoma State University", tier: "popular" },
  { name: "San Jose State University", tier: "popular" },
  { name: "Cal State Long Beach", tier: "popular" },
  { name: "Drexel University", tier: "popular" },
]

const featured = schools.filter((s) => s.featured)

const stats = [
  { value: "1359", label: "Class average SAT" },
  { value: schools.length.toString(), label: "Universities admitted to" },
  { value: "3", label: "Countries represented" },
]

export default function CollegeAcceptancesPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="College acceptances"
        subtitle="Where High Bluff Academy graduates go next."
        image="/images/college-acceptances/hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            Class profile · 2020 – 2025
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            HBA graduates earn admission to the country&rsquo;s most selective universities.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            Our college counseling team works with each student from freshman year forward,
            building a personalized list and a story that reflects who they are. The pages
            below capture where HBA graduates have been admitted over the past six years —
            across elite research universities, top liberal arts colleges, and international
            destinations.
          </p>
        </div>
      </section>

      {/* CLASS PROFILE STATS */}
      <section className="py-20 bg-brand-navy text-white">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              By the numbers
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold">
              Six years of outcomes.
            </h2>
          </div>
          <dl className="grid sm:grid-cols-3 gap-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse items-center gap-3 text-center"
              >
                <dt className="text-xs uppercase tracking-widest text-white/70 font-bold">
                  {stat.label}
                </dt>
                <dd className="text-6xl lg:text-7xl font-extrabold tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-center text-xs text-white/60 italic mt-12">
            Class profile data covers HBA graduates from 2020 – 2025.
          </p>
        </div>
      </section>

      {/* SELECTED ACCEPTANCES (FEATURED) */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Selected acceptances
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              A selection of where our graduates have been admitted.
            </h2>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((school) => (
              <li
                key={school.name}
                className="bg-gray-50 border-l-[3px] border-brand-orange p-7 lg:p-8 transition hover:bg-white hover:shadow-lg"
              >
                <p className="text-xl lg:text-2xl font-extrabold text-brand-navy leading-tight">
                  {school.name}
                </p>
                {school.location && (
                  <p className="mt-2 text-sm text-gray-500 font-light">
                    {school.location}
                  </p>
                )}
                {school.note && (
                  <p className="mt-3 inline-block text-xs uppercase tracking-widest text-brand-orange font-bold">
                    {school.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* COMPLETE LIST (HONOR ROLL) */}
      <section className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Complete list
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Every university where HBA graduates have been admitted.
            </h2>
            <p className="text-xs text-gray-500 italic">
              Tier rankings reflect U.S. News &amp; Forbes 2025.
            </p>
          </div>

          {tierOrder.map((tierKey) => {
            const tierSchools = schools
              .filter((s) => s.tier === tierKey)
              .sort((a, b) => a.name.localeCompare(b.name))
            const meta = tiers[tierKey]
            return (
              <div key={tierKey}>
                <div className="border-b border-gray-300 pb-4 mb-6">
                  <h3 className="text-xl lg:text-2xl font-extrabold text-brand-navy">
                    {meta.label}
                  </h3>
                  <p className="text-sm text-gray-600 font-light mt-1">
                    {meta.description}
                  </p>
                </div>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10">
                  {tierSchools.map((s) => (
                    <li
                      key={s.name}
                      className="py-2.5 border-b border-gray-200 text-sm"
                    >
                      <span className="font-semibold text-brand-navy">{s.name}</span>
                      {s.note && (
                        <span className="text-gray-500 font-light italic">
                          {" "}
                          — {s.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-navy">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Personalized college counseling, from day one.
          </h2>
          <p className="text-lg text-white/90 font-light">
            Every HBA student works one-on-one with our college counseling team to identify
            schools that fit their goals, build a strong application, and present their best self.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/admissions"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Explore admissions
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-brand-navy transition"
            >
              Schedule a tour
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
