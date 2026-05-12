const allowedAdminEmails = [
  "molly@highbluffacademy.com",
  "kristin@highbluffacademy.com",
  "ethan@highbluffacademy.com",
  "kun@highbluffacademy.com",
] as const

const allowedAdminEmailSet = new Set(allowedAdminEmails)

export const adminEmails = allowedAdminEmails

export const hbaEmailDomain = "highbluffacademy.com"

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) {
    return false
  }

  return allowedAdminEmailSet.has(email.toLowerCase() as (typeof allowedAdminEmails)[number])
}

// HBA-domain check used to gate sign-in. Anyone with an @highbluffacademy.com
// account can authenticate; admin pages still apply their own allowlist on
// top of that.
export function isHbaEmail(email?: string | null) {
  if (!email) {
    return false
  }
  return email.toLowerCase().endsWith(`@${hbaEmailDomain}`)
}

// Canonical admin check. Combines the hardcoded bootstrap list above with a
// profiles-table lookup so admins can be added/removed via UI without a code
// deploy. The bootstrap list is a permanent safety net: even if someone
// strips every profile's admin role through the UI, the four founding admins
// still have access. Computed once at sign-in (see auth.ts jwt callback) and
// cached on the session as `session.isAdmin`, so page-level checks stay free.
export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false
  if (isAllowedAdminEmail(email)) return true

  try {
    const { getProfileByEmail } = await import("@/lib/sis")
    const profile = await getProfileByEmail(email)
    return profile?.roles.includes("admin") ?? false
  } catch (error) {
    console.error("isAdmin profile lookup failed", error)
    return false
  }
}