import PageHero from "@/components/layout/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function Page(){

  return (
    <main>

      <PageHero
        title="Leadership"
        image="/leadership.jpg"
      />

      <Breadcrumbs
        items={[
          "Our Approach",
          "Our Students",
          "Our Teachers",
          "Leadership"
        ]}
      />

      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-12 py-16">

        <div className="col-span-2">

          <blockquote className="text-2xl italic text-gray-700 border-l-4 border-orange-500 pl-6">
            “It's amazing how many of our students really gain a love of learning.”
          </blockquote>

          <h2 className="mt-12 text-3xl">
            Welcome from the Head of School
          </h2>

        </div>

        <div className="bg-blue-900 text-white p-6">
          Sidebar content
        </div>

      </div>

    </main>
  )
}