// app/student-life/athletics/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "Athletics — High Bluff Academy",
  description:
    "HBA's flexible scheduling supports elite student-athletes — including ATP top-40 tennis pro Brandon Nakashima — with custom days, late starts, and NCAA-approved courses.",
}

type AthleteStory = {
  name: string
  classYear?: string
  sport: string
  outcome: string
  story: string
  image?: string
  imagePosition?: "top" | "center" | "bottom"
}

const stories: AthleteStory[] = [
  {
    name: "Brandon Nakashima",
    sport: "Tennis",
    outcome: "ATP top-40 in the world; #1 D1 recruit (2019)",
    story:
      "Brandon was the #1 recruit in 2019 for Division 1 tennis and is now a top-40 player on the ATP Tour. HBA built a schedule around his travel and training so he could work out daily with his coach, compete in tournaments, and still maintain a 4.3 GPA.",
    image: "/images/athletics/brandon-nakashima.webp",
  },
  {
    name: "Bryce Nakashima",
    sport: "Tennis",
    outcome: "Now at Ohio State University",
    story:
      "Brandon’s brother Bryce also benefited from a flexible HBA schedule that supported a serious tennis training regimen. He is now a student at Ohio State.",
    image: "/images/athletics/bryce-nakashima.webp",
  },
  {
    name: "Ethan Schiffman",
    sport: "Tennis",
    outcome: "Now at UC Berkeley",
    story:
      "HBA helped Ethan balance a rigorous AP-heavy course load with a busy junior tennis schedule. He went on to enroll at UC Berkeley.",
    image: "/images/athletics/ethan-schiffman.webp",
    imagePosition: "top",
  },
  {
    name: "Krando Nishiba",
    classYear: "Class of 2020",
    sport: "Golf",
    outcome: "USC golf",
    story:
      "Krando transferred from La Jolla Country Day to HBA and added an extra year of high school. The flexibility gave him time to develop his golf game while raising his GPA and adding more AP classes — and he achieved his lifelong goal of attending USC as a recruited golfer.",
    image: "/images/athletics/krando-nishiba.webp",
    imagePosition: "top",
  },
  {
    name: "Tomohiro Kawada",
    classYear: "Class of 2020",
    sport: "Gymnastics",
    outcome: "Now at Ohio State University",
    story:
      "A high-level gymnast who travelled to Irvine daily after school to train, often arriving home after 11pm on school nights. HBA created a 9:30am late-start schedule so he could get adequate sleep and still complete a full college-prep curriculum.",
    image: "/images/athletics/tomohiro-kawada.webp",
  },
  {
    name: "Andrew Heiati",
    classYear: "Class of 2019",
    sport: "Tae Kwon Do",
    outcome: "Pan-American Champion; SDSU Webb Honors College, Mechanical Engineering",
    story:
      "Andrew was the Pan-American Tae Kwon Do Champion. He competed in national and international tournaments while taking two years of AP Calculus, Linear Algebra, and two years of AP Physics — and was admitted to SDSU’s prestigious Webb Honors College.",
    image: "/images/athletics/andrew-heiati.webp",
  },
  {
    name: "Gabe Panikowski",
    sport: "Football",
    outcome: "First-team All-American kicker; now at Oklahoma State",
    story:
      "Gabe used HBA’s flexible scheduling to balance serious football training with a full college-prep course load. After stops at Sacramento State and Riverside City College, he was perfect on field goals at Idaho State in 2024 — 15-for-15, the most makes without a miss in the country, with a 55-yard long — earning first-team All-American honors and the Fred Mitchell Award as the nation’s best non-FBS kicker. He’s now a kicker for the Oklahoma State Cowboys.",
    image: "/images/athletics/gabe-panikowski.webp",
  },
]

export default function AthleticsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Athletics"
        subtitle="A first-class education and the flexibility to compete at the highest levels."
        image="/images/athletics/hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            HBA athletes
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Built for the demands of elite athletic training.
          </h2>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            HBA has decades of experience supporting athletes who compete at the highest levels.
            We design schedules around training, travel, and recovery — without compromising
            academic rigor. All of our courses are NCAA-approved, and our students have gone
            on to play Division 1 sports at top universities across the country.
          </p>
        </div>
      </section>

      {/* FLEXIBILITY HIGHLIGHT */}
      <section className="py-20 bg-gray-50">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                eyebrow: "Compressed weeks",
                title: "Four-day schedules",
                body: "Consolidate lessons into four days per week to free up training and travel days.",
              },
              {
                eyebrow: "Late start / early dismissal",
                title: "Customized hours",
                body: "Build a school day around morning workouts, afternoon training, or recovery.",
              },
              {
                eyebrow: "NCAA approved",
                title: "Eligibility-ready",
                body: "All HBA courses meet NCAA Division 1 eligibility requirements.",
              },
              {
                eyebrow: "Hybrid & online",
                title: "Travel-friendly",
                body: "Continue coursework on the road through our virtual classroom and 1:1 options.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >
                <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase mb-2">
                  {card.eyebrow}
                </div>
                <h3 className="text-lg font-semibold text-[#1f3f66] mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Athlete stories
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Real athletes. Real schedules. Real results.
            </h2>
          </div>

          <div className="space-y-12">
            {stories.map((story, idx) => (
              <article
                key={story.name}
                className={`grid gap-10 lg:grid-cols-12 items-center ${
                  idx % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className="lg:col-span-5">
                  <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl bg-gray-200">
                    {story.image && (
                      <Image
                        src={story.image}
                        alt={story.name}
                        fill
                        className="object-cover"
                        style={{ objectPosition: story.imagePosition ?? "center" }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/60 to-transparent" />
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase">
                    {story.sport}
                    {story.classYear && ` · ${story.classYear}`}
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#1f3f66]">{story.name}</h3>
                  <p className="text-lg font-medium text-gray-800">{story.outcome}</p>
                  <p className="text-gray-600 font-light leading-relaxed">{story.story}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Talk to us about your schedule.
          </h2>
          <p className="text-lg text-white/90 font-light">
            Whether you’re a tennis pro on tour, a gymnast training in another city, or an
            elite junior athlete with national-level commitments, we’ll build a plan that works.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Contact admissions
            </Link>
            <Link
              href="/admissions"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Apply to HBA
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
