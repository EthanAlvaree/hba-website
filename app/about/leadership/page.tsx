// app/about/leadership/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

const leaders = [
  {
    name: "Mr. Kun Xuan",
    role: "Head of School",
    image: "/images/leadership/leadership-kun.jpg",
  },
  {
    name: "George Humphreys",
    role: "Director and Principal",
    image: "/images/leadership/leadership-george.jpg",
  },
  {
    name: "Ethan Alvarée",
    role: "Director of Instruction and Curriculum",
    image: "/images/leadership/leadership-ethan.jpg",
  },
  {
    name: "Molly Sun",
    role: "Director of Admissions and Operations",
    image: "/images/leadership/leadership-molly.jpg",
  },
]

export default function LeadershipPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Leadership"
        subtitle="Guiding High Bluff Academy with vision, integrity, and a commitment to student success."
        image="/images/leadership-hero.jpg"
      />

      <Breadcrumbs />

      {/* WELCOME FROM HEAD OF SCHOOL */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 space-y-12">
          <blockquote className="text-2xl lg:text-3xl italic text-[#1f3f66] border-l-4 border-[#f37021] pl-6 font-light leading-relaxed">
            “It’s amazing how many of our students really gain a love of learning.”
          </blockquote>

          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Head of school
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
              Welcome from the head of school.
            </h2>
            <div className="space-y-4 text-lg text-gray-600 leading-relaxed font-light">
              <p>
                At High Bluff Academy, we are dedicated to cultivating a learning environment
                where students are empowered to grow, achieve, and thrive. Our mission is rooted
                in the belief that every student has unique strengths, and with the right guidance
                and support, each can reach their fullest potential.
              </p>
              <p>
                We take pride in providing a personalized educational experience that challenges
                students academically while nurturing their confidence and independence. Our faculty
                serves not only as educators, but also as mentors—guiding students to think critically,
                act responsibly, and make informed decisions about their future.
              </p>
              <p>
                In today’s ever-changing world, success requires more than academic achievement.
                It requires resilience, adaptability, and a lifelong love of learning. At High Bluff
                Academy, we are committed to developing these qualities in every student.
              </p>
            </div>
            <div className="pt-4">
              <p className="font-semibold text-[#1f3f66]">Warm regards,</p>
              <p className="font-semibold text-[#1f3f66] mt-2">Mr. Kun Xuan</p>
              <p className="text-gray-600 text-sm">Head of School</p>
            </div>
          </div>
        </div>
      </section>

      {/* LEADERSHIP TEAM */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Leadership team
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold">
              The team behind HBA.
            </h2>
            <p className="text-white/80 font-light">
              Click any leader below to read their full bio on our faculty page.
            </p>
          </div>

          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {leaders.map((leader) => (
              <li key={leader.name}>
                <Link
                  href="/faculty#leadership"
                  className="group block text-center"
                >
                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl transition duration-300 group-hover:ring-[#f37021]">
                    <Image
                      src={leader.image}
                      alt={leader.name}
                      fill
                      sizes="180px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="mt-5 space-y-1">
                    <p className="text-base font-semibold text-white group-hover:text-[#f37021] transition-colors">
                      {leader.name}
                    </p>
                    <p className="text-sm text-white/70 font-light">{leader.role}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="text-center pt-2">
            <Link
              href="/faculty"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#1f3f66] font-semibold text-sm hover:bg-[#f37021] hover:text-white transition"
            >
              See all faculty and staff →
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
