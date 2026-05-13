// components/footer/Footer.tsx

import Image from "next/image"
import Link from "next/link"
import { FaInstagram, FaFacebookF, FaTiktok, FaYoutube, FaLinkedinIn, FaYelp } from "react-icons/fa"
import { siteConfig } from "@/lib/site"

export default function Footer() {
  const { address, contact, social } = siteConfig

  return (
    <footer className="mt-20">

      {/* Campus Image */}
      <div className="w-full h-72 relative">
        <Image
          src="/images/home/campus-aerial.webp"
          alt={`${siteConfig.name} campus`}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Footer Gradient */}
      <div className="bg-gradient-to-b from-brand-navy to-brand-navy-deep text-white">

        {/* Main Grid */}
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Logo + Contact */}
          <div>
            <div className="relative w-24 h-24 mb-4">
              <Image
                src="/images/brand/hba-logo-color.webp"
                alt={`${siteConfig.name} logo`}
                fill
                sizes="96px"
                className="object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold mb-3">{siteConfig.name}</h3>

            <p className="text-sm leading-relaxed text-gray-200">
              {address.streetLine1}<br />
              {address.locality}, {address.regionCode} {address.postalCode}<br />
              {contact.phone}<br />
              {contact.infoEmail}
            </p>

            {/* Social Icons — each renders only if the school has that network. */}
            <div className="flex flex-wrap gap-4 mt-5 text-2xl">
              {social.instagram && (
                <Link href={social.instagram.url} target="_blank" aria-label="Instagram" className="hover:text-orange-300 transition-colors">
                  <FaInstagram />
                </Link>
              )}
              {social.facebook && (
                <Link href={social.facebook.url} target="_blank" aria-label="Facebook" className="hover:text-orange-300 transition-colors">
                  <FaFacebookF />
                </Link>
              )}
              {social.tiktok && (
                <Link href={social.tiktok.url} target="_blank" aria-label="TikTok" className="hover:text-orange-300 transition-colors">
                  <FaTiktok />
                </Link>
              )}
              {social.youtube && (
                <Link href={social.youtube.url} target="_blank" aria-label="YouTube" className="hover:text-orange-300 transition-colors">
                  <FaYoutube />
                </Link>
              )}
              {social.linkedin && (
                <Link href={social.linkedin.url} target="_blank" aria-label="LinkedIn" className="hover:text-orange-300 transition-colors">
                  <FaLinkedinIn />
                </Link>
              )}
              {social.yelp && (
                <Link href={social.yelp.url} target="_blank" aria-label="Yelp" className="hover:text-orange-300 transition-colors">
                  <FaYelp />
                </Link>
              )}
            </div>
          </div>

          {/* About + Accreditation */}
          <div>
            <h4 className="text-xl font-semibold mb-4">About {siteConfig.shortName}</h4>
            <p className="text-sm leading-relaxed text-gray-200 mb-6">
              {siteConfig.name} is a private, WASC-accredited college-preparatory school
              serving grades 7–12. We provide a supportive, student-centered learning
              environment where every learner is known, challenged, and inspired.
            </p>

            <div className="flex gap-6 items-center">
              <Link
                href="/"
                aria-label={`${siteConfig.name} home`}
                className="relative w-20 h-20 transition-opacity hover:opacity-80"
              >
                <Image src="/images/brand/hba-logo-round.webp" alt={`${siteConfig.shortName} seal`} fill sizes="80px" className="object-contain"/>
              </Link>
              <Link
                href="https://directory.acswasc.org/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WASC accredited — view directory"
                className="relative w-20 h-20 transition-opacity hover:opacity-80"
              >
                <Image src="/images/brand/wasc-round.webp" alt="WASC Accredited" fill sizes="80px" className="object-contain"/>
              </Link>
              <Link
                href="https://hs-articulation.ucop.edu/agcourselist"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="UC A-G approved — view course list"
                className="relative w-20 h-20 transition-opacity hover:opacity-80"
              >
                <Image src="/images/brand/uc.webp" alt="UC A-G Approved" fill sizes="80px" className="object-contain"/>
              </Link>
            </div>
          </div>

          {/* Resources & Policies */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-3">
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xl font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-200">
                <li><Link href="/admissions" className="hover:text-orange-300">Admissions</Link></li>
                <li><Link href="/admissions/financial-aid" className="hover:text-orange-300">Financial aid</Link></li>
                <li><Link href="/reviews" className="hover:text-orange-300">Reviews</Link></li>
                <li><Link href="/about/college-acceptances" className="hover:text-orange-300">College acceptances</Link></li>
                <li><Link href="/calendar" className="hover:text-orange-300">Academic calendar</Link></li>
                <li><Link href="/transcripts" className="hover:text-orange-300">Order a transcript</Link></li>
                <li><Link href="/welcome" className="hover:text-orange-300">New student setup</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xl font-semibold mb-4">Policies</h4>
              <ul className="space-y-2 text-sm text-gray-200">
                <li><Link href="/privacy" className="hover:text-orange-300">Privacy policy</Link></li>
                <li><Link href="/terms" className="hover:text-orange-300">Terms of use</Link></li>
                <li><Link href="/accessibility" className="hover:text-orange-300">Accessibility</Link></li>
                <li><Link href="/nondiscrimination" className="hover:text-orange-300">Non-discrimination</Link></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="bg-brand-navy-deep py-6 text-center text-sm text-gray-300 border-t border-white/10">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>

      </div>
    </footer>
  )
}