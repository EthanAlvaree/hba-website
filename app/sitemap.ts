// app/sitemap.ts
//
// Auto-generates /sitemap.xml at build time. Search engines fetch this to
// discover and prioritize pages. To add a new page, append it to
// `staticRoutes`. Dynamic routes (e.g. faculty bios) are derived from their
// data sources so adding a new faculty member automatically grows the sitemap.

import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site"
import { getFacultyMembers } from "@/lib/faculty"

const STATIC_ROUTES: { path: string; priority: number }[] = [
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const staticEntries = STATIC_ROUTES.map(({ path, priority }) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    priority,
  }))

  // Faculty bios live in the DB. Tolerate a failed fetch at build time
  // (e.g. before the faculty_bios migration runs) — the sitemap still
  // generates with the static routes.
  let facultyEntries: MetadataRoute.Sitemap = []
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

  return [...staticEntries, ...facultyEntries]
}
