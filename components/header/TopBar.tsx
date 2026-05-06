// components/header/TopBar.tsx

import Link from "next/link"

export default function TopBar() {
  return (
    <div className="hidden lg:block bg-[#173a63] text-white text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-end gap-6 px-4 py-2">
        <Link href="/community/parents" className="hover:text-orange-300 transition-colors">
          Parent/guardian
        </Link>
        <Link href="/community/alumni" className="hover:text-orange-300 transition-colors">
          Alumni
        </Link>
        <Link href="/community/store" className="hover:text-orange-300 transition-colors">
          School store
        </Link>
        <Link href="/calendar" className="hover:text-orange-300 transition-colors">
          Calendar
        </Link>
        <Link href="/contact" className="hover:text-orange-300 transition-colors">
          Contact
        </Link>
      </div>
    </div>
  )
}
