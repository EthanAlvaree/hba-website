// app/sitemap.ts
//
// Auto-generates /sitemap.xml at build time. Search engines fetch this to
// discover and prioritize pages. School-aware — HBA's sitemap covers HBA's
// route map (admissions, programs, etc.); PCI's covers PCI's (art, test
// prep, faculty, contact). Each deploy lists only its own URLs so we don't
// hand crawlers links that 404 on the deployed tenant.

import type { MetadataRoute } from "next"
import { schoolKey, siteConfig } from "@/lib/site"
import { getFacultyMembers } from "@/lib/faculty"
import { pciPeople } from "@/app/_schools/pci/people"

type StaticRoute = { path: string; priority: number }

const HBA_ROUTES: StaticRoute[] = [
  // Top-priority entry points
  { path: "/", priority: 1.0 },
  { path: "/admissions", priority: 0.9 },
  { path: "/programs", priority: 0.9 },
  { path: "/about/college-acceptances", priority: 0.9 },

  // Major sections
  { path: "/about", priority: 0.8 },
  { path: "/about/leadership", priority: 0.7 },
  { path: "/admissions/international", priority: 0.7 },
  { path: "/programs/courses", priority: 0.7 },
  { path: "/programs/graduation-requirements", priority: 0.7 },
  { path: "/programs/online", priority: 0.7 },
  { path: "/student-life", priority: 0.7 },
  { path: "/student-life/athletics", priority: 0.6 },
  { path: "/summer-programs", priority: 0.7 },
  { path: "/faculty", priority: 0.8 },
  { path: "/contact", priority: 0.7 },
  { path: "/reviews", priority: 0.6 },

  // Community
  { path: "/community", priority: 0.6 },
  { path: "/community/alumni", priority: 0.5 },
  { path: "/community/parents", priority: 0.5 },
  { path: "/community/partnerships", priority: 0.5 },
  { path: "/community/store", priority: 0.5 },

  // Tools / utilities
  { path: "/calendar", priority: 0.5 },
  { path: "/transcripts", priority: 0.4 },
  { path: "/welcome", priority: 0.4 },

  // Policies / compliance
  { path: "/accessibility", priority: 0.3 },
  { path: "/nondiscrimination", priority: 0.3 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
]

const PCI_ROUTES: StaticRoute[] = [
  // Top-priority entry points
  { path: "/", priority: 1.0 },
  { path: "/art", priority: 0.9 },
  { path: "/test-prep", priority: 0.9 },

  // Secondary
  { path: "/about", priority: 0.8 },
  { path: "/faculty", priority: 0.8 },
  { path: "/contact", priority: 0.7 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const isPci = schoolKey === "pci"

  const routes = isPci ? PCI_ROUTES : HBA_ROUTES
  const staticEntries = routes.map(({ path, priority }) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    priority,
  }))

  // Faculty / team bio detail pages.
  let facultyEntries: MetadataRoute.Sitemap = []
  if (isPci) {
    // PCI's roster is hardcoded in app/_schools/pci/people.ts — no DB call
    // needed and no failure mode to guard.
    facultyEntries = pciPeople.map((p) => ({
      url: `${siteConfig.url}/faculty/${p.slug}`,
      lastModified,
      priority: 0.6,
    }))
  } else {
    // HBA's bios live in Supabase. Tolerate a failed fetch at build time
    // (e.g. before the faculty_bios migration runs) — the sitemap still
    // generates with the static routes.
    try {
      const faculty = await getFacultyMembers()
      facultyEntries = faculty.map((member) => ({
        url: `${siteConfig.url}/faculty/${member.slug}`,
        lastModified,
        priority: 0.6,
      }))
    } catch (error) {
      console.error("sitemap: faculty fetch failed, omitting bios", error)
    }
  }

  return [...staticEntries, ...facultyEntries]
}
