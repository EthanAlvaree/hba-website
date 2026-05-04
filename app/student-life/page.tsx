// app/student-life/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function StudentLifePage() {
  return (
    <main className="bg-gray-50 overflow-hidden">

      {/* HERO */}
      <PageHero
        title="Student life"
        subtitle="A vibrant, connected community where students lead, explore, compete, and grow."
        image="/images/studentlife-hero.jpg"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66]">
            More than a school — a community.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            Student life at High Bluff Academy is built around leadership, creativity,
            wellness, and meaningful experiences. Whether students are debating global issues,
            leading school events, training with professional fitness instructors, or exploring
            San Diego on field trips, they’re building confidence, friendships, and memories
            that last.
          </p>
        </div>
      </section>

      {/* ASB — Leadership */}
      <section id="clubs" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Student leadership
            </div>

            <h2 className="text-4xl font-extrabold text-[#1f3f66] leading-tight">
              Associated Student Body (ASB)
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              HBA’s ASB gives students the opportunity to develop leadership skills, organize
              school events, and represent their peers. Participants gain experience in
              teamwork, public speaking, and community engagement while shaping the student
              experience.
            </p>

            <p className="text-sm text-gray-500">
              From spirit weeks to community service drives, ASB is the heartbeat of campus culture.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/asb.jpg"
                alt="ASB leadership"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
            </div>
          </div>

        </div>
      </section>

      {/* MODEL UN */}
      <section id="mun" className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/mun.jpg"
            alt="Model UN"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">

          <div className="space-y-6 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Global engagement
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold">
              Model United Nations (MUN)
            </h2>

            <p className="text-lg text-white/90 leading-relaxed font-light">
              The Model UN program allows students to engage in global issues, diplomacy,
              and debate. Students develop research, negotiation, and critical thinking skills
              as they represent countries and tackle international challenges in a collaborative setting.
            </p>

            <p className="text-sm text-white/70">
              MUN builds confidence, global awareness, and a deeper understanding of world affairs.
            </p>
          </div>

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/mun.jpg"
              alt="Students participating in Model UN"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent" />
          </div>

        </div>
      </section>

      {/* ATHLETICS */}
      <section id="athletics" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          <div className="lg:col-span-6">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/athletics.jpg"
                alt="Athletics at HBA"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Athletics & wellness
            </div>

            <h2 className="text-4xl font-extrabold text-[#1f3f66] leading-tight">
              Athletics at High Bluff Academy
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              HBA supports student-athletes with flexible schedules to balance academics and
              sports. Our athletics program encourages teamwork, discipline, and physical
              fitness, offering opportunities to participate in both competitive and
              recreational sports.
            </p>

            <p className="text-sm text-gray-500">
              Students can pursue athletics both on campus and through external competitive programs.
            </p>
            <div className="pt-2">
              <a
                href="/student-life/athletics"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow hover:brightness-110 transition"
              >
                Explore HBA Athletics →
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* EVENTS */}
      <section id="events" className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/events.jpg"
            alt="School events"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Events & school spirit
          </h2>

          <p className="text-lg text-white/90 leading-relaxed font-light max-w-3xl mx-auto">
            HBA hosts cultural celebrations, academic competitions, community service
            initiatives, and school-wide events that bring students together and build
            lasting memories.
          </p>

          <p className="text-sm text-white/70">
            From spirit rallies to holiday celebrations, there’s always something happening on campus.
          </p>
        </div>
      </section>

      {/* FIELD TRIPS */}
      <section id="fieldtrips" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid gap-16 md:grid-cols-2 items-center">

          <div className="relative h-[360px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/fieldtrips.jpg"
              alt="Field trips"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
          </div>

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Field trips
            </div>

            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Learning beyond the classroom.
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed font-light">
              Students participate in enriching field trips throughout the year, including
              visits to the San Diego Zoo, bowling outings, escape rooms, and other
              hands-on learning experiences that build community and curiosity.
            </p>

            <p className="text-sm text-gray-500">
              These experiences help students connect learning to the real world.
            </p>
          </div>

        </div>
      </section>

    </main>
  )
}
