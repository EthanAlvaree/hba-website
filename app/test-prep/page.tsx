// app/test-prep/page.tsx
//
// PCI-only route — Test Prep & Academics. On HBA, 404. (HBA is a test
// center and contractually can't offer test prep.)

import { notFound } from "next/navigation"
import { schoolKey } from "@/lib/site"
import PciTestPrepPage from "@/app/_schools/pci/TestPrepPage"

export { metadata } from "@/app/_schools/pci/TestPrepPage"

export default function TestPrepRoute() {
  if (schoolKey !== "pci") notFound()
  return <PciTestPrepPage />
}
