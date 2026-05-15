// lib/env.ts
//
// School-agnostic accessors for the Supabase / Postgres connection
// settings. Originally these were named HBA_SUPABASE_URL etc., which is
// awkward now that PCI is a second tenant of the same codebase.
//
// Each accessor reads the new unprefixed name first and falls back to
// the legacy HBA_* name, so existing Vercel envs keep working during
// the migration. Once both names are everywhere we want them in your
// Vercel projects, the HBA_* fallbacks can be removed.

export function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.HBA_SUPABASE_URL
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.HBA_SUPABASE_SERVICE_ROLE_KEY
  )
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
}
