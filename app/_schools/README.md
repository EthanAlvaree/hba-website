# `app/_schools/` — per-tenant page content

The leading underscore tells Next.js not to treat this as a route
folder. Files here are imported by the school-aware route handlers
(`app/page.tsx`, `app/contact/page.tsx`, etc.) that dispatch based on
`schoolKey`. **Both tenants live as siblings** — neither is the
"default" with the other special-cased.

## Pattern

Each route that diverges between HBA and PCI is a thin dispatcher:

```tsx
// app/page.tsx
import { schoolKey } from "@/lib/site"
import HbaHomePage from "./_schools/hba/HomePage"
import PciHomePage from "./_schools/pci/HomePage"

export default function Page() {
  if (schoolKey === "pci") return <PciHomePage />
  return <HbaHomePage />
}
```

## Directory layout

```
_schools/
  README.md             ← this file
  hba/
    HomePage.tsx        ← /  on HBA
    ...                 ← add more as HBA pages get extracted (see below)
  pci/
    HomePage.tsx        ← /  on PCI
    ContactPage.tsx     ← /contact on PCI
    ...                 ← add more as PCI's site grows
```

## What's already split

- **`/`** — `app/page.tsx` dispatches → `_schools/hba/HomePage` or
  `_schools/pci/HomePage`.
- **`/contact`** — `app/contact/page.tsx` dispatches → HBA's
  contact-page JSX (still inline) or `_schools/pci/ContactPage`.
- **Chrome** — Navbar + Footer read brand assets and link lists from
  `siteConfig` / `lib/navigation`, both keyed on `schoolKey`.

## What's NOT yet split (HBA-only on HBA's deployment, also rendered
on PCI's domain because the route handler isn't a dispatcher yet)

Marketing routes that still have HBA content inline at
`app/<route>/page.tsx`:

- `/about` (+ `/about/leadership`, `/about/college-acceptances`)
- `/admissions` (+ `/admissions/financial-aid`, `/admissions/international`)
- `/programs` (+ `/programs/courses`, `/programs/online`, `/programs/graduation-requirements`)
- `/faculty`, `/faculty/[slug]`
- `/community` (+ `/community/alumni`, `/community/partnerships`,
  `/community/parents`, `/community/store`)
- `/student-life`, `/student-life/athletics`
- `/summer-programs`, `/reviews`, `/calendar`, `/transcripts`
- Legal: `/privacy`, `/terms`, `/accessibility`, `/nondiscrimination`

PCI's nav points at none of these, so PCI visitors don't reach them
by clicking around — but the URLs still resolve if typed in. Three
strategies per route, pick when it matters:

1. **Leave alone** — content is HBA-specific, PCI never links it,
   nobody types the URL. Cheapest.
2. **Fork** — extract HBA's JSX into `_schools/hba/<Route>Page.tsx`,
   build `_schools/pci/<Route>Page.tsx`, convert the route handler
   to a dispatcher. Do this when PCI needs real content there.
3. **404 on PCI** — add a `notFound()` guard:
   ```tsx
   import { notFound } from "next/navigation"
   import { schoolKey } from "@/lib/site"
   if (schoolKey === "pci") notFound()
   ```
   Use for routes that are fundamentally HBA-only
   (e.g. `/programs/graduation-requirements`).

## Adding a new page to a tenant

```
1. Decide the URL — say /programs
2. Create app/programs/page.tsx (the dispatcher) if it doesn't exist
3. The dispatcher imports both schools' versions:
     import { schoolKey } from "@/lib/site"
     import HbaProgramsPage from "@/app/_schools/hba/ProgramsPage"
     import PciProgramsPage from "@/app/_schools/pci/ProgramsPage"
     export default function Page() {
       if (schoolKey === "pci") return <PciProgramsPage />
       return <HbaProgramsPage />
     }
4. Create app/_schools/hba/ProgramsPage.tsx with HBA's content
5. Create app/_schools/pci/ProgramsPage.tsx with PCI's content
6. Add { title: "Programs", href: "/programs" } to the right nav array
   in lib/navigation.ts (hbaNavigation and/or pciNavigation)
```

## Images

- HBA components reference `/images/hba/<topic>/<file>.webp`
- PCI components reference `/images/pci/<file>.webp`
- Tenant-neutral assets live at `/images/shared/<topic>/<file>.webp`

See `public/images/README.md` for the full asset-layout doc.
