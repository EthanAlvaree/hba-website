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
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Logo + Contact */}
        <div>
          <div className="relative w-20 h-20 mb-4">
            <Image
              src="/images/logo.png"
              alt="High Bluff Academy Logo"
              fill
              className="object-contain"
            />
          </div>

          <h3 className="text-xl font-bold mb-3">High Bluff Academy</h3>

          <p className="text-sm leading-relaxed">
            5531 Cancha de Golf Ste #202<br />
            Rancho Santa Fe, CA 92091<br />
            (858) 509-9101<br />
            info@highbluffacademy.com
          </p>

          {/* Social Icons */}
          <div className="flex gap-4 mt-4 text-xl">
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

        {/* School Description */}
        <div>
          <h4 className="text-lg font-semibold mb-3">About HBA</h4>
          <p className="text-sm leading-relaxed text-gray-200">
            High Bluff Academy is a private, WASC-accredited college-preparatory school
            serving grades 6–12. We provide a supportive, student-centered learning
            environment where every learner is known, challenged, and inspired.
          </p>
        </div>

        {/* Legal + Policies */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Policies</h4>
          <ul className="space-y-2 text-sm text-gray-200">
            <li><Link href="/privacy" className="hover:text-orange-300">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-orange-300">Terms of Use</Link></li>
            <li><Link href="/accessibility" className="hover:text-orange-300">Accessibility</Link></li>
            <li><Link href="/nondiscrimination" className="hover:text-orange-300">Non‑Discrimination Statement</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#162d4d] py-4 text-center text-sm text-gray-300">
        © {new Date().getFullYear()} High Bluff Academy. All rights reserved.
      </div>
    </footer>
  )
}
