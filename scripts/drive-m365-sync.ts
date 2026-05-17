#!/usr/bin/env tsx
//
// scripts/drive-m365-sync.ts
//
// Emergency local driver for a stuck M365 sync run. Calls
// processM365SyncBatch repeatedly from your machine instead of
// waiting on the Vercel cron. Useful when the cron isn't picking
// up a run (firewall issue, CRON_SECRET mismatch, function failure)
// and you need to drive a sync to completion right now.
//
//   npm run sync:tick               # drive the most-recent active run to done
//   npm run sync:tick -- <run-id>   # drive a specific run id
//
// Idempotent. Stops when the run reaches done/failed/cancelled or
// when no more pending items remain.

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import {
  pickNextM365SyncRun,
  processM365SyncBatch,
} from "@/lib/m365-sync"

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

async function main() {
  loadEnvLocal()
  let runId = process.argv[2] ?? null
  if (!runId) {
    const next = await pickNextM365SyncRun()
    if (!next) {
      console.log("No active run to drive.")
      return
    }
    runId = next
  }
  console.log(`Driving run ${runId}`)

  let pass = 0
  while (true) {
    pass += 1
    const before = Date.now()
    const result = await processM365SyncBatch(runId)
    if (!result) {
      console.log(`  pass ${pass}: run vanished`)
      return
    }
    const elapsed = ((Date.now() - before) / 1000).toFixed(1)
    console.log(
      `  pass ${pass}: processed ${result.processed} in ${elapsed}s · remaining ${result.remaining} · status ${result.status}`
    )
    if (
      result.status === "done" ||
      result.status === "failed" ||
      result.status === "cancelled" ||
      result.remaining === 0
    ) {
      console.log(`Done.`)
      return
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err)
  process.exit(1)
})
