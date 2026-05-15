#!/usr/bin/env tsx
//
// scripts/migrate.ts
//
// Applies pending SQL migrations in db/migrations/ to the database and
// records each one in a schema_migrations tracking table — so a
// migration is never skipped or run twice, and the DB state is always
// knowable.
//
// Usage:
//   npm run db:migrate           Apply every pending migration.
//   npm run db:migrate:status    Show applied vs. pending, change nothing.
//
// Environment (read from .env.local, or the process env):
//   DATABASE_URL       Direct Postgres connection string for the
//                      Supabase project. Get it from the Supabase
//                      dashboard: Project Settings -> Database ->
//                      Connection string -> URI (port 5432).
//                      Legacy alias HBA_DATABASE_URL still works.
//
// Baseline: the 38 migrations that predate this runner were applied by
// hand. On the very first run (empty schema_migrations table) the
// runner records 0001-0038 as already-applied WITHOUT executing them —
// re-running old seed migrations like 0011 would clobber admin edits.
// Everything numbered above the baseline runs normally.

import { readdir, readFile } from "node:fs/promises"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { Client } from "pg"

const MIGRATIONS_DIR = path.resolve(process.cwd(), "db/migrations")
const BASELINE_THROUGH = "0038"

// ---------------------------------------------------------------------------
// .env loader — standalone scripts don't get Next.js's env loading.
// Defaults to `.env.local`; override with `--env=<path>` (e.g. when
// migrating a different deployment's DB: `npm run db:migrate --
// --env=.env.pci.local`).
// ---------------------------------------------------------------------------
function envPathFromArgs(): string {
  const arg = process.argv.find((a) => a.startsWith("--env="))
  if (arg) return arg.slice("--env=".length)
  // Also accept `--env <path>` as two args.
  const i = process.argv.indexOf("--env")
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1]
  return ".env.local"
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), envPathFromArgs())
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, "utf-8")
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

// ---------------------------------------------------------------------------
// Migration files
// ---------------------------------------------------------------------------
type Migration = { version: string; name: string; file: string }

async function listMigrations(): Promise<Migration[]> {
  const entries = await readdir(MIGRATIONS_DIR)
  const migrations: Migration[] = []
  for (const file of entries) {
    const match = file.match(/^(\d{4})-(.+)\.sql$/)
    if (!match) continue
    migrations.push({ version: match[1], name: match[2], file })
  }
  // Zero-padded prefixes sort correctly lexically.
  migrations.sort((a, b) => a.version.localeCompare(b.version))
  return migrations
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------
async function ensureTable(client: Client) {
  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    )
  `)
}

async function getApplied(client: Client): Promise<Set<string>> {
  const { rows } = await client.query<{ version: string }>(
    "select version from schema_migrations"
  )
  return new Set(rows.map((r) => r.version))
}

async function record(client: Client, m: Migration) {
  await client.query(
    "insert into schema_migrations (version, name) values ($1, $2) on conflict (version) do nothing",
    [m.version, m.name]
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnvLocal()
  const statusOnly = process.argv.includes("--status")
  // --fresh skips the baseline shortcut and applies every migration from
  // 0001 onward. Use this on a brand-new database (e.g. a fresh Supabase
  // project for a second deployment) — the baseline rule is only correct
  // when 0001-0038 were already hand-applied to the target DB.
  const fresh = process.argv.includes("--fresh")

  // --school=pci (or any other key) lets a single .env.local hold env
  // vars for multiple deployments with prefixed names (HBA_*, PCI_*, …).
  // When passed, we copy the prefixed values into the unprefixed names
  // the rest of the script (and the app code) expects.
  const schoolArg = process.argv
    .find((a) => a.startsWith("--school="))
    ?.slice("--school=".length)
  if (schoolArg) {
    const prefix = schoolArg.toUpperCase()
    const map: Array<[string, string]> = [
      ["DATABASE_URL", `${prefix}_DATABASE_URL`],
      ["SUPABASE_URL", `${prefix}_SUPABASE_URL`],
      ["SUPABASE_SERVICE_ROLE_KEY", `${prefix}_SUPABASE_SERVICE_ROLE_KEY`],
    ]
    for (const [dest, src] of map) {
      const value = process.env[src]
      if (value) process.env[dest] = value
    }
  }

  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL (or legacy HBA_DATABASE_URL). Add it to\n" +
        ".env.local — the direct Postgres connection string from\n" +
        "Supabase: Project Settings -> Database -> Connection string ->\n" +
        "URI (port 5432)."
    )
    process.exit(2)
  }

  const migrations = await listMigrations()
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    await ensureTable(client)
    let applied = await getApplied(client)

    // First run on a fresh tracking table: baseline the hand-applied
    // migrations so they're recorded but never re-executed. Skipped when
    // --fresh is set — that's the "brand-new database, apply everything
    // from 0001" path used to bootstrap a second deployment.
    if (applied.size === 0 && !fresh) {
      const baseline = migrations.filter(
        (m) => m.version <= BASELINE_THROUGH
      )
      for (const m of baseline) await record(client, m)
      console.log(
        `[migrate] Baselined ${baseline.length} pre-existing migration(s) ` +
          `(0001-${BASELINE_THROUGH}) as already applied.`
      )
      applied = await getApplied(client)
    } else if (applied.size === 0 && fresh) {
      console.log(
        "[migrate] --fresh: applying every migration from 0001 onward."
      )
    }

    const pending = migrations.filter((m) => !applied.has(m.version))

    if (statusOnly) {
      console.log(
        `[migrate] ${applied.size} applied, ${pending.length} pending.`
      )
      for (const m of pending) {
        console.log(`  pending: ${m.version}-${m.name}`)
      }
      return
    }

    if (pending.length === 0) {
      console.log("[migrate] Up to date — nothing to apply.")
      return
    }

    for (const m of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, m.file), "utf-8")
      process.stdout.write(`[migrate] Applying ${m.version}-${m.name} ... `)
      try {
        // Each migration file wraps itself in begin;/commit;.
        await client.query(sql)
        await record(client, m)
        console.log("ok")
      } catch (err) {
        console.log("FAILED")
        console.error(
          `[migrate] ${m.file} failed: ${
            err instanceof Error ? err.message : err
          }`
        )
        console.error(
          "[migrate] Stopping. Fix the migration and re-run — already-" +
            "applied migrations will be skipped."
        )
        process.exit(1)
      }
    }
    console.log(`[migrate] Done — applied ${pending.length} migration(s).`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error("[migrate] FATAL:", err)
  process.exit(1)
})
