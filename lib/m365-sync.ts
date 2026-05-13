// Single source of truth for "pull HBA M365 users into the profiles table."
// Used both by the admin "Sync from M365" button and the nightly Vercel cron
// (see app/api/cron/m365-sync/route.ts). Centralizing avoids drift between
// the two call sites and lets the cron return JSON the cron logs.

import { emailFromM365User, fetchM365UserPhoto, listM365Users } from "@/lib/graph"
import { isHbaEmail } from "@/lib/admin"
import { setProfilePhotoFromBuffer } from "@/lib/profile-photos"
import {
  getProfileByEmail,
  syncProfilesFromM365,
  type M365SyncRow,
} from "@/lib/sis"

export type M365SyncOutcome = {
  ok: true
  // Totals from syncProfilesFromM365
  created: number
  updated: number
  skipped: number
  // Filtered = non-HBA tenant guests + entries with no usable email
  filtered: number
  // Photo pull: number of profiles that gained a photo this run.
  photos_pulled: number
  photos_failed: number
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

  let result
  try {
    result = await syncProfilesFromM365(rows)
  } catch (error) {
    return {
      ok: false,
      step: "sync",
      message: error instanceof Error ? error.message : "M365 sync failed",
    }
  }

  // ---- Photo pull (M365 → SIS, one-way, additive only) ----
  //
  // For each synced row whose profile currently has no photo, try to
  // pull their Graph profile picture. Most staff never set one and
  // most students don't either, so Graph 404s a lot — that's fine;
  // we just skip those. We never overwrite an existing photo: if an
  // admin uploaded a manual one, that's the canonical version.
  //
  // Photo pull failures are logged but never fail the overall sync —
  // the directory sync itself is the higher-priority outcome.
  let photosPulled = 0
  let photosFailed = 0
  for (const row of rows) {
    try {
      const profile = await getProfileByEmail(row.email)
      if (!profile) continue
      if (profile.photo_path) continue // never overwrite a manual upload

      const photo = await fetchM365UserPhoto(row.email)
      if (!photo) continue

      const setResult = await setProfilePhotoFromBuffer(
        profile.id,
        photo.buffer,
        photo.contentType
      )
      if (setResult.ok) {
        photosPulled += 1
      } else {
        photosFailed += 1
        console.error(`Photo set failed for ${row.email}: ${setResult.error}`)
      }
    } catch (error) {
      photosFailed += 1
      console.error(`Photo pull failed for ${row.email}:`, error)
    }
  }

  return {
    ok: true,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    filtered: nonHba + missingEmail,
    photos_pulled: photosPulled,
    photos_failed: photosFailed,
  }
}
