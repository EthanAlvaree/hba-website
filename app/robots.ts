// app/robots.ts
//
// Auto-generates /robots.txt at build time. Allows all crawlers everywhere
// and points them at the sitemap.

import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Internal Next.js routes — no crawl value.
      disallow: ["/api/", "/_next/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
