// app/opengraph-image.tsx
//
// Sitewide default OpenGraph (and Twitter card) image. Next.js auto-wires
// this into <meta property="og:image"> for every route that doesn't define
// its own opengraph-image file.
//
// Generated dynamically with ImageResponse so the image always reflects the
// current siteConfig — meaning a PCI fork that swaps lib/site.ts gets a
// rebranded share card with no extra work.

import { ImageResponse } from "next/og"
import { brand, siteConfig } from "@/lib/site"

export const alt = siteConfig.name
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: brand.navy,
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 28,
          }}
        >
          {`${siteConfig.address.locality}, ${siteConfig.address.regionCode}`}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.02,
            color: "white",
            maxWidth: 980,
          }}
        >
          {siteConfig.name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 36,
            paddingLeft: 24,
            borderLeft: `5px solid ${brand.orange}`,
            fontSize: 32,
            color: "rgba(255,255,255,0.88)",
            fontWeight: 300,
            maxWidth: 880,
            lineHeight: 1.32,
          }}
        >
          {siteConfig.tagline}
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 56,
            left: 96,
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {siteConfig.domain}
        </div>
      </div>
    ),
    size
  )
}
