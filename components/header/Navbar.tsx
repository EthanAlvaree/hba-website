"use client"

import Link from "next/link"
import Image from "next/image"
import Dropdown from "./Dropdown"
import { navigation } from "@/lib/navigation"

export default function Navbar() {
  return (
    <div className="bg-[#1f3f66] text-white sticky top-0 z-[100] shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">

        {/* LOGO + NAME */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">

          {/* Bigger logo WITHOUT increasing navbar height */}
          <div className="relative w-12 h-12"> 
            <Image
              src="/images/logo.png"
              alt="HBA Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <span className="text-xl font-bold tracking-tight uppercase hidden sm:block">
            High Bluff Academy
          </span>
        </Link>

        {/* NAV */}
        <nav className="flex gap-8 items-center relative">

          {navigation.map((item, index) => (
            <Dropdown
              key={item.title}
              title={item.title}
              columns={item.columns}
              align={
                index === navigation.length - 1
                  ? "right"
                  : index === navigation.length - 2
                  ? "right"
                  : "left"
              }
            />
          ))}

          {/* CTA */}
          <Link
            href="/apply"
            className="bg-[#f37021] text-white px-5 py-2 rounded-sm font-bold text-sm hover:bg-orange-600 transition-colors"
          >
            Apply
          </Link>

        </nav>
      </div>
    </div>
  )
}