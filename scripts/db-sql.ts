#!/usr/bin/env tsx
//
// scripts/db-sql.ts
//
// Run ad-hoc SQL against the database from the terminal. The migration
// runner is for tracked schema changes; this is for one-off
// maintenance / inspection queries that don't belong as migrations
// (clearing rate-limit rows, checking a count, deleting a test record,
// etc.) — without leaving VS Code for the Supabase web SQL editor.
//
// Usage:
//   npm run db:sql -- scratch.sql                    # run a file
//   npm run db:sql -- --query="select count(*) from applications"
//   npm run db:sql -- --school=pci scratch.sql        # target PCI's DB
//   npm run db:sql -- --school=pci --query="..."
//
// SELECTs render as a table. Other statements print rowCount. On
// error, the script exits non-zero so it composes in shell pipelines.

import { Client } from "pg"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const raw of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim()
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

function parseArgs() {
  const argv = process.argv.slice(2)
  const school =
    argv
      .find((a) => a.startsWith("--school="))
      ?.slice("--school=".length) ?? null
  const queryArg =
    argv
      .find((a) => a.startsWith("--query="))
      ?.slice("--query=".length) ?? null
  const filePath = argv.find((a) => !a.startsWith("--")) ?? null
  return { school, queryArg, filePath }
}

async function main() {
  loadEnvLocal()
  const { school, queryArg, filePath } = parseArgs()

  // Same school-prefix remapping the migrate runner uses.
  if (school) {
    const prefix = school.toUpperCase()
    const url = process.env[`${prefix}_DATABASE_URL`]
    if (url) process.env.DATABASE_URL = url
  }

  const connectionString =
    process.env.DATABASE_URL ?? process.env.HBA_DATABASE_URL
  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL. Add it to .env.local (or pass --school=<key> to use a prefixed one)."
    )
    process.exit(2)
  }

  let sql: string
  if (queryArg) {
    sql = queryArg
  } else if (filePath) {
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      process.exit(2)
    }
    sql = readFileSync(filePath, "utf-8")
  } else {
    console.error(
      "Usage:\n" +
        '  npm run db:sql -- <file.sql>\n' +
        '  npm run db:sql -- --query="SELECT ..."\n' +
        '  npm run db:sql -- --school=pci <file.sql>'
    )
    process.exit(2)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  try {
    const result = await client.query(sql)
    if (Array.isArray(result.rows) && result.rows.length > 0) {
      console.table(result.rows)
    }
    const cmd = result.command ?? "OK"
    const rows = result.rowCount ?? 0
    console.log(`[db:sql] ${cmd} ${rows} row(s)`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(
    "[db:sql] failed:",
    err instanceof Error ? err.message : err
  )
  process.exit(1)
})
