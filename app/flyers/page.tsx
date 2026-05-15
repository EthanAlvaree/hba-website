// app/flyers/page.tsx
//
// PCI internal: print-ready flyers for booth handouts. Unlisted —
// not in the nav, robots:noindex,nofollow. HBA users get a 404 via
// schoolKey dispatch. The actual flyer HTML lives in public/flyers/
// and is the single source of truth; this page just embeds previews
// and links out for printing.

import { notFound } from "next/navigation"
import { schoolKey, siteConfig } from "@/lib/site"

export const metadata = {
  title: `Flyers — ${siteConfig.name}`,
  description: "Print-ready PCI flyers for booth handouts.",
  robots: { index: false, follow: false },
}

type Flyer = {
  slug: string
  title: string
  subtitle: string
  description: string
}

const FLYERS: Flyer[] = [
  {
    slug: "art-institute",
    title: "The Art Institute",
    subtitle: "Flagship · 16-week Saturday studio",
    description:
      "Bold portfolio-led flyer for the digital art conservatory — pitches the FIP partnership, lists the curriculum, and showcases the mentor panel.",
  },
  {
    slug: "test-prep",
    title: "Test Prep & Academics",
    subtitle: "Weekend courses · Four tracks",
    description:
      "Catalog-style flyer for SAT/ACT/TOEFL, AP review, math olympiads, and science olympiads. Emphasizes small cohorts and no-AI-shortcuts.",
  },
  {
    slug: "booth-sign",
    title: "Booth sign — Books for sale",
    subtitle: "Standing sign · Zelle QR · $50 each",
    description:
      "Simple table-top sign for the booth: large hardcover-book pricing on top, a 4.4-inch Zelle QR code below for on-the-spot payment. Not a handout — print once, stand up.",
  },
]

export default function FlyersIndexPage() {
  if (schoolKey !== "pci") notFound()

  return (
    <main className="bg-white text-brand-navy-deep">
      {/* HERO */}
      <section className="relative bg-brand-navy-deep text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy to-black opacity-95" />
        <div className="relative mx-auto max-w-6xl px-6 lg:px-12 pt-24 lg:pt-32 pb-16 lg:pb-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Internal · Print materials
          </p>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] max-w-3xl">
            Flyers, ready to print.
          </h1>
          <p className="mt-6 max-w-2xl text-base lg:text-lg text-white/80 leading-relaxed font-light">
            Open a flyer in a new tab, hit <kbd className="font-mono bg-white/10 px-1.5 py-0.5 text-sm">Ctrl/⌘ + P</kbd>,
            choose <span className="font-semibold">letter size · no margins · background graphics on</span>,
            and either save as PDF or print. This page is unlisted — share the URL
            only with people who need it.
          </p>
        </div>
      </section>

      {/* FLYER GRID */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
          {FLYERS.map((f) => (
            <FlyerCard key={f.slug} flyer={f} />
          ))}
        </div>
      </section>

      {/* PRINT NOTES */}
      <section className="bg-[#f6f4ef] py-16 lg:py-20 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-6 lg:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-brand-orange">
            Print notes
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-tight">
            For the cleanest result
          </h2>
          <ul className="mt-6 space-y-3 text-base text-gray-700 leading-relaxed font-light">
            <li className="flex gap-3">
              <span className="text-brand-orange font-bold">·</span>
              <span>
                <span className="font-semibold text-brand-navy-deep">Paper size:</span>{" "}
                US Letter (8.5&Prime; × 11&Prime;).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-orange font-bold">·</span>
              <span>
                <span className="font-semibold text-brand-navy-deep">Margins:</span>{" "}
                None (or &ldquo;Default&rdquo; if your printer can&rsquo;t do edge-to-edge).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-orange font-bold">·</span>
              <span>
                <span className="font-semibold text-brand-navy-deep">Background graphics:</span>{" "}
                Must be enabled, or the navy bands and orange accents will print as white.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-orange font-bold">·</span>
              <span>
                <span className="font-semibold text-brand-navy-deep">Scale:</span>{" "}
                100% — don&rsquo;t let the browser shrink to fit.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-brand-orange font-bold">·</span>
              <span>
                Chrome and Edge print background graphics most reliably. Safari
                and Firefox work too but check the &ldquo;Print backgrounds&rdquo; toggle.
              </span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}

function FlyerCard({ flyer }: { flyer: Flyer }) {
  const href = `/flyers/${flyer.slug}.html`

  return (
    <article className="flex flex-col bg-white border border-gray-200 shadow-sm">
      {/* Preview — iframe of the actual flyer HTML, auto-scaled to the
          card width via container queries. The flyer's natural size is
          816 × 1056 (8.5 × 11 inches at 96 DPI); scale = 100cqw / 816
          keeps the preview pixel-accurate regardless of card width. */}
      <div
        className="relative bg-[#e5e7eb] overflow-hidden"
        style={{ aspectRatio: "8.5 / 11", containerType: "inline-size" }}
      >
        <iframe
          src={href}
          title={`${flyer.title} flyer preview`}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "816px",
            height: "1056px",
            border: 0,
            pointerEvents: "none",
            transform: "scale(calc(100cqw / 816))",
            transformOrigin: "top left",
          }}
        />
      </div>

      {/* Meta + actions */}
      <div className="p-6 lg:p-8 border-t border-gray-200">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
          {flyer.subtitle}
        </p>
        <h2 className="mt-2 text-2xl lg:text-3xl font-black tracking-tight text-brand-navy-deep">
          {flyer.title}
        </h2>
        <p className="mt-3 text-base text-gray-700 leading-relaxed font-light">
          {flyer.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-brand-orange px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:brightness-110 transition"
          >
            Open &amp; print →
          </a>
          <a
            href={href}
            download
            className="inline-flex items-center justify-center border border-brand-navy-deep/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-brand-navy-deep hover:bg-brand-navy-deep hover:text-white transition"
          >
            Download HTML
          </a>
        </div>
      </div>
    </article>
  )
}
