"use client"

import Link from "next/link"
import Dropdown from "./Dropdown"

export default function Navbar() {
  return (
    <div className="bg-[#1f3f66] text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-5">

        <div className="text-2xl font-bold">
          High Bluff Academy
        </div>

        <nav className="flex gap-8">

          <Dropdown title="About" />

          <Dropdown title="Admissions" />

          <Dropdown title="Upper School" />

          <Dropdown title="Student Life" />

          <Dropdown title="Support HBA" />

          <Link href="/blog">Blog</Link>

        </nav>

      </div>
    </div>
  )
}