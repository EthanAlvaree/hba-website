// lib/site.ts
//
// Single source of truth for site-wide constants. Pages should import from
// here rather than hardcoding the school name, contact info, social URLs,
// etc. This is the multi-tenant config layer: a SCHOOL_KEY env var
// selects which school's config the running deployment uses.
//
// One codebase, two deployments. HBA's Vercel project sets SCHOOL_KEY=hba
// (or leaves it unset — that's the default). PCI's Vercel project sets
// SCHOOL_KEY=pci and gets a fully rebranded site from the same source.
//
// To add a third school: add a new entry to `configs` below. No code
// changes anywhere else should be required for a config-only rebrand
// because every runtime string flows through siteConfig.

export type SchoolKey = "hba" | "pci"

export type SiteConfig = {
  /** Full school name. */
  name: string
  /** Short / acronym form, used in tight headings and breadcrumbs. */
  shortName: string
  /** One-line tagline. */
  tagline: string
  /** Bare domain (no scheme). */
  domain: string
  /** Canonical https:// URL. Resolved from NEXT_PUBLIC_SITE_URL when
   *  set (so preview deployments report the right URL); otherwise
   *  derived from `domain`. Populated at module load. */
  url: string

  contact: {
    phone: string
    /** Digits only, for `tel:` links. */
    phoneTel: string
    admissionsEmail: string
    infoEmail: string
    /** Domain for school-account email addresses (without the @). */
    emailDomain: string
  }

  address: {
    streetLine1: string
    locality: string
    region: string
    /** Two-letter region code (e.g. "CA"). */
    regionCode: string
    postalCode: string
  }

  /** College Board CEEB code. Optional — not every school has one. */
  ceebCode?: string

  social: {
    instagram?: { handle: string; url: string }
    facebook?: { handle: string; url: string }
    tiktok?: { handle: string; url: string }
    youtube?: { handle: string; url: string }
    linkedin?: { handle: string; url: string }
    yelp?: { handle: string; url: string }
  }

  external: {
    /** Application / re-enrollment URL. Native (`/apply`) by default. */
    enrollment: string
    /** Hosted Stripe Payment Link URL for the registration fee. Shown
     *  on the apply-wizard success view as a CTA. Family clicks → pays
     *  on Stripe → Stripe records `client_reference_id=<application_id>`
     *  on the payment so admins can reconcile in the Stripe dashboard.
     *  Leave undefined to hide the CTA (e.g. PCI until its Stripe
     *  account is set up). */
    stripeRegistrationLink?: string
  }

  /** Brand hex values. Used by raw color contexts (charts, OG images,
   *  inline SVG fills) AND injected as CSS vars at runtime by
   *  components/ui/BrandStyle.tsx so Tailwind utilities like
   *  `bg-brand-navy` resolve to the right school's hue. */
  brand: {
    navy: string
    navyDeep: string
    orange: string
    /** Per-school logo asset paths. Leave any field undefined and
     *  consumers fall back to a text mark (the school's `shortName`).
     *  Add real image files at these paths and they light up
     *  automatically. */
    logos?: {
      /** Used in the dark navbar — wide, white-on-transparent. */
      headerWhite?: string
      /** Used in the footer top-left — wide, color. */
      footerColor?: string
      /** Used in the footer rotor + favicons — square / circular. */
      round?: string
    }
  }
}

// ============================================================================
// Per-school configs
// ============================================================================

const hba: SiteConfig = {
  name: "High Bluff Academy",
  shortName: "HBA",
  tagline:
    "A college-preparatory private high school in Rancho Santa Fe, California.",
  domain: "highbluffacademy.com",
  url: "https://highbluffacademy.com", // overridden below if NEXT_PUBLIC_SITE_URL is set

  contact: {
    phone: "(858) 509-9101",
    phoneTel: "+18585099101",
    admissionsEmail: "admissions@highbluffacademy.com",
    infoEmail: "info@highbluffacademy.com",
    emailDomain: "highbluffacademy.com",
  },

  address: {
    streetLine1: "5531 Cancha de Golf, Ste 202",
    locality: "Rancho Santa Fe",
    region: "California",
    regionCode: "CA",
    postalCode: "92091",
  },

  ceebCode: "053036",

  social: {
    instagram: {
      handle: "highbluffacademy",
      url: "https://www.instagram.com/highbluffacademy",
    },
    facebook: {
      handle: "HighBluffAcademySanDiego",
      url: "https://www.facebook.com/HighBluffAcademySanDiego",
    },
    tiktok: {
      handle: "highbluffacademy",
      url: "https://www.tiktok.com/@highbluffacademy",
    },
    youtube: {
      handle: "UCBnvACwf375sxhefzTZOlog",
      url: "https://www.youtube.com/channel/UCBnvACwf375sxhefzTZOlog",
    },
    linkedin: {
      handle: "highbluffacademy",
      url: "https://www.linkedin.com/school/highbluffacademy/",
    },
    yelp: {
      handle: "high-bluff-academy-rancho-santa-fe",
      url: "https://www.yelp.com/biz/high-bluff-academy-rancho-santa-fe",
    },
  },

  external: {
    enrollment: "/apply",
    stripeRegistrationLink: "https://buy.stripe.com/6oU3cwe2Sh037VnfdR6Vq00",
  },

  brand: {
    navy: "#1f3f66",
    navyDeep: "#0f1f36",
    orange: "#f37021",
    logos: {
      headerWhite: "/images/hba/brand/hba-logo-white-spaced.webp",
      footerColor: "/images/hba/brand/hba-logo-color.webp",
      round: "/images/hba/brand/hba-logo-round.webp",
    },
  },
}

// Placeholder PCI config. Replace the TODO_* fields when the actual
// PCI data is ready. Brand colors are intentionally NOT cloned from
// HBA — they're a distinctive coastal teal so any accidental PCI
// deploy is immediately visually obvious, not silently wearing HBA's
// look. Update to PCI's real palette once design is finalized.
const pci: SiteConfig = {
  name: "Pacific Crest Institute",
  shortName: "PCI",
  tagline:
    "Elite weekend programs in digital art and college test prep, for students whose passions deserve more than weekday hours allow.",
  domain: "pacificcrestinstitute.com",
  url: "https://pacificcrestinstitute.com", // overridden by NEXT_PUBLIC_SITE_URL

  contact: {
    phone: "TODO_PCI",
    phoneTel: "+1000000000",
    admissionsEmail: "admissions@pacificcrestinstitute.com",
    infoEmail: "info@pacificcrestinstitute.com",
    emailDomain: "pacificcrestinstitute.com",
  },

  address: {
    streetLine1: "TODO_PCI street",
    locality: "TODO_PCI city",
    region: "TODO_PCI region",
    regionCode: "CA",
    postalCode: "TODO",
  },

  // ceebCode intentionally omitted — fill in when known.

  social: {
    // TODO_PCI: add social URLs as they exist
  },

  external: {
    enrollment: "/apply",
  },

  brand: {
    // Coastal teal placeholder palette. Replaces the HBA-cloned values
    // so an accidental PCI deploy is visually unmistakable. Swap to
    // PCI's actual brand colors once the design pass lands.
    navy: "#1f5f6b",
    navyDeep: "#0e3a44",
    orange: "#e08a3c",
    logos: {
      headerWhite: "/images/pci/logo-white.webp",
      footerColor: "/images/pci/logo-color.webp",
      // No round / seal asset yet — Footer falls back to a text mark.
    },
  },
}

const configs: Record<SchoolKey, SiteConfig> = { hba, pci }

// ============================================================================
// Resolution
// ============================================================================

function resolveSchoolKey(): SchoolKey {
  const raw = process.env.SCHOOL_KEY?.trim().toLowerCase()
  if (raw === "pci") return "pci"
  // Default everything else (including the empty unset case) to HBA so
  // existing deployments keep working without an env-var migration.
  return "hba"
}

export const schoolKey: SchoolKey = resolveSchoolKey()

export const siteConfig: SiteConfig = configs[schoolKey]

// Apply env-var override for the active config's url.
{
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) {
    siteConfig.url = fromEnv.replace(/\/$/, "")
  }
}

// Loud warning at module load if PCI is the active school but the
// placeholder TODO_* markers are still in place. The site will still
// boot — these aren't crashes — but the operator should know
// something is incomplete before users hit it.
{
  const flat = JSON.stringify(siteConfig)
  if (schoolKey === "pci" && flat.includes("TODO_PCI")) {
    // eslint-disable-next-line no-console
    console.warn(
      "[lib/site] WARNING: SCHOOL_KEY=pci but PCI config still has TODO_PCI placeholders. Fill in lib/site.ts before promoting to production."
    )
  }
}

/** Convenience re-export so callers can keep `import { brand } …` syntax.
 *  Equivalent to `siteConfig.brand`. */
export const brand = siteConfig.brand

/** Backwards-compat re-export — older imports from `@/lib/config` should be
 *  migrated to `@/lib/site`, but until then this avoids breaking anything. */
export const SITE_URL = siteConfig.url
