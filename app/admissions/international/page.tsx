// app/admissions/international/page.tsx

import Image from "next/image"
import Link from "next/link"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"

export const metadata = {
  title: "International student admissions — High Bluff Academy",
  description:
    "F-1 visa enrollment for grades 9–12. ESL support, homestay assistance, and the I-20 / DS-160 / SEVIS pathway — explained step by step.",
}

const steps = [
  {
    n: "01",
    title: "Submit the application",
    body: "Complete the application form and email it along with a copy of the student's passport to admissions@highbluffacademy.com.",
  },
  {
    n: "02",
    title: "Schedule an online interview",
    body: "After we receive your application, our admissions team will email to schedule a friendly online interview to get to know your student.",
  },
  {
    n: "03",
    title: "Receive your acceptance & I-20",
    body: "Once admitted, HBA issues the I-20 form needed to apply for the F-1 student visa. The I-20 deposit is $10,000, applied directly toward tuition when the student arrives.",
  },
  {
    n: "04",
    title: "Complete the DS-160",
    body: "After receiving your I-20, complete the DS-160 Non-Immigrant Visa Application online with the U.S. Department of State.",
  },
  {
    n: "05",
    title: "Pay the SEVIS I-901 fee",
    body: "Pay the SEVIS I-901 fee ($350) online through the U.S. Department of Homeland Security website.",
  },
  {
    n: "06",
    title: "Schedule the visa interview",
    body: "Contact the nearest U.S. Embassy or Consulate to schedule your F-1 visa interview. We can advise on documents to bring.",
  },
  {
    n: "07",
    title: "Medical clearances & insurance",
    body: "Submit proof of required immunizations and a medical and dental clearance. We can recommend local providers once on campus.",
  },
]

export default function InternationalAdmissionsPage() {
  return (
    <main className="bg-gray-50 overflow-hidden">
      <PageHero
        title="International student admissions"
        subtitle="Welcome to San Diego — and to High Bluff Academy."
        image="/images/admissions/international-hero.webp"
      />

      <Breadcrumbs />

      {/* INTRO */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 grid gap-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              F-1 visa school
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66] leading-tight">
              Authorized to enroll international students on F-1 visas.
            </h2>
            <p className="text-lg text-gray-600 font-light leading-relaxed">
              High Bluff Academy is authorized under federal law to enroll non-immigrant
              students on F-1 visas. We accept students entering grades 9–12 with at least
              some English proficiency, and we provide structured ESL support and academic
              accommodations until students perform at grade level independently.
            </p>
            <p className="text-gray-600 font-light leading-relaxed">
              Our small school is the perfect supportive environment for international students
              to build confidence in English. Many students elect to repeat a grade or take a
              13th year of high school to strengthen their English and raise their GPA before
              applying to university.
            </p>
          </div>

          <div className="lg:col-span-5 relative h-[420px] rounded-3xl overflow-hidden shadow-2xl">
            <Image
              src="/images/admissions/san-diego.webp"
              alt="San Diego coastline"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f3f66]/70 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Our city</p>
              <p className="mt-2 text-lg font-semibold">
                San Diego — America&rsquo;s Finest City, with year-round perfect weather.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TUITION & FEES */}
      <section className="py-24 bg-[#1f3f66] relative">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/admissions/tuition-bg.webp"
            alt="Campus architecture"
            fill
            className="object-cover"
          />
        </div>

        <div className="reveal relative max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Tuition &amp; fees
            </h2>
            <p className="mt-4 text-white/80 text-lg max-w-2xl mx-auto font-light">
              Annual costs for full-time international students on an F-1 visa.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Required annual fees */}
            <div className="bg-white rounded-3xl p-8 text-gray-900 shadow-xl">
              <div className="text-xs font-bold tracking-widest text-[#f37021] uppercase mb-2">
                Annual cost
              </div>
              <p className="text-4xl font-extrabold text-[#1f3f66] mb-1">$45,580</p>
              <p className="text-sm text-gray-600 mb-6">
                Total annual cost for full-time international students.
              </p>

              <div className="border-t border-gray-100 pt-5">
                <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3">
                  Breakdown including
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="text-gray-700">Tuition</span>
                    <span className="font-semibold text-[#1f3f66] tabular-nums">$29,580</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="text-gray-700">I-20 issuing fee</span>
                    <span className="font-semibold text-[#1f3f66] tabular-nums">+ $10,000</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4">
                    <span className="text-gray-700">International student services fee</span>
                    <span className="font-semibold text-[#1f3f66] tabular-nums">+ $6,000</span>
                  </li>
                  <li className="flex items-baseline justify-between gap-4 border-t border-gray-200 mt-2 pt-3">
                    <span className="font-bold text-[#1f3f66]">Total</span>
                    <span className="font-bold text-[#1f3f66] text-lg tabular-nums">= $45,580</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-gray-700">
                    (Optional) ESL program fee
                    <span className="block text-xs text-gray-500 mt-1">
                      If needed; based on a placement assessment administered at HBA.
                    </span>
                  </span>
                  <span className="font-semibold text-[#1f3f66] tabular-nums whitespace-nowrap">+ $6,000</span>
                </div>
              </div>
            </div>

            {/* Other fees */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-white shadow-xl">
              <div className="text-xs font-bold tracking-widest text-white/70 uppercase mb-4">
                Other fees
              </div>
              <ul className="divide-y divide-white/10 text-sm">
                <li className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-white/85">Registration fee (non-refundable)</span>
                  <span className="font-semibold text-white">$300</span>
                </li>
                <li className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-white/85">Late enrollment (after April 10)</span>
                  <span className="font-semibold text-white">$1,000</span>
                </li>
                <li className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-white/85">Graduation fee (12th grade)</span>
                  <span className="font-semibold text-white">$600</span>
                </li>
              </ul>
              <p className="mt-6 text-xs text-white/70 leading-relaxed">
                The SEVIS I-901 fee ($350) is paid separately to the U.S. Department of
                Homeland Security as part of the F-1 visa process — see step 05 below.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* APPLICATION STEPS */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-6xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-[#1f3f66]/10 text-[#1f3f66] font-bold tracking-widest text-xs uppercase rounded-full">
              Application process
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#1f3f66]">
              Seven steps from application to first day of class.
            </h2>
          </div>

          <ol className="space-y-4">
            {steps.map((step) => (
              <li
                key={step.n}
                className="flex gap-6 bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1f3f66] text-white flex items-center justify-center font-bold">
                  {step.n}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1f3f66] mb-1">{step.title}</h3>
                  <p className="text-gray-600 font-light leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* HOMESTAY */}
      <section className="py-24 bg-gray-50">
        <div className="reveal max-w-5xl mx-auto px-6 lg:px-12 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-[#f37021]/10 text-[#f37021] font-bold tracking-widest text-xs uppercase rounded-full">
              Homestay
            </div>
            <h2 className="text-3xl font-extrabold text-[#1f3f66] leading-tight">
              Help with finding a host family.
            </h2>
            <p className="text-gray-600 font-light leading-relaxed">
              HBA does not provide homestays directly, but we partner with trusted local
              homestay providers and will help your family find the right match. Homestay
              fees vary and typically include three meals per day and transportation to and
              from school. Public transportation is not available to campus.
            </p>
          </div>
          <div className="relative h-[320px] rounded-3xl overflow-hidden shadow-xl">
            <Image
              src="/images/admissions/homestay.webp"
              alt="Homestay family"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1f3f66]">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
            Ready to apply?
          </h2>
          <p className="text-lg text-white/90 font-light">
            Start your application today. Our admissions team responds within one business day
            and can answer questions in English or Mandarin.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="https://secure.gradelink.com/2962/enrollment"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#f37021] text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Start application
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white hover:text-[#1f3f66] transition"
            >
              Contact admissions
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
