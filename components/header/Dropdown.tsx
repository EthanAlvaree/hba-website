"use client"

import { useState } from "react"
import type { NavColumn } from "@/lib/navigation"

interface DropdownProps {
  title: string
  columns?: NavColumn[]
  align?: "left" | "right" | "center"
}

export default function Dropdown({ title, columns, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false)

  const hasMenu = columns && columns.length > 0

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
      <button className="hover:text-orange-300 transition-colors duration-200 font-medium">
        {title}
      </button>

      {/* DROPDOWN */}
      {open && hasMenu && (
        <div className={`absolute top-full pt-4 z-50 ${alignmentClass}`}>
          <div className="bg-white text-black shadow-2xl p-8 w-[560px] grid grid-cols-2 gap-10 rounded-md border border-gray-200">

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