// app/layout.tsx
import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/next"
import LayoutChrome from "@/components/layout/LayoutChrome"
import { brand, siteConfig } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.tagline,
    url: siteConfig.url,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.tagline,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Brand CSS vars are also defined in app/globals.css for HBA. Override
  // them at runtime from the active siteConfig so a SCHOOL_KEY=pci deploy
  // gets PCI's hues without rebuilding Tailwind. Inline style on <html>
  // wins over the @theme defaults because of CSS cascade specificity
  // (inline beats stylesheet for the same selector).
  const brandStyle = {
    "--color-brand-navy": brand.navy,
    "--color-brand-navy-deep": brand.navyDeep,
    "--color-brand-orange": brand.orange,
  } as React.CSSProperties

  return (
    <html lang="en" style={brandStyle}>
      <body>
        <LayoutChrome>{children}</LayoutChrome>
        <Analytics />
      </body>
    </html>
  )
}
