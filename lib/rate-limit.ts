// lib/rate-limit.ts
//
// Postgres-backed fixed-window rate limiter. Use for the unauthenticated
// POST surfaces (/apply submit, /contact submit) where Turnstile is the
// spam filter and this is the abuse cap.
//
// Design: each call increments a Postgres counter in the (key, window)
// bucket via the rate_limit_increment SQL function (see 0019 migration).
// One round-trip per check. No new infrastructure beyond the existing
// Supabase project.
//
// Tradeoffs:
// - Fixed window means a flood at window boundaries can briefly do 2× the
//   limit. Acceptable for spam protection; not appropriate for billing.
// - Per-IP keys can be defeated by a botnet rotating IPs. This is fine
//   for our threat model (small school site, low-effort spammers); we'd
//   move to Cloudflare/Vercel WAF if that ever stopped being true.

import "server-only"
import { headers } from "next/headers"
import { getServiceSupabase } from "@/lib/supabase-server"

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; retryAfterSeconds: number; resetAt: Date }

export type RateLimitOptions = {
  /** Unique key for the limit. Conventionally "<purpose>:<dimension>:<id>".
   *  Example: "apply:ip:1.2.3.4". */
  key: string
  /** Window length in milliseconds. Common: 60_000 (1m), 3_600_000 (1h). */
  windowMs: number
  /** Maximum hits per window. */
  maxHits: number
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, windowMs, maxHits } = options
  const now = Date.now()
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  const windowStartIso = new Date(windowStartMs).toISOString()
  const resetAt = new Date(windowStartMs + windowMs)

  const { data, error } = await getServiceSupabase().rpc(
    "rate_limit_increment",
    { p_key: key, p_window_start: windowStartIso }
  )

  if (error) {
    // Fail-open: if Supabase is down, we still want the contact / apply
    // forms to work. Log loudly so we notice if it's persistent.
    console.error("Rate limit check failed (fail-open):", error.message, { key })
    return { allowed: true, remaining: maxHits, resetAt }
  }

  const hitCount = typeof data === "number" ? data : 0

  if (hitCount > maxHits) {
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000))
    return { allowed: false, retryAfterSeconds, resetAt }
  }

  return { allowed: true, remaining: Math.max(0, maxHits - hitCount), resetAt }
}

/** Pulls the client IP from the proxy headers. Works on Vercel + most
 *  reverse proxies. Falls back to "unknown" so a missing header doesn't
 *  group every requester under the same bucket. */
export async function clientIpFromHeaders(): Promise<string> {
  try {
    const h = await headers()
    const xff = h.get("x-forwarded-for")
    if (xff) {
      const first = xff.split(",")[0]?.trim()
      if (first) return first
    }
    const real = h.get("x-real-ip")
    if (real) return real
    return "unknown"
  } catch {
    return "unknown"
  }
}
