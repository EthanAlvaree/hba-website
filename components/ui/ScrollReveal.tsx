// components/ui/ScrollReveal.tsx
"use client"

import { useEffect } from "react"

export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal")
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

    return () => observer.disconnect()
  }, [])

  return null
}
