// app/admissions/opengraph-image.tsx

import { siteConfig } from "@/lib/site"
import {
  ogContentType,
  ogSize,
  renderOgImage,
} from "@/lib/og-image"

export const alt = `Admissions — ${siteConfig.name}`
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderOgImage({
    kicker: siteConfig.name,
    title: "Admissions",
    subtitle:
      "A thoughtful, human admissions experience. Small classes, expert faculty, flexible pathways.",
    footer: siteConfig.domain,
  })
}
