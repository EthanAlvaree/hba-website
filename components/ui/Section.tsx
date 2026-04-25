import { ReactNode } from "react"

interface SectionProps {
  children: ReactNode
  className?: string
  background?: "white" | "gray" | "navy"
}

const backgrounds = {
  white: "bg-white",
  gray: "bg-gray-100",
  navy: "bg-[#1f3f66] text-white",
}

export default function Section({
  children,
  className = "",
  background = "white",
}: SectionProps) {
  return (
    <section className={`py-20 ${backgrounds[background]} ${className}`}>
      {children}
    </section>
  )
}