# Building PCI's website

PCI is a tenant of the shared HBA / PCI codebase. The shared
infrastructure (SIS, M365 provisioning, migrations, audit log) is
school-agnostic; the public-facing site, branding, and per-page content
are split per school. This guide is the map for adding PCI content.

## Mental model

- **One repo, two deployments.** HBA's Vercel project deploys with
  `SCHOOL_KEY=hba` (or unset). PCI's deploys with `SCHOOL_KEY=pci`. Same
  source, different env.
- **`siteConfig` is keyed on `SCHOOL_KEY`.** `lib/site.ts` exports a
  config object whose fields (name, shortName, tagline, contact,
  address, social, brand colors, logo paths, …) come from the right
  block. Almost everywhere a school name or color is rendered, it
  already flows through `siteConfig`.
- **School-aware navigation.** `lib/navigation.ts` exports a single
  `navigation` array that's selected from `hbaNavigation` /
  `pciNavigation` based on `schoolKey`. PCI starts stripped down — just
  Contact in the nav until more pages exist.
- **School-aware pages.** Routes that need per-school content branch in
  their `page.tsx` and import from `app/_schools/<key>/`. So far:
  - `/` → `app/page.tsx` → `app/_schools/pci/HomePage.tsx` on PCI
  - `/contact` → `app/contact/page.tsx` → `app/_schools/pci/ContactPage.tsx`
- **Images.** PCI assets live under `public/images/pci/`. HBA assets
  remain under `public/images/hba/brand/`, `public/images/hba/home/`, etc.

## What's already split (PCI gets its own version)

- **Home page** (`/`) — minimal hero + two program cards + CTA.
- **Contact page** (`/contact`) — reuses the shared Turnstile-protected
  contact form; PCI-specific chrome.
- **Header (Navbar)** — logo + school name from `siteConfig`. Falls
  back to a text mark (`PCI`) when no logo image is configured. Hides
  the "Apply" CTA on PCI (no apply form yet).
- **Footer** — early-returns a minimal PCI footer (logo / contact /
  social). Skips HBA-specific WASC + UC accreditation badges and the
  long resource/policy link list.
- **Brand colors** — injected as CSS variables on `<html>` from
  `siteConfig.brand`, so `bg-brand-navy`, `text-brand-orange`, etc.
  resolve to PCI's teal palette automatically.

## What's NOT split (PCI inherits HBA's version for now)

These pages still render as HBA-flavored on PCI's deployment because
they haven't been forked yet:

- `/about`, `/admissions`, `/programs`, `/faculty`, `/community`,
  `/student-life`, `/summer-programs`, `/reviews`, `/calendar`,
  `/transcripts`, `/welcome`, `/apply`, etc.

For most of these, the path forward is one of:

1. **Don't fork it — just don't link to it.** If PCI's nav never points
   at `/admissions`, no one finds it on PCI. The page still exists as a
   URL, but it's effectively dead. Cheapest option.
2. **Fork it.** Create `app/_schools/pci/AboutPage.tsx`, add the
   dispatch to `app/about/page.tsx`. Best when PCI needs real content
   at that route.
3. **404 it for PCI.** Add a `notFound()` guard at the top of the
   shared route's `page.tsx`:
   ```tsx
   import { notFound } from "next/navigation"
   import { schoolKey } from "@/lib/site"
   if (schoolKey === "pci") notFound()
   ```
   Best when the page is fundamentally HBA-only (e.g. graduation
   requirements).

We can decide per-route as PCI's content matures.

## Adding a new PCI page

```
1. Decide the URL — say /programs
2. If app/programs/page.tsx doesn't exist yet, create it.
3. Add the dispatch:
     import { schoolKey } from "@/lib/site"
     import PciProgramsPage from "@/app/_schools/pci/ProgramsPage"
     export default function Page() {
       if (schoolKey === "pci") return <PciProgramsPage />
       return <HbaPrograms />
     }
4. Create app/_schools/pci/ProgramsPage.tsx with the new content.
5. Add { title: "Programs", href: "/programs" } to pciNavigation
   in lib/navigation.ts.
```

## Adding PCI images

1. Drop the file in `public/images/pci/<file>.webp` (lowercase,
   hyphenated, WebP).
2. Reference it from a PCI component as `/images/pci/<file>.webp`.
3. If it's a logo, update `lib/site.ts` `pci.brand.logos` and the
   Navbar / Footer will pick it up automatically.

## Filling in the real PCI config

`lib/site.ts` has the `pci` block. The non-`TODO_` fields are now real
(name = "Pacific Crest Institute", emails on the PCI domain, etc.).
Outstanding placeholders to fill in when you have them:

- `contact.phone` (and `phoneTel`)
- `address.streetLine1`, `locality`, `region`, `postalCode`
- `social.*` URLs as PCI's accounts exist
- `brand.logos` once logo files exist in `public/images/pci/`
- `external.stripeRegistrationLink` once PCI's Stripe account exists
  (until then the "Pay registration fee" CTA on the apply form is
  hidden on PCI — and the apply form itself isn't reachable from PCI's
  nav anyway).

A runtime warning logs at module load if `TODO_` markers remain on a
`SCHOOL_KEY=pci` deploy — not a crash, just a heads-up in the function
logs.
