// components/header/Dropdown.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { NavColumn } from "@/lib/navigation"

interface DropdownProps {
  title: string
  href?: string
  columns?: NavColumn[]
  align?: "left" | "right" | "center"
}

export default function Dropdown({
  title,
  href,
  columns = [],
  align = "left",
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const hasMenu = columns.length > 0

  const isActive =
    href === pathname ||
    columns.some((col) => col.links.some((l) => l.href === pathname))

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
      <Link
        href={href || "#"}
        className={`hover:text-orange-300 transition-colors duration-200 font-medium py-4 inline-block ${
          isActive ? "text-orange-300" : "text-white"
        }`}
      >
        {title}
      </Link>

      {hasMenu && (
        <div
          className={`
            absolute top-full pt-4 z-50 transition-all duration-200
            ${alignmentClass}
            ${
              open
                ? "opacity-100 translate-y-0 visible"
                : "opacity-0 -translate-y-2 invisible"
            }
          `}
        >
          <div
            className={`bg-white text-black shadow-2xl p-8 max-w-[90vw] grid gap-10 rounded-md border border-gray-200 ${
              columns.length === 1
                ? "w-[280px] grid-cols-1"
                : "w-[560px] grid-cols-2"
            }`}
          >
            {columns.map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold text-xs tracking-wider uppercase text-brand-navy mb-3 border-b pb-2">
                  {col.heading}
                </h4>

                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`text-sm transition-colors block ${
                          pathname === link.href
                            ? "text-brand-navy font-semibold"
                            : "text-gray-700 hover:text-brand-navy"
                        }`}
                      >
                        {link.label}
                      </Link>
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
