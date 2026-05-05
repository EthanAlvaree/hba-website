// components/header/TopBar.tsx
"use client"

import { useState } from "react"
import Link from "next/link"

export default function TopBar() {
  const [query, setQuery] = useState("")

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const url = `https://www.google.com/search?q=${encodeURIComponent(
      `site:highbluffacademy.com ${q}`
    )}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="hidden lg:block bg-[#173a63] text-white text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        <form onSubmit={handleSearch} role="search" className="flex items-center gap-4">
          <label htmlFor="topbar-search" className="sr-only">
            Search highbluffacademy.com
          </label>
          <input
            id="topbar-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="bg-transparent border-b border-white/50 outline-none text-sm placeholder:text-white/70"
          />
        </form>

        <div className="flex gap-6">
          <Link href="/community/parents" className="hover:text-orange-300 transition-colors">
            Parent/Guardian
          </Link>
          <Link href="/community/alumni" className="hover:text-orange-300 transition-colors">
            Alumni
          </Link>
          <Link href="/community/store" className="hover:text-orange-300 transition-colors">
            School Store
          </Link>
          <Link href="/calendar" className="hover:text-orange-300 transition-colors">
            Calendar
          </Link>
          <Link href="/contact" className="hover:text-orange-300 transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}
