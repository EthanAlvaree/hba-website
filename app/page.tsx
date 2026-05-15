// app/page.tsx
//
// Thin dispatcher. The actual home-page content for each tenant lives
// under app/_schools/<key>/HomePage.tsx — sibling files, no privileged
// "default" tenant.

import { schoolKey } from "@/lib/site"
import HbaHomePage from "./_schools/hba/HomePage"
import PciHomePage from "./_schools/pci/HomePage"

export default function Home() {
  if (schoolKey === "pci") return <PciHomePage />
  return <HbaHomePage />
}
