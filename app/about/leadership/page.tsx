// app/about/leadership/page.tsx

import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"

export default function LeadershipPage() {
  return (
    <main>

      {/* HERO */}
      <PageHero
        title="Leadership"
        subtitle="Guiding High Bluff Academy with vision, integrity, and a commitment to student success."
        image="/leadership.jpg"
      />

      {/* AUTO-GENERATED BREADCRUMBS */}
      <Breadcrumbs />

      {/* INTRO SECTION */}
      <Section>
        <Container className="max-w-4xl">
          <blockquote className="text-2xl italic text-gray-700 border-l-4 border-orange-500 pl-6">
            “It's amazing how many of our students really gain a love of learning.”
          </blockquote>

          <h2 className="mt-12 text-3xl font-bold text-gray-900">
            Welcome from the Head of School
          </h2>

          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            At High Bluff Academy, we are dedicated to cultivating a learning environment
            where students are empowered to grow, achieve, and thrive. Our mission is rooted
            in the belief that every student has unique strengths, and with the right guidance
            and support, each can reach their fullest potential.
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed">
            We take pride in providing a personalized educational experience that challenges
            students academically while nurturing their confidence and independence. Our faculty
            serves not only as educators, but also as mentors—guiding students to think critically,
            act responsibly, and make informed decisions about their future.
          </p>

          <p className="mt-4 text-lg text-gray-700 leading-relaxed">
            In today’s ever-changing world, success requires more than academic achievement.
            It requires resilience, adaptability, and a lifelong love of learning. At High Bluff
            Academy, we are committed to developing these qualities in every student.
          </p>

          <div className="mt-8">
            <p className="font-semibold text-gray-900">Warm regards,</p>
            <p className="font-semibold text-gray-900 mt-2">Mr. Kun Xuan</p>
            <p className="text-gray-700">Head of School</p>
          </div>
        </Container>
      </Section>

      {/* SIDEBAR LAYOUT (OPTIONAL) */}
      <Section background="gray">
        <Container className="grid md:grid-cols-3 gap-12">
          
          {/* MAIN CONTENT */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold text-gray-900">Leadership Team</h3>

            <ul className="space-y-4 text-lg text-gray-700">
              <li><strong>Head of School:</strong> Mr. Kun Xuan</li>
              <li><strong>Director & Principal:</strong> George Humphreys</li>
              <li><strong>Math Chair & Director of Technology:</strong> Ethan Alvarée</li>
              <li><strong>Assistant Director & Director of Admissions:</strong> Molly Sun</li>
            </ul>
          </div>

          {/* SIDEBAR */}
          <aside className="bg-[#1f3f66] text-white p-6 rounded-lg shadow">
            <h4 className="text-xl font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/about#approach" className="hover:underline">Our Approach</a></li>
              <li><a href="/about#students" className="hover:underline">Our Students</a></li>
              <li><a href="/faculty" className="hover:underline">Faculty Directory</a></li>
              <li><a href="/about#history" className="hover:underline">School History</a></li>
            </ul>
          </aside>

        </Container>
      </Section>

    </main>
  )
}
