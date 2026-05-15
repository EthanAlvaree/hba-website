# `public/images/` — per-tenant image layout

Symmetric structure so neither tenant lives at the "privileged" top
level:

```
public/images/
  hba/        ← HBA-specific assets (about, admissions, brand, etc.)
  pci/        ← PCI-specific assets
  shared/     ← tenant-neutral assets (e.g. m365-setup/ icons)
```

## Adding HBA images

Drop new HBA images into `public/images/hba/<topic>/`. Reference them
from HBA components as `/images/hba/<topic>/<file>.webp`. The HBA
subfolder layout mirrors the marketing-page topics:

- `about/`, `admissions/`, `athletics/`, `brand/`, `calendar/`,
  `college-acceptances/`, `community/`, `contact/`, `faculty/`,
  `home/`, `leadership/`, `online/`, `partnerships/`, `policies/`,
  `programs/`, `reviews/`, `student-life/`, `summer/`, `transcripts/`
- `_unsorted/` — staging area for files not yet categorized
  (untracked in git on purpose; promote to a real subfolder when ready)

## Adding PCI images

Drop into `public/images/pci/`. See `public/images/pci/README.md` for
filename conventions and what the codebase currently expects (logo
paths, hero, etc.).

## Adding shared images

`public/images/shared/` is for assets that genuinely apply to either
tenant. Today this is just `m365-setup/` — the Microsoft app icons
(Teams, Outlook, Authenticator, OneNote, Edge) used by the `/welcome`
M365 onboarding walkthrough. Microsoft brand assets, not school
branding.

Don't put HBA's brand assets in `shared/` "to save a click" — that
leaks HBA's identity into PCI if PCI ever needs the same component.
Duplicate or refactor instead.

## Naming conventions

- **Lowercase, hyphenated**: `home-hero.webp`, not `HomeHero.webp`.
- **WebP for raster**; SVG for vector / logos.
- **Descriptive**: `digital-art-classroom.webp`, not `pic1.webp`.

## Why the split exists

`siteConfig.brand.logos` in `lib/site.ts` keys on `SCHOOL_KEY` and
returns paths under either `/images/hba/...` or `/images/pci/...` so a
SCHOOL_KEY=pci deployment never accidentally serves HBA branding —
even if a stray import path slips in, the file isn't there.
