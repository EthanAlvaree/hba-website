// app/faculty/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import { getFacultyMembers, type FacultyMember } from "@/lib/faculty"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Faculty and staff — High Bluff Academy",
  description:
    "Meet the educators, leaders, and mentors at High Bluff Academy — small classes, personalized attention, and faculty who know each student by name.",
}

function FacultyCard({ member }: { member: FacultyMember }) {
  return (
    <Link
      href={`/faculty/${member.slug}`}
      className="group block bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-300 border border-gray-100 flex flex-col"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <Image
          src={member.image}
          alt={member.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>
      <div className="p-5 flex flex-col gap-2 flex-grow">
        <div className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-orange">
          {member.area}
        </div>
        <h3 className="text-lg font-semibold text-brand-navy">{member.name}</h3>
        <p className="text-sm text-gray-600">{member.title}</p>
        <p className="mt-2 text-sm text-gray-700 line-clamp-3">{member.shortBio}</p>
        <span className="mt-auto pt-3 text-xs font-semibold text-brand-navy group-hover:text-brand-orange">
          Read full bio →
        </span>
      </div>
    </Link>
  )
}

export default async function FacultyPage() {
  const faculty = await getFacultyMembers()
  const leadership = faculty.filter((m) => m.leadership)
  const teachers = faculty.filter((m) => !m.leadership)

  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Faculty and staff"
        subtitle="Exceptional educators, mentors, and leaders dedicated to every student’s success."
        image="/images/hba/faculty/faculty-hero.webp"
      />

      <Breadcrumbs />

      {/* Intro */}
      <section className="py-20 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-brand-navy">
            Meet the people behind High Bluff Academy.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            Our faculty bring deep expertise, warmth, and a shared commitment to personalized
            education. They are scholars, professionals, artists, and mentors who know their
            students well and care deeply about their growth—both in and out of the classroom.
          </p>
        </div>
      </section>

      {/* Leadership */}
      <section id="leadership" className="pb-12 bg-gray-50 scroll-mt-24">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-8 pt-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-navy/10 text-brand-navy font-bold tracking-widest text-xs uppercase rounded-full">
              Leadership
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              School leadership
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((member) => (
              <FacultyCard key={member.slug} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="border-t border-gray-200" />
        </div>
      </div>

      {/* Teachers */}
      <section id="teachers" className="pb-24 bg-gray-50">
        <div className="reveal max-w-7xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Faculty
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy">
              Teachers and staff
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map((member) => (
              <FacultyCard key={member.slug} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="py-20 bg-brand-navy">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-5">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Teaching is personal here.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light">
            At High Bluff Academy, students are known by name, strengths, and aspirations.
            Our faculty build real relationships, provide thoughtful feedback, and help each
            student discover what they’re capable of—academically and beyond.
          </p>
        </div>
      </section>
    </main>
  )
}
