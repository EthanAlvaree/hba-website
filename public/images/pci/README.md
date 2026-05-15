# `public/images/pci/` — PCI-specific image assets

Drop PCI's images here. Anything in `public/` is served at the root, so
a file at `public/images/pci/hero.webp` is reachable at
`/images/pci/hero.webp`.

## Filenames the codebase already expects

| Path | What it's used for | Currently |
| --- | --- | --- |
| `/images/pci/logo-white.webp` | Navbar logo (white-on-navy) | Falls back to text mark "PCI" until file exists |
| `/images/pci/logo-color.webp` | Footer top-left logo | Currently unused (PCI footer doesn't show this slot yet) |
| `/images/pci/logo-round.webp` | Footer rotor + favicons | Falls back to text mark in the rotor |
| `/images/pci/hero.webp` | Home page hero | Hero currently uses a CSS gradient until file exists |

When you upload these, also update `lib/site.ts` (the `pci` block) to
set `brand.logos = { headerWhite: "/images/pci/logo-white.webp", ... }`.
The home hero will need a small edit in
`app/_schools/pci/HomePage.tsx` to switch from gradient to `<Image>`.

## Naming conventions

- **Lowercase, hyphenated**: `art-program-hero.webp`, not
  `ArtProgramHero.webp` or `art_program_hero.webp`.
- **WebP for raster images**: smaller files, fully browser-supported.
  Convert JPEGs/PNGs with `cwebp` or any image tool.
- **SVG for line art / logos**: scales without quality loss.
- **Descriptive names**: `digital-art-classroom.webp` beats `pic1.webp`.

## What HBA-side images look like (for reference)

HBA's analogous files live in `public/images/brand/` and
`public/images/home/`:
- `hba-logo-white-spaced.webp`, `hba-logo-color.webp`,
  `hba-logo-round.webp`
- `home-hero.webp`, `campus-aerial.webp`, etc.

PCI's tree can mirror this structure as it grows, or stay flat at
`public/images/pci/*` while the site is small.
