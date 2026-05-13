// Single source of truth for "pull HBA M365 users into the profiles table."
// Used both by the admin "Sync from M365" button and the nightly Vercel cron
// (see app/api/cron/m365-sync/route.ts). Centralizing avoids drift between
// the two call sites and lets the cron return JSON the cron logs.

import { emailFromM365User, listM365Users } from "@/lib/graph"
import { isHbaEmail } from "@/lib/admin"
import { syncProfilesFromM365, type M365SyncRow } from "@/lib/sis"

export type M365SyncOutcome = {
  ok: true
  // Totals from syncProfilesFromM365
  created: number
  updated: number
  skipped: number
  // Filtered = non-HBA tenant guests + entries with no usable email
  filtered: number
}

export type M365SyncFailure = {
  ok: false
  step: "fetch" | "sync"
  message: string
}

export async function runM365Sync(): Promise<M365SyncOutcome | M365SyncFailure> {
  let users
  try {
    users = await listM365Users()
  } catch (error) {
    return {
      ok: false,
      step: "fetch",
      message: error instanceof Error ? error.message : "M365 fetch failed",
    }
  }

  const rows: M365SyncRow[] = []
  let nonHba = 0
  let missingEmail = 0
  for (const user of users) {
    const email = emailFromM365User(user)
    if (!email) {
      missingEmail += 1
      continue
    }
    if (!isHbaEmail(email)) {
      nonHba += 1
      continue
    }
    rows.push({
      email,
      entra_oid: user.id,
      display_name: user.displayName,
      first_name: user.givenName,
      last_name: user.surname,
      active: user.accountEnabled,
    })
  }

  try {
    const result = await syncProfilesFromM365(rows)
    return {
      ok: true,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      filtered: nonHba + missingEmail,
    }
  } catch (error) {
    return {
      ok: false,
      step: "sync",
      message: error instanceof Error ? error.message : "M365 sync failed",
    }
  }
}
