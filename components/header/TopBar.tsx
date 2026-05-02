// components/header/TopBar.tsx
"use client"

import Link from "next/link"

export default function TopBar() {
  return (
    <div className="bg-[#173a63] text-white text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <input
            placeholder="Search"
            className="bg-transparent border-b border-white/50 outline-none text-sm placeholder:text-white/70"
          />
        </div>

        <div className="flex gap-6">
          <Link href="/contact" className="hover:text-orange-300 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}
