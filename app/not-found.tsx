// app/not-found.tsx
//
// Branded 404 page. Inherits the navbar/footer chrome from app/layout.tsx
// via LayoutChrome, so users get the full site shell instead of the default
// Next.js error screen.

import Link from "next/link"
import { siteConfig } from "@/lib/site"

export const metadata = {
  title: "Page not found",
  description: `The page you’re looking for doesn’t exist on ${siteConfig.name}.`,
}

const SUGGESTED_LINKS = [
  { href: "/", label: "Home" },
  { href: "/admissions", label: "Admissions" },
  { href: "/programs", label: "Academic programs" },
  { href: "/faculty", label: "Faculty" },
  { href: "/contact", label: "Contact" },
]

export default function NotFound() {
  return (
    <main className="bg-white">
      <section className="py-32 lg:py-40">
        <div className="max-w-3xl mx-auto px-6 lg:px-12 text-center space-y-8">
          <div className="inline-block px-4 py-1.5 bg-brand-orange/10 text-brand-orange font-bold tracking-widest text-xs uppercase rounded-full">
            404 · Page not found
          </div>

          <h1 className="text-4xl lg:text-6xl font-extrabold text-brand-navy leading-tight">
            We couldn&rsquo;t find that page.
          </h1>

          <p className="text-lg text-gray-600 font-light leading-relaxed">
            The page you&rsquo;re looking for may have moved, been renamed, or
            never existed. Try one of the links below — or head back to the
            homepage.
          </p>

          <ul className="flex flex-wrap justify-center gap-3 pt-4">
            {SUGGESTED_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-brand-navy/20 text-brand-navy font-semibold text-sm hover:bg-brand-navy hover:text-white hover:border-brand-navy transition"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-sm text-gray-500 pt-8">
            Still stuck? Email{" "}
            <a
              href={`mailto:${siteConfig.contact.infoEmail}`}
              className="text-brand-orange font-medium hover:underline"
            >
              {siteConfig.contact.infoEmail}
            </a>{" "}
            and we&rsquo;ll point you in the right direction.
          </p>
        </div>
      </section>
    </main>
  )
}
