// components/header/TopBar.tsx
//
// Secondary nav strip above the main Navbar. Links are HBA-specific
// (parent portal, alumni, school store) so the whole strip is hidden
// on PCI. Add a PCI variant here if PCI ever needs an analogous
// secondary nav.

import Link from "next/link"
import { schoolKey } from "@/lib/site"

export default function TopBar() {
  if (schoolKey === "pci") return null

  return (
    <div className="hidden lg:block bg-brand-navy text-white text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-end gap-6 px-4 py-2">
        <Link href="/community/parents" className="hover:text-orange-300 transition-colors">
          Parent/guardian
        </Link>
        <Link href="/community/alumni" className="hover:text-orange-300 transition-colors">
          Alumni
        </Link>
        <Link href="/community/store" className="hover:text-orange-300 transition-colors">
          School store
        </Link>
        <Link href="/calendar" className="hover:text-orange-300 transition-colors">
          Calendar
        </Link>
        <Link href="/contact" className="hover:text-orange-300 transition-colors">
          Contact
        </Link>
      </div>
    </div>
  )
}
