// components/layout/LayoutChrome.tsx
"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import TopBar from "@/components/header/TopBar"
import Navbar from "@/components/header/Navbar"
import Footer from "@/components/footer/Footer"
import ScrollReveal from "@/components/ui/ScrollReveal"

const NO_CHROME_PREFIXES = ["/calendar/print"]

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
