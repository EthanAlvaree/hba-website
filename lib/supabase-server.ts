// lib/supabase-server.ts
//
// Server-side Supabase client factory. Every server-only lib/* file used
// to inline its own copy of this 10-line dance; centralizing it here
// means:
//
//   - One place to flip RLS posture (e.g. when we land
//     db/migrations/0018-rls.sql, the service-role key is still what
//     server code uses, but we may add a separate user-context client
//     here for routes that should respect RLS).
//   - One place to add tracing, error wrapping, or request-id headers.
//   - One place to swap env-var names per tenant when we split HBA / PCI.
//
// Never import this from a client component. The service-role key
// bypasses RLS and must not reach the browser.

import { createClient } from "@supabase/supabase-js"

function build() {
  const supabaseUrl = process.env.HBA_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase server environment variables are missing.")
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let cached: ReturnType<typeof build> | undefined

/** Process-wide cached service-role client. Use this from server-only
 *  code paths (server actions, route handlers, lib/* modules). */
export function getServiceSupabase() {
  if (!cached) cached = build()
  return cached
}

/** Uncached service-role client. Use only when you specifically need a
 *  fresh instance — e.g. you're about to set custom headers on the
 *  underlying fetch. Almost always you want {@link getServiceSupabase}. */
export function createServiceSupabaseClient() {
  return build()
}
