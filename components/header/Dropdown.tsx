"use client"

import { useState } from "react"

interface DropdownProps {
  title: string
}

export default function Dropdown({ title }: DropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="hover:text-gray-300">
        {title}
      </button>

      {open && (
        <div className="absolute top-8 bg-white text-black shadow-lg w-60 p-4">
          <ul className="space-y-2">
            <li className="hover:text-blue-600">Our Approach</li>
            <li className="hover:text-blue-600">Our Students</li>
            <li className="hover:text-blue-600">Our Teachers</li>
            <li className="hover:text-blue-600">Leadership</li>
            <li className="hover:text-blue-600">Campus</li>
            <li className="hover:text-blue-600">History</li>
          </ul>
        </div>
      )}
    </div>
  )
}
