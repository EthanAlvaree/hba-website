// app/opengraph-image.tsx
//
// Sitewide default OpenGraph (and Twitter card) image. Next.js auto-wires
// this into <meta property="og:image"> for any route that doesn't define
// its own opengraph-image file.

import { siteConfig } from "@/lib/site"
import {
  ogContentType,
  ogSize,
  renderOgImage,
} from "@/lib/og-image"

export const alt = siteConfig.name
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderOgImage({
    kicker: `${siteConfig.address.locality}, ${siteConfig.address.regionCode}`,
    title: siteConfig.name,
    subtitle: siteConfig.tagline,
    footer: siteConfig.domain,
  })
}
