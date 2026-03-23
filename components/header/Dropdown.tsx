"use client"
import { useState } from "react"
import Link from "next/link"

interface NavColumn {
  heading: string
  links: string[]
}

export default function Dropdown({ title, columns }: { title: string, columns?: NavColumn[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative flex items-center h-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="text-[15px] font-medium hover:text-hba-orange transition-colors py-6 px-2">
        {title}
      </button>

      {open && columns && (
        /* The container starts exactly at the bottom of the nav (top-full) */
        /* pt-2 creates an invisible 'bridge' so the hover isn't lost */
        <div className="absolute left-0 top-full pt-2 z-[100] w-[550px] animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-white text-black shadow-mega border-t-4 border-hba-orange grid grid-cols-2 gap-10 p-10 rounded-b-md">
            {columns.map((col) => (
              <div key={col.heading}>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-5 border-b pb-2">
                  {col.heading}
                </h4>
                <ul className="space-y-4">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link 
                        href={`/${link.toLowerCase().replace(/ /g, '-')}`}
                        className="text-[14px] text-gray-600 hover:text-hba-navy hover:underline decoration-hba-orange underline-offset-4 transition-all"
                      >
                        {link}
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