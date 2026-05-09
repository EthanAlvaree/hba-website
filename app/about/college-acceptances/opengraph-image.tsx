// app/about/college-acceptances/opengraph-image.tsx

import { siteConfig } from "@/lib/site"
import {
  ogContentType,
  ogSize,
  renderOgImage,
} from "@/lib/og-image"

export const alt = `College acceptances — ${siteConfig.name}`
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderOgImage({
    kicker: siteConfig.name,
    title: "College acceptances",
    subtitle:
      "Stanford, Dartmouth, UCLA, UC Berkeley, USC, Northwestern, NYU, Pomona, Amherst, Middlebury — and more.",
    footer: siteConfig.domain,
  })
}
