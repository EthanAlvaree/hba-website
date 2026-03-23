// components/footer/Footer.tsx

import Image from "next/image"
import Link from "next/link"
import {
  FaInstagram,
  FaFacebookF,
  FaTiktok,
} from "react-icons/fa"

export default function Footer() {
  return (
    <footer className="bg-[#1f3f66] text-white mt-20">

      {/* Campus Image */}
      <div className="w-full h-72 relative">
        <Image
          src="/images/campus.png" // replace with your campus image
          alt="High Bluff Academy Campus"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Logo + Contact */}
        <div>
          <div className="relative w-24 h-24 mb-4">
            <Image
              src="/images/hba-logo.png"
              alt="High Bluff Academy Logo"
              fill
              className="object-contain"
            />
          </div>

          <h3 className="text-2xl font-bold mb-3">High Bluff Academy</h3>

          <p className="text-sm leading-relaxed">
            5531 Cancha de Golf Ste #202<br />
            Rancho Santa Fe, CA 92091<br />
            (858) 509-9101<br />
            info@highbluffacademy.com
          </p>

          {/* Social Icons */}
          <div className="flex gap-4 mt-5 text-2xl">
            <Link href="https://www.instagram.com/highbluffacademy" target="_blank">
              <FaInstagram className="hover:text-orange-300 transition-colors" />
            </Link>
            <Link href="https://www.facebook.com/HighBluffAcademySanDiego" target="_blank">
              <FaFacebookF className="hover:text-orange-300 transition-colors" />
            </Link>
            <Link href="https://www.tiktok.com/@highbluffacademy" target="_blank">
              <FaTiktok className="hover:text-orange-300 transition-colors" />
            </Link>
          </div>
        </div>

        {/* About */}
        <div>
          <h4 className="text-xl font-semibold mb-4">About HBA</h4>
          <p className="text-sm leading-relaxed text-gray-200">
            High Bluff Academy is a private, WASC-accredited college-preparatory school
            serving grades 6–12. We provide a supportive, student-centered learning
            environment where every learner is known, challenged, and inspired.
          </p>
        </div>

        {/* Policies */}
        <div>
          <h4 className="text-xl font-semibold mb-4">Policies</h4>
          <ul className="space-y-2 text-sm text-gray-200">
            <li><Link href="/privacy" className="hover:text-orange-300">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-orange-300">Terms of Use</Link></li>
            <li><Link href="/accessibility" className="hover:text-orange-300">Accessibility</Link></li>
            <li><Link href="/nondiscrimination" className="hover:text-orange-300">Non‑Discrimination Statement</Link></li>
          </ul>
        </div>
      </div>

      {/* Accreditation Row */}
      <div className="bg-[#162d4d] py-8">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-10 px-6">

          <div className="relative w-24 h-24">
            <Image
              src="/images/hba-logo-round.png"
              alt="HBA Round Seal"
              fill
              className="object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>

          <div className="relative w-28 h-20">
            <Image
              src="/images/uc.png"
              alt="UC A-G Approved"
              fill
              className="object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>

          <div className="relative w-28 h-20">
            <Image
              src="/images/wasc.png"
              alt="WASC Accredited"
              fill
              className="object-contain opacity-90 hover:opacity-100 transition"
            />
          </div>

          {/* Optional future badges */}
          {/* <div className="relative w-28 h-20">
            <Image src="/images/ncaa.png" alt="NCAA" fill className="object-contain" />
          </div> */}

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#0f1f36] py-4 text-center text-sm text-gray-300">
        © {new Date().getFullYear()} High Bluff Academy. All rights reserved.
      </div>
    </footer>
  )
}
