// app/community/store/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function StorePage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="School store"
        subtitle="Wear it, gift it, share it — official HBA gear for students, families, and alumni."
        image="/images/community/store-hero.jpg"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            HBA spirit
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
            Show your colors.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            From hoodies on the way to morning class to alumni rep at college a year
            later, the HBA logo travels well. Browse the categories below and check back
            for new drops each season.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Shop the store
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Categories.
            </h2>
          </div>

          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: "Apparel",
                title: "Everyday essentials.",
                description:
                  "Hoodies, crewnecks, tees, and quarter-zips in school colors — sized for students, parents, and alumni.",
                image: "/images/community/store-apparel.jpg",
              },
              {
                label: "Spirit",
                title: "Game day & beyond.",
                description:
                  "Banners, scarves, beanies, and pennants for athletics events and family weekends.",
                image: "/images/community/store-spirit.jpg",
              },
              {
                label: "Accessories",
                title: "Carry it with you.",
                description:
                  "Bags, water bottles, stickers, and notebooks — small touches of HBA wherever you go.",
                image: "/images/community/store-accessories.jpg",
              },
            ].map((category) => (
              <div
                key={category.label}
                className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 hover:shadow-2xl transition-shadow flex flex-col"
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/60 to-transparent" />
                </div>
                <div className="p-6 flex flex-col gap-3">
                  <div className="text-xs font-bold tracking-widest uppercase text-[#f37021]">
                    {category.label}
                  </div>
                  <h3 className="text-xl font-extrabold text-[#1f3f66]">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMING SOON / VISIT STORE */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/community/store-bg.jpg"
            alt="HBA gear"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
            Online store
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            New drops, all year.
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto">
            Our online store is launching soon. In the meantime, contact the office to
            place an order, ask about sizes, or arrange pickup at the Rancho Santa Fe
            campus.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Place an order
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Get notified at launch
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
