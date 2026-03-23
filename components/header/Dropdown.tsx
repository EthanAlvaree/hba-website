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
        <div className="absolute left-0 top-10 bg-white text-black shadow-xl p-6 w-[500px] grid grid-cols-2 gap-6 z-50">

          {/* Column 1 */}
          <div>
            <h4 className="font-semibold mb-2">About</h4>
            <ul className="space-y-1 text-sm">
              <li className="hover:text-blue-600">Our Approach</li>
              <li className="hover:text-blue-600">Our Students</li>
              <li className="hover:text-blue-600">Our Teachers</li>
              <li className="hover:text-blue-600">Leadership</li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="font-semibold mb-2">More</h4>
            <ul className="space-y-1 text-sm">
              <li className="hover:text-blue-600">Campus</li>
              <li className="hover:text-blue-600">History</li>
              <li className="hover:text-blue-600">Employment</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  )
}