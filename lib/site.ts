// lib/site.ts
//
// Single source of truth for site-wide constants. Pages should import from
// here rather than hardcoding the school name, contact info, social URLs,
// etc. This is also what makes the codebase rebrandable in one file when
// forking to a new project.

/** Brand color hex values, mirrored in app/globals.css `@theme` and used
 *  in places that need a raw color string (charts, calendar dots, OG
 *  image generators, inline SVG fills) rather than a Tailwind class. */
export const brand = {
  navy: "#1f3f66",
  navyDeep: "#0f1f36",
  orange: "#f37021",
} as const

export const siteConfig = {
  /** Full school name. */
  name: "High Bluff Academy",
  /** Short / acronym form, used in tight headings and breadcrumbs. */
  shortName: "HBA",
  /** One-line tagline, used in metadata, OG images, and hero sections. */
  tagline:
    "A college-preparatory private high school in Rancho Santa Fe, California.",

  /** Canonical public origin. Override with NEXT_PUBLIC_SITE_URL when needed. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://highbluffacademy.com",
  /** Bare domain (no scheme), used in plain-text contexts like the print
   *  footer and the privacy / terms copy. */
  domain: "highbluffacademy.com",

  /** Contact info — used by the footer, contact page, transcripts page,
   *  international admissions page, and CTA blocks. */
  contact: {
    /** General-inquiry phone number, formatted for display. */
    phone: "(858) 509-9101",
    /** Same number, digits only — used inside `tel:` links. */
    phoneTel: "+18585099101",
    /** Where admissions inquiries should land. */
    admissionsEmail: "admissions@highbluffacademy.com",
    /** Generic info / general inquiries. */
    infoEmail: "info@highbluffacademy.com",
    /** Domain for school-account email addresses (without the @). */
    emailDomain: "highbluffacademy.com",
  },

  /** Mailing / physical address. */
  address: {
    streetLine1: "5531 Cancha de Golf, Ste 202",
    locality: "Rancho Santa Fe",
    region: "California",
    /** Two-letter region code, for structured data and address formatting. */
    regionCode: "CA",
    postalCode: "92091",
  },

  /** College Board CEEB code. Cited on programs / summer / admissions. */
  ceebCode: "053036",

  /** Social profiles. URLs are full https://, handles are bare. */
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

  /** External app / portal URLs. */
  external: {
    /** GradeLink enrollment / re-enrollment link. */
    enrollment: "https://secure.gradelink.com/2962/enrollment",
  },
} as const

export type SiteConfig = typeof siteConfig

/** Backwards-compat re-export — older imports from `@/lib/config` should be
 *  migrated to `@/lib/site`, but until then this avoids breaking anything. */
export const SITE_URL = siteConfig.url
