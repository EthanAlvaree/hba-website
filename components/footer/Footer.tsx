// components/footer/Footer.tsx

import Image from "next/image"
import Link from "next/link"
import { FaInstagram, FaFacebookF, FaTiktok, FaYoutube, FaLinkedinIn, FaYelp } from "react-icons/fa"

export default function Footer() {
  return (
    <footer className="mt-20">

      {/* Campus Image */}
      <div className="w-full h-72 relative">
        <Image
          src="/images/home/campus-aerial.jpg"
          alt="High Bluff Academy Campus"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>

      {/* Footer Gradient */}
      <div className="bg-gradient-to-b from-[#1f3f66] to-[#0f1f36] text-white">

        {/* Main Grid */}
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Logo + Contact */}
          <div>
            <div className="relative w-24 h-24 mb-4">
              <Image
                src="/images/brand/hba-logo-color.png"
                alt="High Bluff Academy Logo"
                fill
                sizes="96px"
                className="object-contain"
              />
            </div>

            <h3 className="text-2xl font-bold mb-3">High Bluff Academy</h3>

            <p className="text-sm leading-relaxed text-gray-200">
              5531 Cancha de Golf, Ste 202<br />
              Rancho Santa Fe, CA 92091<br />
              (858) 509-9101<br />
              info@highbluffacademy.com
            </p>

            {/* Social Icons */}
            <div className="flex flex-wrap gap-4 mt-5 text-2xl">
              <Link href="https://www.instagram.com/highbluffacademy" target="_blank" aria-label="Instagram" className="hover:text-orange-300 transition-colors">
                <FaInstagram />
              </Link>
              <Link href="https://www.facebook.com/HighBluffAcademySanDiego" target="_blank" aria-label="Facebook" className="hover:text-orange-300 transition-colors">
                <FaFacebookF />
              </Link>
              <Link href="https://www.tiktok.com/@highbluffacademy" target="_blank" aria-label="TikTok" className="hover:text-orange-300 transition-colors">
                <FaTiktok />
              </Link>
              <Link href="https://www.youtube.com/channel/UCBnvACwf375sxhefzTZOlog" target="_blank" aria-label="YouTube" className="hover:text-orange-300 transition-colors">
                <FaYoutube />
              </Link>
              <Link href="https://www.linkedin.com/school/highbluffacademy/" target="_blank" aria-label="LinkedIn" className="hover:text-orange-300 transition-colors">
                <FaLinkedinIn />
              </Link>
              <Link href="https://www.yelp.com/biz/high-bluff-academy-rancho-santa-fe" target="_blank" aria-label="Yelp" className="hover:text-orange-300 transition-colors">
                <FaYelp />
              </Link>
            </div>
          </div>

          {/* About + Accreditation */}
          <div>
            <h4 className="text-xl font-semibold mb-4">About HBA</h4>
            <p className="text-sm leading-relaxed text-gray-200 mb-6">
              High Bluff Academy is a private, WASC-accredited college-preparatory school
              serving grades 7–12. We provide a supportive, student-centered learning
              environment where every learner is known, challenged, and inspired.
            </p>

            <div className="flex gap-6 items-center">
              <div className="relative w-20 h-20">
                <Image src="/images/brand/hba-logo-round.png" alt="HBA Seal" fill sizes="80px" className="object-contain"/>
              </div>
              <div className="relative w-20 h-20">
                <Image src="/images/brand/wasc-round.png" alt="WASC Accredited" fill sizes="80px" className="object-contain"/>
              </div>
              <div className="relative w-20 h-20">
                <Image src="/images/brand/uc.png" alt="UC A-G Approved" fill sizes="80px" className="object-contain"/>
              </div>
            </div>
          </div>

          {/* Resources & Policies */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-3">
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xl font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-200">
                <li><Link href="/admissions" className="hover:text-orange-300">Admissions</Link></li>
                <li><Link href="/reviews" className="hover:text-orange-300">Reviews</Link></li>
                <li><Link href="/about/college-acceptances" className="hover:text-orange-300">College acceptances</Link></li>
                <li><Link href="/calendar" className="hover:text-orange-300">Academic calendar</Link></li>
                <li><Link href="/transcripts" className="hover:text-orange-300">Order a transcript</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xl font-semibold mb-4">Policies</h4>
              <ul className="space-y-2 text-sm text-gray-200">
                <li><Link href="/privacy" className="hover:text-orange-300">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-orange-300">Terms of Use</Link></li>
                <li><Link href="/accessibility" className="hover:text-orange-300">Accessibility</Link></li>
                <li><Link href="/nondiscrimination" className="hover:text-orange-300">Non-Discrimination</Link></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="bg-[#0f1f36] py-6 text-center text-sm text-gray-300 border-t border-white/10">
          © {new Date().getFullYear()} High Bluff Academy. All rights reserved.
        </div>

      </div>
    </footer>
  )
}