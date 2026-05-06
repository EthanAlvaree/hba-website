// app/about/college-acceptances/page.tsx

import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "College acceptances — High Bluff Academy",
  description:
    "Where HBA graduates have been admitted: Stanford, UCLA, Berkeley, USC, NYU, Northwestern, Dartmouth, and more — across the elite, highly competitive, and liberal-arts tiers.",
}

type SchoolList = {
  tier: string
  description: string
  schools: string[]
  accent: "primary" | "secondary"
}

const lists: SchoolList[] = [
  {
    tier: "Elite universities",
    description:
      "U.S. News & Forbes top 30 — institutions with admit rates under 15%.",
    accent: "primary",
    schools: [
      "Stanford University",
      "Northwestern University",
      "Dartmouth College",
      "UCLA",
      "Emory University",
      "USC (4 recent grads)",
      "UC Berkeley (6 recent grads)",
      "UC San Diego",
      "University of Virginia",
      "New York University",
      "UNC Chapel Hill",
      "Claremont McKenna College",
      "Pomona College",
      "Carnegie Mellon University",
      "University of Michigan, Ann Arbor",
      "University of Waterloo (Canada)",
      "University of Edinburgh (U.K.)",
    ],
  },
  {
    tier: "Highly competitive",
    description: "U.S. News top 50 research universities.",
    accent: "secondary",
    schools: [
      "University of Illinois Urbana-Champaign",
      "UC Santa Barbara",
      "Tufts University",
      "UC Irvine",
      "Boston College",
      "UC San Diego",
      "UC Davis",
      "Rutgers — New Brunswick",
      "University of Maryland",
      "Northeastern University",
      "Ohio State University",
      "Santa Clara University",
      "Syracuse University",
      "University of Miami",
      "Purdue University",
      "University of Washington",
      "Case Western Reserve",
      "Cal Poly San Luis Obispo",
      "American University",
    ],
  },
  {
    tier: "Competitive",
    description: "U.S. News top 100 — including respected regional flagships.",
    accent: "primary",
    schools: [
      "Colorado School of Mines",
      "SUNY Stony Brook",
      "Texas Christian University (TCU)",
      "Gonzaga University",
      "Loyola Marymount University",
      "Johnson & Wales",
      "UC Riverside",
      "University of Iowa",
      "University of San Diego",
      "University of Colorado, Boulder",
      "University of Denver",
      "University of San Francisco",
      "University of Arizona",
      "UC Santa Cruz",
      "UC Merced",
      "Clemson University",
      "Fordham University",
      "Pepperdine University",
      "Stevens Institute of Technology",
      "George Washington University",
      "Baylor University",
    ],
  },
  {
    tier: "National liberal arts",
    description: "Selective small-college environments where HBA students thrive.",
    accent: "secondary",
    schools: [
      "Amherst College (10% admit rate)",
      "Carleton College",
      "Colby College",
      "Colgate University (12% admit rate)",
      "Middlebury College (10% admit rate)",
      "Scripps College",
      "Brandeis University",
    ],
  },
  {
    tier: "Popular destinations",
    description: "Other schools where HBA grads regularly enroll.",
    accent: "primary",
    schools: [
      "Arizona State University",
      "University of Oregon",
      "Western Washington University",
      "University of San Francisco",
      "Chapman University",
      "San Diego State University",
      "University of Hawai'i, Mānoa",
      "Cal State San Marcos",
      "Sonoma State University",
      "San Jose State University",
      "Cal State Long Beach",
      "Drexel University",
    ],
  },
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
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            2020 – 2025
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            HBA graduates earn admission to the country’s most selective universities.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            Our college counseling team works with each student from freshman year forward,
            building a personalized list and a story that reflects who they are. The list below
            is a representative sample of where HBA graduates have been admitted — alongside
            many liberal-arts colleges, public flagships, and international universities.
          </p>
          <p className="text-xs text-gray-500 italic">
            Tier rankings reflect U.S. News &amp; Forbes 2025.
          </p>
        </div>
      </section>

      {/* TIERS */}
      <section className="pb-24">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-16">
          {lists.map((list) => (
            <div key={list.tier} className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div
                    className={`inline-block px-4 py-1.5 font-bold tracking-widest text-xs uppercase rounded-full ${
                      list.accent === "primary"
                        ? "bg-[#1f3f66]/10 text-[#1f3f66]"
                        : "bg-[#f37021]/10 text-[#f37021]"
                    }`}
                  >
                    {list.tier}
                  </div>
                  <h3 className="mt-3 text-2xl lg:text-3xl font-extrabold text-[#1f3f66]">
                    {list.tier}
                  </h3>
                  <p className="text-gray-600 font-light mt-1">{list.description}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.schools.map((school) => (
                  <div
                    key={school}
                    className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-[#f37021] transition"
                  >
                    <p className="text-sm font-semibold text-[#1f3f66]">{school}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1f3f66]">
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
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Explore admissions
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Schedule a tour
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
