// lib/og-image.tsx
//
// Shared renderer for OpenGraph (and Twitter card) images. Used by
// app/opengraph-image.tsx and the per-route opengraph-image.tsx files
// under specific page folders.
//
// Each per-route file should:
//   1. Re-export `ogSize` as `size` and `ogContentType` as `contentType`.
//   2. Default-export an async function that returns `renderOgImage({...})`.
//
// The visual treatment stays consistent across all routes — only the
// kicker / title / subtitle change. To rebrand, change the colors via
// lib/site.ts (`brand` export); they flow through here automatically.

import { ImageResponse } from "next/og"
import { brand } from "@/lib/site"

export const ogSize = { width: 1200, height: 630 } as const
export const ogContentType = "image/png"

export type OgImageInput = {
  /** Small uppercase eyebrow above the title. Defaults to school location. */
  kicker?: string
  /** Main headline. */
  title: string
  /** One-line description below the title. */
  subtitle?: string
  /** Bottom-left footer. Defaults to the site domain. */
  footer?: string
}

export function renderOgImage({
  kicker,
  title,
  subtitle,
  footer,
}: OgImageInput) {
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
        {kicker ? (
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
            {kicker}
          </div>
        ) : null}

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
          {title}
        </div>

        {subtitle ? (
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
            {subtitle}
          </div>
        ) : null}

        {footer ? (
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
            {footer}
          </div>
        ) : null}
      </div>
    ),
    ogSize
  )
}
