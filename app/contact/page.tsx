import Image from "next/image"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import TallyEmbed from "./TallyEmbed"

export default function ContactPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">

      {/* HERO */}
      <PageHero
        title="Contact High Bluff Academy"
        subtitle="We’re here to help — reach out anytime."
        image="/images/contact/contact-hero.jpg"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#12233d]">
            Let’s Connect.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light">
            Whether you’re a prospective family, a current student, or a community partner,
            we’re always happy to hear from you. Our team is ready to answer questions,
            schedule tours, and provide the support you need.
          </p>
        </div>
      </section>

      {/* CONTACT CARDS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-10 lg:grid-cols-3">

          {/* PHONE */}
          <div className="bg-white rounded-3xl px-10 py-12 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-[#f37021] font-semibold tracking-[0.18em] text-xs uppercase mb-4">
              Call Us
            </div>
            <h3 className="text-2xl font-semibold text-[#12233d] mb-3">
              (858) 509‑9101
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Our office team is available to assist with admissions, scheduling, and general inquiries.
            </p>
          </div>

          {/* EMAIL */}
          <div className="bg-white rounded-3xl px-10 py-12 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-[#f37021] font-semibold tracking-[0.18em] text-xs uppercase mb-4">
              Email
            </div>
            <h3 className="text-2xl font-semibold text-[#12233d] mb-3 break-words">
              admissions@highbluffacademy.com
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Reach out anytime — we respond quickly and are happy to help.
            </p>
          </div>

          {/* VISIT */}
          <div className="bg-white rounded-3xl px-10 py-12 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="text-[#f37021] font-semibold tracking-[0.18em] text-xs uppercase mb-4">
              Visit Us
            </div>
            <h3 className="text-2xl font-semibold text-[#12233d] mb-3">
              Rancho Santa Fe, California
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Schedule a tour to see our campus, meet our faculty, and experience HBA in person.
            </p>
          </div>

        </div>
      </section>

      {/* FORM SECTION — PREMIUM EDITORIAL */}
      <section className="py-28 bg-gradient-to-br from-[#24375a] via-[#3b4f75] to-[#516a92]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Send Us a Message
          </h2>
          <p className="text-lg text-white/85 leading-relaxed font-light max-w-2xl mx-auto mt-4">
            Share a question, request a call, or schedule a tour. We typically respond within one business day.
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-6 lg:px-0">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* <div className="px-8 pt-8 pb-4 text-left border-b border-slate-200">
              <p className="text-sm font-medium tracking-[0.18em] uppercase text-[#f37021] mb-2">
                Contact Form
              </p>
              <p className="text-base text-slate-600">
                Tell us a bit about your student and how we can help.
              </p>
            </div> */}

            <TallyEmbed />
          </div>
        </div>
      </section>

      {/* MAP SECTION */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 space-y-10 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#12233d]">
            Find Us
          </h2>

          <div className="relative h-[420px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/contact/contact-map.jpg"
              alt="Map to High Bluff Academy area"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          </div>

          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            For privacy and safety, the exact address is provided when you schedule a tour or meeting.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#12233d]">
            We’re Here to Help.
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            Whether you’re exploring enrollment, planning a transition, or simply curious about our programs,
            our team is ready to support you.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="mailto:admissions@highbluffacademy.com"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Email Admissions
            </a>
            <a
              href="/admissions"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#12233d] text-[#12233d] font-semibold text-sm hover:bg-[#12233d] hover:text-white transition"
            >
              Explore Admissions
            </a>
          </div>
        </div>
      </section>

    </main>
  )
}
