// app/faculty/opengraph-image.tsx

import { siteConfig } from "@/lib/site"
import {
  ogContentType,
  ogSize,
  renderOgImage,
} from "@/lib/og-image"

export const alt = `Faculty and staff — ${siteConfig.name}`
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderOgImage({
    kicker: siteConfig.name,
    title: "Faculty and staff",
    subtitle:
      "Educators, mentors, and leaders dedicated to every student’s success.",
    footer: siteConfig.domain,
  })
}
