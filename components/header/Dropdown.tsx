"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import type { NavColumn } from "@/lib/navigation"

interface DropdownProps {
  title: string
  columns?: NavColumn[]
  align?: "left" | "right" | "center"
}

export default function Dropdown({ title, columns, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const hasMenu = columns && columns.length > 0

  const isActive = pathname.toLowerCase().includes(title.toLowerCase())

  const alignmentClass =
    align === "right"
      ? "right-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "left-0"

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => hasMenu && setOpen(true)}
      onMouseLeave={() => hasMenu && setOpen(false)}
    >
      {/* NAV BUTTON */}
      <button
        className={`transition-colors duration-200 font-medium ${
          isActive ? "text-[#f37021]" : "hover:text-orange-300"
        }`}
      >
        {title}
      </button>

      {/* DROPDOWN */}
      {hasMenu && (
        <div
          className={`
            absolute top-full pt-4 z-50 transition-all duration-200
            pointer-events-auto overflow-visible max-w-[90vw]
            ${alignmentClass}
            ${open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"}
          `}
        >
          <div className="bg-white text-black shadow-2xl p-8 w-[560px] max-w-[90vw] grid grid-cols-2 gap-10 rounded-md border border-gray-200">

            {columns!.map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold text-xs tracking-wider uppercase text-[#1f3f66] mb-3 border-b pb-2">
                  {col.heading}
                </h4>

                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li
                      key={link}
                      className="text-sm text-gray-700 hover:text-[#1f3f66] cursor-pointer transition-colors"
                    >
                      {link}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          </div>
        </div>
      )}
    </div>
  )
}