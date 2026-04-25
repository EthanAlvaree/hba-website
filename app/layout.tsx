// app/layout.tsx
import "./globals.css"
import type { ReactNode } from "react"
import TopBar from "@/components/header/TopBar"
import Navbar from "@/components/header/Navbar"

export const metadata = {
  title: "High Bluff Academy",
  description: "High Bluff Academy Website",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <Navbar />
        {children}
      </body>
    </html>
  )
}
