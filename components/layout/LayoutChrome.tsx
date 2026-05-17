// components/layout/LayoutChrome.tsx
"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import TopBar from "@/components/header/TopBar"
import Navbar from "@/components/header/Navbar"
import Footer from "@/components/footer/Footer"
import ScrollReveal from "@/components/ui/ScrollReveal"

// Routes that handle their own chrome (the portal shells render their
// own sticky top bar + sidebar). The public TopBar + Navbar on top of
// those would (a) double up the global nav and (b) cover the portal
// sidebar's sticky top-12 anchor with the higher-z-index public bars,
// making it look like the sidebar scrolls away with the page.
const NO_CHROME_PREFIXES = [
  "/calendar/print",
  "/admin",
  "/portal",
  "/parent",
  "/faculty-portal",
]

export default function LayoutChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const hideChrome = NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p))

  if (hideChrome) {
    return <>{children}</>
  }

  return (
    <>
      <div data-chrome className="sticky top-0 z-[100]">
        <TopBar />
        <Navbar />
      </div>
      {children}
      <Footer />
      <ScrollReveal />
    </>
  )
}
