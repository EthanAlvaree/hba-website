// lib/env.ts
//
// School-aware accessors for runtime environment variables that may
// differ per deployment (HBA vs PCI).
//
// Two patterns are supported, both via the same `readSchoolEnv` helper:
//
// 1. **Unprefixed names per Vercel project.** Each Vercel project's env
//    namespace is isolated, so HBA's project can have
//    `GRAPH_MAIL_SENDER=noreply@highbluffacademy.com` and PCI's can have
//    `GRAPH_MAIL_SENDER=noreply@pacificcrestinstitute.com` — same name,
//    different values. This is the cleanest pattern for Vercel.
//
// 2. **Prefixed names in one shared scope** (e.g. local `.env.local`
//    that holds both schools' values). With `SCHOOL_KEY=pci` set, the
//    helper reads `PCI_GRAPH_MAIL_SENDER`; with `SCHOOL_KEY=hba` (or
//    unset — HBA is the default), it reads `HBA_GRAPH_MAIL_SENDER`.
//    Useful locally so a single env file serves both schools.
//
// Resolution order per name: unprefixed first, then `${SCHOOL}_<name>`.
// The first one that's set wins.
//
// scripts/migrate.ts has its own equivalent via the --school flag and
// doesn't import this module.
import { schoolKey } from "@/lib/site"

function readSchoolEnv(canonical: string): string | undefined {
  const direct = process.env[canonical]
  if (direct) return direct
  const prefixed = process.env[`${schoolKey.toUpperCase()}_${canonical}`]
  if (prefixed) return prefixed
  return undefined
}

// Supabase / Postgres connection.
export function getSupabaseUrl(): string | undefined {
  return readSchoolEnv("SUPABASE_URL")
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return readSchoolEnv("SUPABASE_SERVICE_ROLE_KEY")
}

export function getDatabaseUrl(): string | undefined {
  return readSchoolEnv("DATABASE_URL")
}

// Microsoft Graph: school-specific mailbox to send AS. (The Graph
// app-reg creds themselves — client id / secret / tenant — are tenant
// credentials and don't get prefixed.)
export function getGraphMailSender(): string | undefined {
  return readSchoolEnv("GRAPH_MAIL_SENDER")
}

// Outbound notification recipients.
export function getApplicationNotificationTo(): string | undefined {
  return readSchoolEnv("APPLICATION_NOTIFICATION_TO")
}

export function getContactNotificationTo(): string | undefined {
  return readSchoolEnv("CONTACT_NOTIFICATION_TO")
}

// Bearer token for Vercel cron auth.
export function getCronSecret(): string | undefined {
  return readSchoolEnv("CRON_SECRET")
}
