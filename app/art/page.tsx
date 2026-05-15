// app/art/page.tsx
//
// PCI-only route — flagship Art Institute page. On HBA, 404.

import { notFound } from "next/navigation"
import { schoolKey } from "@/lib/site"
import PciArtInstitutePage from "@/app/_schools/pci/ArtInstitutePage"

export { metadata } from "@/app/_schools/pci/ArtInstitutePage"

export default function ArtRoute() {
  if (schoolKey !== "pci") notFound()
  return <PciArtInstitutePage />
}
