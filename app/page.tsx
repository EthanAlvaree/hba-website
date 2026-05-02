// app/page.tsx

import PageHero from "@/components/ui/PageHero"
import PageLayout from "@/components/layout/PageLayout"
import Footer from "@/components/footer/Footer"

import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"
import CTA from "@/components/ui/CTA"

export default function Home() {
  return (
    <>
      <PageLayout>

        <PageHero
          title="A Community Where Students Thrive"
          image="/images/campus-hero.png"
        />

        {/* WELCOME */}
        <Section>
          <Container className="text-center max-w-3xl">
            <h2 className="text-4xl font-serif text-gray-900">
              Welcome to High Bluff Academy
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-700">
              At High Bluff Academy, students discover their strengths, build confidence,
              and grow into capable, compassionate young adults. Our small class sizes,
              expert teachers, and personalized approach create a learning environment
              where every student is seen, supported, and inspired.
            </p>
          </Container>
        </Section>

        {/* PATHWAYS */}
        <Section background="gray">
          <Container>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">

              <div className="bg-white p-10 shadow hover:shadow-lg transition rounded">
                <h3 className="text-xl font-semibold mb-3">Admissions</h3>
                <p className="text-gray-600 mb-4">
                  Learn about our admissions process, tuition, and how to apply.
                </p>
                <a href="/admissions" className="text-blue-700 font-medium">
                  Explore Admissions →
                </a>
              </div>

              <div className="bg-white p-10 shadow hover:shadow-lg transition rounded">
                <h3 className="text-xl font-semibold mb-3">Programs</h3>
                <p className="text-gray-600 mb-4">
                  Discover our rigorous academic programs and supportive environment.
                </p>
                <a href="/programs" className="text-blue-700 font-medium">
                  Explore Programs →
                </a>
              </div>

              <div className="bg-white p-10 shadow hover:shadow-lg transition rounded">
                <h3 className="text-xl font-semibold mb-3">Student Life</h3>
                <p className="text-gray-600 mb-4">
                  Explore clubs, activities, and the vibrant community at HBA.
                </p>
                <a href="/student-life" className="text-blue-700 font-medium">
                  Student Life →
                </a>
              </div>

            </div>
          </Container>
        </Section>

        {/* QUOTE */}
        <Section>
          <Container className="text-center max-w-4xl">
            <blockquote className="text-3xl italic text-gray-700">
              “At High Bluff Academy, students don’t just learn — they grow into confident, capable young adults.”
            </blockquote>
          </Container>
        </Section>

        {/* CTA */}
        <CTA
          title="Ready to Visit High Bluff Academy?"
          description="Schedule a campus visit and discover how our personalized approach helps students thrive."
          buttonText="Schedule a Visit"
          buttonLink="/contact"
        />

      </PageLayout>
    </>
  )
}