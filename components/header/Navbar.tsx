"use client"

import Link from "next/link"
import Dropdown from "./Dropdown"
import { navigation } from "@/lib/navigation"

export default function Navbar() {
  return (
    <div className="bg-[#1f3f66] text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-5">

        <div className="text-2xl font-bold">
          High Bluff Academy
        </div>

        <nav className="flex gap-8 items-center">
          {navigation.map((item) =>
            item.columns ? (
              <Dropdown
                key={item.title}
                title={item.title}
                columns={item.columns}
              />
            ) : (
              <button
                key={item.title}
                className="hover:text-orange-300 transition-colors duration-200"
              >
                {item.title}
              </button>
            )
          )}

          <Link href="/blog" className="hover:text-orange-300 transition-colors duration-200">
            Blog
          </Link>
        </nav>

      </div>
    </div>
  )
}
