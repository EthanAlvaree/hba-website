import { ReactNode } from "react"

interface PageLayoutProps {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return <main className="overflow-x-hidden">{children}</main>
}