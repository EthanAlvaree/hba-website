// app/layout.tsx
import "./globals.css"
import type { ReactNode } from "react"
import LayoutChrome from "@/components/layout/LayoutChrome"

export const metadata = {
  metadataBase: new URL("https://highbluffacademy.com"),
  title: "High Bluff Academy",
  description: "High Bluff Academy Website",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutChrome>{children}</LayoutChrome>
      </body>
    </html>
  )
}
