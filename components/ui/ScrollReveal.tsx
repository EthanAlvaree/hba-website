// components/ui/ScrollReveal.tsx
"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export default function ScrollReveal() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal:not(.reveal--in)")
    )

    if (prefersReducedMotion) {
      targets.forEach((el) => el.classList.add("reveal--in"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--in")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )

    targets.forEach((el) => observer.observe(el))

    // Safety net: if anything is still hidden after 1.5s for any reason,
    // force it visible so content can never get permanently stuck.
    const fallback = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>(".reveal:not(.reveal--in)")
        .forEach((el) => el.classList.add("reveal--in"))
    }, 1500)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [pathname])

  return null
}
