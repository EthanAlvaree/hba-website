import PageHero from "@/components/layout/PageHero"

export default function Home() {
  return (
    <main>

      {/* HERO */}
      <PageHero
        title="A Community Where Students Thrive"
        image="/campus-hero.jpg"
      />

      {/* WELCOME SECTION */}
      <section className="max-w-6xl mx-auto py-20 px-6 text-center">
        <h2 className="text-4xl font-serif text-gray-900">
          Welcome to High Bluff Academy
        </h2>

        <p className="mt-6 text-lg leading-8 text-gray-700 max-w-3xl mx-auto">
          At High Bluff Academy, students discover their strengths, build confidence,
          and grow into capable, compassionate young adults. Our small class sizes,
          expert teachers, and personalized approach create a learning environment
          where every student is seen, supported, and inspired.
        </p>
      </section>

      {/* THREE PATHWAYS */}
      <section className="bg-gray-100 py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 px-6">

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
            <h3 className="text-xl font-semibold mb-3">Upper School</h3>
            <p className="text-gray-600 mb-4">
              Discover our rigorous academic programs and supportive environment.
            </p>
            <a href="/upper-school" className="text-blue-700 font-medium">
              Visit Upper School →
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
      </section>

      {/* QUOTE SECTION */}
      <section className="max-w-4xl mx-auto py-24 px-6 text-center">
        <blockquote className="text-3xl italic text-gray-700">
          “At High Bluff Academy, students don’t just learn — they grow into confident, capable young adults.”
        </blockquote>
      </section>

    </main>
  )
}
