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
  }

  /** Brand hex values. Used by raw color contexts (charts, OG images,
   *  inline SVG fills) AND injected as CSS vars at runtime by
   *  components/ui/BrandStyle.tsx so Tailwind utilities like
   *  `bg-brand-navy` resolve to the right school's hue. */
  brand: {
    navy: string
    navyDeep: string
    orange: string
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
  },

  brand: {
    navy: "#1f3f66",
    navyDeep: "#0f1f36",
    orange: "#f37021",
  },
}

// Placeholder PCI config. Replace the TODO fields when the actual PCI
// data is ready. Brand colors are kept identical to HBA's for now so
// the placeholder deploy doesn't look wildly different until the
// design pass lands.
const pci: SiteConfig = {
  name: "Pacific Coast International", // TODO confirm official name
  shortName: "PCI",
  tagline: "TODO: one-line tagline for PCI",
  domain: "TODO-pci-domain.com", // TODO: set actual domain
  url: "https://TODO-pci-domain.com", // overridden by NEXT_PUBLIC_SITE_URL

  contact: {
    phone: "TODO", // TODO: PCI main phone
    phoneTel: "+1000000000",
    admissionsEmail: "admissions@TODO-pci-domain.com",
    infoEmail: "info@TODO-pci-domain.com",
    emailDomain: "TODO-pci-domain.com",
  },

  address: {
    streetLine1: "TODO street",
    locality: "TODO city",
    region: "TODO region",
    regionCode: "CA",
    postalCode: "TODO",
  },

  // ceebCode intentionally omitted — fill in when known.

  social: {
    // TODO: add PCI social URLs as they exist
  },

  external: {
    enrollment: "/apply",
  },

  brand: {
    // TODO: replace with PCI's actual brand colors when design is ready.
    navy: "#1f3f66",
    navyDeep: "#0f1f36",
    orange: "#f37021",
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

/** Convenience re-export so callers can keep `import { brand } …` syntax.
 *  Equivalent to `siteConfig.brand`. */
export const brand = siteConfig.brand

/** Backwards-compat re-export — older imports from `@/lib/config` should be
 *  migrated to `@/lib/site`, but until then this avoids breaking anything. */
export const SITE_URL = siteConfig.url
