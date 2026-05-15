// app/welcome/page.tsx

import Image from "next/image"
import {
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline"
import PageHero from "@/components/ui/PageHero"
import Breadcrumbs from "@/components/layout/Breadcrumbs"
import OnboardingFlow from "./OnboardingFlow"

export const metadata = {
  title: "Welcome to HBA — Set up your account",
  description:
    "New to High Bluff Academy? Set up your school Microsoft 365 account, install your apps, and get ready for class in about 15 minutes.",
}

export default function WelcomePage() {
  return (
    <main className="bg-gray-50">
      <PageHero
        title="Welcome to High Bluff Academy"
        subtitle="Let’s get your school account and apps ready — about 15 minutes."
        image="/images/new-user-setup/new-user-setup-hero.webp"
      />

      <Breadcrumbs />

      {/* CO-BRAND */}
      <section className="bg-white border-b border-gray-100 py-10 print:hidden">
        <div className="reveal max-w-3xl mx-auto px-6 lg:px-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 sm:gap-10">
            <Image
              src="/images/brand/hba-logo-round.webp"
              alt="High Bluff Academy"
              width={499}
              height={499}
              className="h-14 sm:h-16 w-auto"
            />
            <span
              className="text-2xl font-light text-gray-300 select-none"
              aria-hidden="true"
            >
              ×
            </span>
            <Image
              src="/images/new-user-setup/microsoft.webp"
              alt="Microsoft 365"
              width={225}
              height={225}
              className="h-14 sm:h-16 w-auto"
            />
          </div>
          <p className="text-sm text-gray-500 text-center max-w-md">
            School accounts, email, and apps at HBA are powered by Microsoft 365.
          </p>
        </div>
      </section>

      {/* WHAT YOU'LL NEED */}
      <section className="py-24 bg-white">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
              Before you start
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-navy leading-tight">
              What you’ll need.
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
              Have these handy before you begin. The whole process should take
              about 15 minutes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                eyebrow: "Item 1",
                title: "Your account info",
                text: "Your school email and temporary password — both are in the enrollment welcome email sent to your family.",
                Icon: KeyIcon,
              },
              {
                eyebrow: "Item 2",
                title: "Your phone",
                text: "iPhone or Android — required for the Authenticator app and sign-in security.",
                Icon: DevicePhoneMobileIcon,
              },
              {
                eyebrow: "Item 3",
                title: "Your computer or tablet",
                text: "Windows, Mac, or iPad — whatever you’ll use for class.",
                Icon: ComputerDesktopIcon,
              },
            ].map((item) => (
              <div
                key={item.eyebrow}
                className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-navy to-[#3b5f8e] flex items-center justify-center shadow-lg shadow-brand-navy/25 mb-5 ring-1 ring-white/20">
                  <item.Icon
                    className="w-7 h-7 text-white"
                    strokeWidth={1.75}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
                </div>
                <div className="text-xs font-bold tracking-widest text-brand-orange uppercase mb-2">
                  {item.eyebrow}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-brand-navy/5 border border-brand-navy/15 rounded-2xl p-6 sm:p-10">
            <div className="text-xs font-bold tracking-widest text-brand-orange uppercase mb-5 text-center">
              Your username
            </div>
            <div className="font-mono text-base sm:text-xl lg:text-2xl font-semibold text-brand-navy text-center leading-tight break-words">
              firstname.lastname.
              <span className="text-brand-orange">YY</span>
              <wbr />@highbluffacademy.com
            </div>

            <div className="mt-6 pt-6 border-t border-brand-navy/10 grid gap-4 sm:grid-cols-3 text-xs sm:text-sm text-gray-600">
              <div className="text-center">
                <div className="font-mono font-semibold text-gray-900 mb-1 break-all">
                  firstname.lastname
                </div>
                <div>Your first and last name</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-brand-orange mb-1">YY</div>
                <div>Last two digits of your graduation year</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-semibold text-gray-900 mb-1 break-all">
                  @highbluffacademy.com
                </div>
                <div>Same for everyone</div>
              </div>
            </div>

            <p className="mt-6 pt-6 border-t border-brand-navy/10 text-sm text-gray-600 text-center leading-relaxed">
              <span className="font-semibold text-brand-navy">Example:</span> a
              senior graduating in 2027 named Jane Doe would use{" "}
              <span className="font-mono font-semibold text-brand-navy">
                jane.doe.27@highbluffacademy.com
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE ONBOARDING FLOW */}
      <OnboardingFlow />

      {/* HELP */}
      <section className="py-20 bg-gray-50 print:hidden">
        <div className="reveal max-w-4xl mx-auto px-6 lg:px-12 text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-brand-navy">
            Stuck on a step?
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed font-light max-w-2xl mx-auto">
            The HBA office is happy to help. Stop by, call, or send us an email
            and we’ll walk you through it.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <a
              href="mailto:admissions@highbluffacademy.com"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-brand-orange text-white font-semibold text-sm shadow-lg hover:brightness-110 transition"
            >
              Email the office
            </a>
            <a
              href="tel:+18585099101"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-brand-navy text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white transition"
            >
              Call (858) 509‑9101
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
