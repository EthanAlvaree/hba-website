// app/about/leadership/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

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
            “It's amazing how many of our students really gain a love of learning.”
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
                In today's ever-changing world, success requires more than academic achievement.
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
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-12 md:grid-cols-12 items-start">
          <div className="md:col-span-8 space-y-6 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Leadership team
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold">
              The team behind HBA.
            </h2>
            <ul className="space-y-4 text-lg text-white/90 font-light">
              <li>
                <span className="font-semibold text-white">Head of School:</span> Mr. Kun Xuan
              </li>
              <li>
                <span className="font-semibold text-white">Director & Principal:</span> George Humphreys
              </li>
              <li>
                <span className="font-semibold text-white">Math Chair & Director of Technology:</span> Ethan Alvarée
              </li>
              <li>
                <span className="font-semibold text-white">Assistant Director & Director of Admissions:</span> Molly Sun
              </li>
            </ul>
          </div>

          <aside className="md:col-span-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white shadow-2xl">
            <h4 className="text-xs font-bold tracking-widest uppercase text-white/70 mb-4">
              Quick links
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/about#approach" className="hover:text-[#f37021] transition-colors">
                  Our approach →
                </a>
              </li>
              <li>
                <a href="/about#students" className="hover:text-[#f37021] transition-colors">
                  Our students →
                </a>
              </li>
              <li>
                <a href="/faculty" className="hover:text-[#f37021] transition-colors">
                  Faculty directory →
                </a>
              </li>
              <li>
                <a href="/about#history" className="hover:text-[#f37021] transition-colors">
                  School history →
                </a>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  )
}
