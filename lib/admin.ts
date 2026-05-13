// Admin / sign-in domain helpers.
//
// Admin authorization lives entirely in the `profiles` table:
// `roles @> ['admin'] AND active = true`. There is no hardcoded allowlist.
// Migration 0009 enforces "at least one active admin always exists" via a
// trigger; UI guards in lib/sis.ts give a friendly error before the trigger
// would ever fire.
//
// Seeding: migration 0005-seed-bootstrap-admins.sql ensures the four founder
// emails exist as admin profiles. After that runs, the role lives in the DB
// like any other and can be promoted / demoted / deleted from /admin/profiles.

export const hbaEmailDomain = "highbluffacademy.com"

export function isHbaEmail(email?: string | null) {
  if (!email) {
    return false
  }
  return email.toLowerCase().endsWith(`@${hbaEmailDomain}`)
}

// Canonical admin check. Reads the `profiles` row for this email and
// returns true iff it carries the 'admin' role AND is active.
//
// Used by auth.ts to populate `session.isAdmin` on the JWT. Page-level
// admin layouts also re-check on every request to catch in-flight
// demotions without forcing a re-login.
export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false

  try {
    const { getProfileByEmail } = await import("@/lib/sis")
    const profile = await getProfileByEmail(email)
    if (!profile) return false
    return profile.active && profile.roles.includes("admin")
  } catch (error) {
    console.error("isAdmin profile lookup failed", error)
    return false
  }
}
