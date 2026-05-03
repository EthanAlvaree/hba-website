// app/community/alumni/page.tsx

import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export default function AlumniPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="Alumni"
        subtitle="Once an HBA student, always part of the family. Stay connected, give back, and pay it forward."
        image="/images/community/alumni-hero.jpg"
      />

      <Breadcrumbs />

      {/* WELCOME */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            Once HBA, always HBA
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#1f3f66] leading-tight">
            Welcome back.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-3xl mx-auto">
            Whether you graduated last spring or two decades ago, you are part of the
            High Bluff Academy story. Our alumni go on to top universities, meaningful
            careers, and lives shaped by the small classrooms, close mentorship, and
            independent thinking they built here.
          </p>
        </div>
      </section>

      {/* STAY CONNECTED */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid gap-16 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Stay connected
            </div>
            <h2 className="text-4xl font-extrabold text-[#1f3f66] leading-tight">
              Don’t lose the thread.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light">
              The relationships built at HBA — with faculty, with classmates — don’t
              have to end at graduation. We host alumni events throughout the year, share
              school updates, and invite alumni back to campus to speak with current
              students about college and career.
            </p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li>• Annual alumni gathering at the Rancho Santa Fe campus</li>
              <li>• Class reunions and milestone year celebrations</li>
              <li>• Periodic alumni newsletters with school news</li>
              <li>• Follow HBA on Instagram, Facebook, and TikTok</li>
            </ul>
            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
              >
                Update your info
              </a>
              <a
                href="https://www.instagram.com/highbluffacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#1f3f66] text-[#1f3f66] font-semibold text-sm hover:bg-[#1f3f66] hover:text-white transition"
              >
                Follow on Instagram
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl group">
              <Image
                src="/images/community/alumni-reunion.jpg"
                alt="Alumni gathering"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/80 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* GIVE BACK */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/community/alumni-mentor.jpg"
            alt="Alumni mentoring students"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 lg:px-12 space-y-12">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-white/10 text-white font-bold tracking-widest text-xs uppercase rounded-full">
              Give back
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Three ways to pay it forward.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Mentor a student",
                description:
                  "Speak to current students about college, your career, or what you wish you’d known. A short visit makes a long impression.",
              },
              {
                title: "Open a door",
                description:
                  "Internships, job-shadow days, and informational interviews are some of the most valuable experiences our students can have.",
              },
              {
                title: "Champion HBA",
                description:
                  "Refer a family who would thrive here, recommend us on platforms you use, or join us at an admissions event to share your story.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white shadow-2xl"
              >
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-white/85 leading-relaxed font-light">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
            We’d love to hear from you
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
            Tell us where you are.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            College, career, family, travel — wherever HBA has taken you, we want to
            celebrate it. Drop us a line so we can keep your contact info current and
            share your story with future students.
          </p>
          <div className="pt-4">
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Send us an update
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
