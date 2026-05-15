// app/community/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function CommunityPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">

      {/* HERO */}
      <PageHero
        title="Community at High Bluff Academy"
        subtitle="A connected, supportive, and service‑driven school culture."
        image="/images/hba/community/community-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-brand-navy">
            A community rooted in purpose.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            High Bluff Academy is more than a school — it’s a community built on service,
            mentorship, academic support, and meaningful partnerships. Students learn to lead,
            to give back, and to grow into thoughtful, responsible young adults.
          </p>
        </div>
      </section>

      {/* COMMUNITY SERVICE */}
      <section id="service" className="py-24 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Community service
            </div>

            <h2 className="text-4xl font-extrabold text-brand-navy leading-tight">
              Giving back, growing forward.
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              HBA encourages students to give back through volunteer projects and service
              initiatives. These experiences help students develop empathy, leadership, and
              a sense of social responsibility while making a positive impact locally and globally.
            </p>

            <p className="text-sm text-gray-500">
              Service is woven into the culture of HBA — from school‑wide drives to student‑led initiatives.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/hba/community/service.webp"
                alt="Community service"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 to-transparent" />
            </div>
          </div>

        </div>
      </section>

      {/* ACADEMIC SUPPORT & ADVISORY */}
      <section id="advisory" className="py-24 bg-brand-navy relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/hba/community/advisory.webp"
            alt="Academic support"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">

          <div className="space-y-6 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Academic support & advisory
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold">
              Personalized guidance for every student.
            </h2>

            <p className="text-lg text-white/90 leading-relaxed font-light">
              Our advisory program ensures that every student receives individualized
              academic support. Advisors help students set goals, monitor progress, and
              develop strong study habits, while supplemental tutoring and test prep are
              available as needed.
            </p>

            <p className="text-sm text-white/70">
              Students are never alone in their academic journey — they’re supported every step of the way.
            </p>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hba/community/advisory.webp"
              alt="Advisory program"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>

        </div>
      </section>

      {/* NHS */}
      <section id="nhs" className="py-24 bg-white">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/hba/community/nhs.webp"
                alt="National Honor Society"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/80 to-transparent" />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              National Honor Society
            </div>

            <h2 className="text-4xl font-extrabold text-brand-navy leading-tight">
              Recognizing excellence.
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              HBA’s chapter of the National Honor Society honors students who demonstrate
              scholarship, leadership, service, and character. Members participate in
              service projects, leadership activities, and academic enrichment opportunities.
            </p>

            <p className="text-sm text-gray-500">
              NHS students set the tone for academic excellence and community engagement.
            </p>
          </div>

        </div>
      </section>

      {/* COMMUNITY PARTNERSHIPS */}
      <section id="partnerships" className="py-24 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Community partnerships
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Learning beyond the classroom.
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              High Bluff Academy partners with specialist organizations — from test prep
              and tutoring to fitness and student dining — so every student gets depth and
              support beyond what a single school can provide on its own.
            </p>

            <p className="text-sm text-gray-500">
              Pacific Crest Institute, Study Hut Tutoring, Joy of Life Fitness, and more.
            </p>

            <div className="pt-2">
              <a
                href="/community/partnerships"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-brand-orange text-white font-semibold text-sm shadow hover:brightness-110 transition"
              >
                Meet our partners →
              </a>
            </div>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/hba/community/partnerships.webp"
              alt="Community partnerships"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>

        </div>
      </section>

      {/* VOLUNTEERING */}
      <section id="volunteering" className="py-24 bg-brand-navy relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/hba/community/volunteering.webp"
            alt="Volunteering"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Volunteering & service learning
          </h2>

          <p className="text-lg text-white/90 leading-relaxed font-light max-w-3xl mx-auto">
            Students engage in volunteer opportunities that make a meaningful impact on the
            local and global community. Through service, they develop empathy, leadership,
            and a lifelong commitment to giving back.
          </p>

          <p className="text-sm text-white/70 max-w-2xl mx-auto">
            Whether assisting local organizations, participating in school‑led initiatives,
            or organizing service projects, HBA students learn the value of teamwork,
            responsibility, and civic engagement.
          </p>
        </div>
      </section>

      {/* CLOSING */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
            A community that lifts each other up.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            At High Bluff Academy, students are part of a supportive, connected community
            where they are encouraged to grow, lead, and make a difference.
          </p>
        </div>
      </section>

    </main>
  )
}
