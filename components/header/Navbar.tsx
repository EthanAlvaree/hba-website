// components/header/Navbar.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bars3Icon } from "@heroicons/react/24/outline"
import Dropdown from "./Dropdown"
import MobileMenu from "./MobileMenu"
import { navigation } from "@/lib/navigation"

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="bg-[#1f3f66] text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo + Name */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
          <div className="relative w-12 h-12">
            <Image
              src="/images/brand/hba-logo.png"
              alt="HBA Logo"
              fill
              sizes="(max-width: 768px) 180px, 220px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-bold tracking-tight uppercase hidden sm:block">
            High Bluff Academy
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex gap-8 items-center relative">
          {navigation.map((item) =>
            item.columns ? (
              <Dropdown
                key={item.title}
                title={item.title}
                href={item.href}
                columns={item.columns}
                align={item.align}
              />
            ) : (
              <Link
                key={item.title}
                href={item.href || "#"}
                className="hover:text-orange-300 transition-colors font-medium"
              >
                {item.title}
              </Link>
            )
          )}

          <Link
            href="https://secure.gradelink.com/2962/enrollment"
            className="bg-[#f37021] text-white px-5 py-2 rounded-sm font-bold text-sm hover:bg-orange-600 transition-colors"
          >
            Apply
          </Link>
        </nav>

        {/* Mobile Trigger */}
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            onClick={() => setMobileOpen(true)}
          >
            <Bars3Icon className="h-7 w-7" aria-hidden="true" />
            <span className="sr-only">Open main menu</span>
          </button>
        </div>
      </div>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} items={navigation} />
    </header>
  )
}
