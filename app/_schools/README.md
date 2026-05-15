# `app/_schools/` — per-school content

The leading underscore means Next.js doesn't treat this as a route
folder. Files here are imported by the school-aware route handlers
(`app/page.tsx`, `app/contact/page.tsx`, etc.) that dispatch based on
`schoolKey`.

## Pattern

Each route that should diverge between HBA and PCI lives as a thin
handler that picks the right component:

```tsx
// app/page.tsx
import { schoolKey } from "@/lib/site"
import PciHome from "./_schools/pci/HomePage"

export default function Page() {
  if (schoolKey === "pci") return <PciHome />
  return <HbaHome />   // HBA's existing JSX, kept inline
}
```

When a page becomes meaningfully different per school, extract HBA's
version into `app/_schools/hba/HomePage.tsx` for symmetry. While HBA
still has the bulk of content here, keeping its JSX inline in
`app/page.tsx` is fine.

## Directory layout

```
_schools/
  README.md           ← this file
  hba/                ← reserved; HBA's pages live in app/* until split
  pci/
    HomePage.tsx      ← /  on PCI
    ContactPage.tsx   ← /contact on PCI
    ...               ← add more as PCI's site grows
```

## Adding a new PCI page

1. Decide the URL (e.g. `/programs`).
2. Create the existing route's `page.tsx` if it doesn't yet exist
   (e.g. `app/programs/page.tsx`).
3. Make it dispatch on `schoolKey`, pointing PCI at
   `_schools/pci/ProgramsPage.tsx`.
4. Add the link to `lib/navigation.ts` under `pciNavigation`.

## Images

PCI-specific images go in `public/images/pci/`. Reference them via
`/images/pci/<file>.webp` from PCI components.

## What's already split

- **Home** (`/`) — `app/page.tsx` dispatches.
- **Contact** (`/contact`) — `app/contact/page.tsx` dispatches.
- **Chrome** — Navbar + Footer read brand assets and link lists from
  `siteConfig` / `lib/navigation`, both keyed on `schoolKey`. PCI gets a
  simplified footer + a minimal nav (Contact only).
