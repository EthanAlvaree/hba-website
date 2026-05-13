// lib/calendar-tokens.ts
//
// HMAC-signed tokens for per-parent calendar subscription URLs. The
// parent calendar feed lives at:
//
//   /api/calendar/parent/<profileId>.ics?token=<hmac>
//
// where the token is `hmac_sha256(<secret>, profileId).hex().slice(0, 32)`.
// This means:
//   - The URL is unguessable without the secret (32 hex chars =
//     128 bits of search space).
//   - We don't have to store a token per parent in the DB.
//   - Rotating the secret invalidates every existing subscription —
//     accept this; it's rare and parents can re-grab the URL from
//     /parent → "Subscribe to calendar".
//
// Secret: read from CALENDAR_TOKEN_SECRET, falling back to
// NEXTAUTH_SECRET (which every deploy already has). If neither is
// set we refuse to issue tokens — better to surface the missing env
// var than to ship a deterministic-from-empty-string token.

import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

function getSecret(): string {
  const direct = process.env.CALENDAR_TOKEN_SECRET?.trim()
  if (direct) return direct
  const fallback = process.env.NEXTAUTH_SECRET?.trim()
  if (fallback) return fallback
  throw new Error(
    "Calendar token secret is missing. Set CALENDAR_TOKEN_SECRET (or NEXTAUTH_SECRET)."
  )
}

export function signCalendarToken(profileId: string): string {
  const secret = getSecret()
  return createHmac("sha256", secret).update(profileId).digest("hex").slice(0, 32)
}

export function verifyCalendarToken(profileId: string, token: string): boolean {
  if (!token || token.length !== 32) return false
  let expected: string
  try {
    expected = signCalendarToken(profileId)
  } catch {
    return false
  }
  // timingSafeEqual requires equal-length buffers.
  const a = Buffer.from(expected, "hex")
  const b = Buffer.from(token, "hex")
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
