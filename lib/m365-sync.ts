// Background M365 → SIS sync, broken into batches so it survives
// Vercel's 300s function ceiling at our growing tenant size (100+ now,
// thousands post-Gradelink).
//
// Flow:
//   1. startM365Sync() — admin click. Lists every M365 user via Graph,
//      filters to HBA, writes a m365_sync_runs row + one
//      m365_sync_run_items row per user. Returns the run id; the cron
//      and the UI take over from there.
//   2. processM365SyncBatch(runId) — called by the cron every minute
//      AND by the start endpoint itself (for instant first-batch
//      progress). Grabs the next BATCH_SIZE pending items, runs each
//      through the existing per-user upsert + optional photo pull,
//      bumps run counters. Returns whether the run is finished.
//   3. The cron loops back every minute until status flips to 'done'.
//
// Idempotency: each item's outcome is captured on the item row, so
// re-running a stalled batch is safe — the next call just sees fewer
// pending items.
//
// The old single-call runM365Sync() used by the nightly cron is gone;
// the cron now uses startM365Sync + processM365SyncBatch like the
// admin path. One code path, fewer surprises.

import "server-only"
import { emailFromM365User, fetchM365UserPhoto, listM365Users } from "@/lib/graph"
import { isHbaEmail } from "@/lib/admin"
import { setProfilePhotoFromBuffer } from "@/lib/profile-photos"
import {
  getProfileByEmail,
  syncProfilesFromM365,
  type M365SyncRow,
} from "@/lib/sis"
import { getServiceSupabase } from "@/lib/supabase-server"

// Each batch sized to comfortably fit inside Vercel's 300s function
// budget even on slow Graph photo pulls (~1-2s per pull). 25 users +
// photo resync ≈ 60-90s in the worst case, well under the ceiling.
// Without photo resync, the batch flies through in a few seconds.
const BATCH_SIZE = 25

// If the heartbeat is older than this AND the row still says
// 'running', the worker probably died (timeout, crash). The cron
// picks it back up on its next tick.
const HEARTBEAT_STALE_MS = 3 * 60 * 1000

export type M365SyncRunRow = {
  id: string
  created_at: string
  started_by_email: string
  started_at: string | null
  finished_at: string | null
  heartbeat_at: string | null
  status: "queued" | "running" | "done" | "failed" | "cancelled"
  force_photo_resync: boolean
  total_users: number | null
  processed_users: number
  created_count: number
  updated_count: number
  skipped_count: number
  filtered_count: number
  photos_pulled: number
  photos_failed: number
  failed_count: number
  last_error: string | null
}

const RUN_COLUMNS =
  "id, created_at, started_by_email, started_at, finished_at, heartbeat_at, " +
  "status, force_photo_resync, total_users, processed_users, " +
  "created_count, updated_count, skipped_count, filtered_count, " +
  "photos_pulled, photos_failed, failed_count, last_error"

// ============================================================================
// Start a new run (admin click)
// ============================================================================

export type StartM365SyncInput = {
  startedByEmail: string
  forcePhotoResync?: boolean
}

export type StartM365SyncResult =
  | { ok: true; runId: string; totalUsers: number; filteredCount: number }
  | { ok: false; error: string }

export async function startM365Sync(
  input: StartM365SyncInput
): Promise<StartM365SyncResult> {
  const supabase = getServiceSupabase()

  // Refuse to start a second sync if one's already active — concurrent
  // syncs would race each other writing the same profile rows. Admin
  // can cancel the active run first if they need to retry.
  const { data: active } = await supabase
    .from("m365_sync_runs")
    .select("id")
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle<{ id: string }>()
  if (active) {
    return {
      ok: false,
      error: `A sync is already running (${active.id}). Wait for it to finish or cancel it first.`,
    }
  }

  let users
  try {
    users = await listM365Users()
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to list M365 users.",
    }
  }

  // Filter to HBA-domain users with a usable email — same logic the
  // old single-call sync used. Filtered count surfaces in the UI so
  // admin knows we're not silently dropping people.
  type PendingItem = {
    entra_oid: string
    email: string
    display_name: string | null
    first_name: string | null
    last_name: string | null
    active: boolean
  }
  const items: PendingItem[] = []
  let filtered = 0
  for (const user of users) {
    const email = emailFromM365User(user)
    if (!email || !isHbaEmail(email)) {
      filtered += 1
      continue
    }
    items.push({
      entra_oid: user.id,
      email,
      display_name: user.displayName,
      first_name: user.givenName,
      last_name: user.surname,
      active: user.accountEnabled,
    })
  }

  // Create the run row. Status starts as 'queued'; the first batch
  // flips it to 'running' when it starts work.
  const { data: run, error: runErr } = await supabase
    .from("m365_sync_runs")
    .insert({
      started_by_email: input.startedByEmail,
      force_photo_resync: input.forcePhotoResync ?? false,
      status: "queued",
      total_users: items.length,
      filtered_count: filtered,
    })
    .select("id")
    .single<{ id: string }>()
  if (runErr || !run) {
    return {
      ok: false,
      error: `Failed to create sync run: ${runErr?.message ?? "unknown"}`,
    }
  }

  // Bulk-insert the items. PostgREST handles arrays; if Supabase
  // chokes on a few thousand rows in one insert we chunk.
  if (items.length > 0) {
    const rows = items.map((item) => ({ run_id: run.id, ...item }))
    const INSERT_CHUNK = 500
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const chunk = rows.slice(i, i + INSERT_CHUNK)
      const { error: itemErr } = await supabase
        .from("m365_sync_run_items")
        .insert(chunk)
      if (itemErr) {
        // Roll back the run row so we don't leave a half-initialised
        // sync sitting in 'queued' state forever.
        await supabase.from("m365_sync_runs").delete().eq("id", run.id)
        return {
          ok: false,
          error: `Failed to enqueue sync items: ${itemErr.message}`,
        }
      }
    }
  } else {
    // Zero items to process — mark done immediately so the UI doesn't
    // sit at 0/0 spinning.
    await supabase
      .from("m365_sync_runs")
      .update({
        status: "done",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", run.id)
  }

  return {
    ok: true,
    runId: run.id,
    totalUsers: items.length,
    filteredCount: filtered,
  }
}

// ============================================================================
// Process one batch of an active run (called by cron + by start endpoint)
// ============================================================================

export type ProcessBatchResult = {
  runId: string
  processed: number
  remaining: number
  status: M365SyncRunRow["status"]
}

/** Process the next BATCH_SIZE pending items on this run. Bumps
 *  heartbeat + counters. Returns the run's new status. */
export async function processM365SyncBatch(
  runId: string
): Promise<ProcessBatchResult | null> {
  const supabase = getServiceSupabase()

  const { data: run, error: runErr } = await supabase
    .from("m365_sync_runs")
    .select(RUN_COLUMNS)
    .eq("id", runId)
    .maybeSingle<M365SyncRunRow>()
  if (runErr || !run) return null
  if (run.status === "done" || run.status === "failed" || run.status === "cancelled") {
    return {
      runId,
      processed: 0,
      remaining: 0,
      status: run.status,
    }
  }

  // Flip queued → running on the first batch so the UI shows movement.
  const nowIso = new Date().toISOString()
  if (run.status === "queued") {
    await supabase
      .from("m365_sync_runs")
      .update({ status: "running", started_at: nowIso, heartbeat_at: nowIso })
      .eq("id", runId)
  } else {
    await supabase
      .from("m365_sync_runs")
      .update({ heartbeat_at: nowIso })
      .eq("id", runId)
  }

  // Pull the next slice of pending items. ORDER BY entra_oid for a
  // stable, repeatable iteration order (no skipped items if a batch
  // dies partway through).
  type Item = {
    entra_oid: string
    email: string
    display_name: string | null
    first_name: string | null
    last_name: string | null
    active: boolean
  }
  const { data: items, error: itemsErr } = await supabase
    .from("m365_sync_run_items")
    .select("entra_oid, email, display_name, first_name, last_name, active")
    .eq("run_id", runId)
    .is("processed_at", null)
    .order("entra_oid", { ascending: true })
    .limit(BATCH_SIZE)
    .returns<Item[]>()
  if (itemsErr) {
    await supabase
      .from("m365_sync_runs")
      .update({
        status: "failed",
        last_error: itemsErr.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId)
    return { runId, processed: 0, remaining: 0, status: "failed" }
  }

  let createdDelta = 0
  let updatedDelta = 0
  let skippedDelta = 0
  let failedDelta = 0
  let photosPulledDelta = 0
  let photosFailedDelta = 0

  for (const item of items ?? []) {
    const syncRow: M365SyncRow = {
      email: item.email,
      entra_oid: item.entra_oid,
      display_name: item.display_name,
      first_name: item.first_name,
      last_name: item.last_name,
      active: item.active,
    }

    let outcome: "created" | "updated" | "skipped" | "failed" = "skipped"
    let errorMessage: string | null = null
    try {
      const result = await syncProfilesFromM365([syncRow])
      if (result.created > 0) {
        outcome = "created"
        createdDelta += 1
      } else if (result.updated > 0) {
        outcome = "updated"
        updatedDelta += 1
      } else {
        outcome = "skipped"
        skippedDelta += 1
      }
    } catch (error) {
      outcome = "failed"
      failedDelta += 1
      errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`m365 sync ${runId}: item ${item.email} failed:`, errorMessage)
    }

    // Photo pull — same conditions as the old single-call sync:
    // skip when the profile already has a photo, unless this run is
    // a force-resync.
    if (outcome !== "failed") {
      try {
        const profile = await getProfileByEmail(item.email)
        if (profile && (!profile.photo_path || run.force_photo_resync)) {
          const photo = await fetchM365UserPhoto(item.email)
          if (photo) {
            const setRes = await setProfilePhotoFromBuffer(
              profile.id,
              photo.buffer,
              photo.contentType
            )
            if (setRes.ok) photosPulledDelta += 1
            else {
              photosFailedDelta += 1
              console.error(
                `m365 sync ${runId}: photo set failed for ${item.email}: ${setRes.error}`
              )
            }
          }
        }
      } catch (error) {
        photosFailedDelta += 1
        console.error(`m365 sync ${runId}: photo pull failed for ${item.email}:`, error)
      }
    }

    await supabase
      .from("m365_sync_run_items")
      .update({
        processed_at: new Date().toISOString(),
        outcome,
        error_message: errorMessage,
      })
      .eq("run_id", runId)
      .eq("entra_oid", item.entra_oid)
  }

  // Bump run-level counters. Re-read remaining count so we know
  // whether to mark done. Read-then-write is fine here because the
  // cron picks only one run at a time (the active-run guard in
  // pickNextM365SyncRun keeps us from racing ourselves).
  const { count: remainingCount } = await supabase
    .from("m365_sync_run_items")
    .select("entra_oid", { count: "exact", head: true })
    .eq("run_id", runId)
    .is("processed_at", null)

  const finished = (remainingCount ?? 0) === 0

  const { data: current } = await supabase
    .from("m365_sync_runs")
    .select(
      "processed_users, created_count, updated_count, skipped_count, " +
        "failed_count, photos_pulled, photos_failed"
    )
    .eq("id", runId)
    .single<{
      processed_users: number
      created_count: number
      updated_count: number
      skipped_count: number
      failed_count: number
      photos_pulled: number
      photos_failed: number
    }>()
  if (current) {
    await supabase
      .from("m365_sync_runs")
      .update({
        processed_users: current.processed_users + (items?.length ?? 0),
        created_count: current.created_count + createdDelta,
        updated_count: current.updated_count + updatedDelta,
        skipped_count: current.skipped_count + skippedDelta,
        failed_count: current.failed_count + failedDelta,
        photos_pulled: current.photos_pulled + photosPulledDelta,
        photos_failed: current.photos_failed + photosFailedDelta,
        ...(finished
          ? { status: "done" as const, finished_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", runId)
  }

  return {
    runId,
    processed: items?.length ?? 0,
    remaining: remainingCount ?? 0,
    status: finished ? "done" : "running",
  }
}

// ============================================================================
// Cron-side helpers
// ============================================================================

/** Find the most recent run that needs more work. Returns null if no
 *  active run, OR if the active run looks healthy (heartbeat recent —
 *  another worker is on it). Use HEARTBEAT_STALE_MS to detect dead
 *  workers; a fresh heartbeat means leave it alone. */
export async function pickNextM365SyncRun(): Promise<string | null> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("m365_sync_runs")
    .select("id, status, heartbeat_at")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{
      id: string
      status: string
      heartbeat_at: string | null
    }>()
  if (!data) return null

  // 'queued' is always pickable. 'running' is only pickable if the
  // last heartbeat is old enough that the worker probably died.
  if (data.status === "queued") return data.id
  if (!data.heartbeat_at) return data.id
  const age = Date.now() - new Date(data.heartbeat_at).getTime()
  if (age > HEARTBEAT_STALE_MS) return data.id
  return null
}

// ============================================================================
// Reads (used by API + UI)
// ============================================================================

export async function getM365SyncRun(runId: string): Promise<M365SyncRunRow | null> {
  const { data } = await getServiceSupabase()
    .from("m365_sync_runs")
    .select(RUN_COLUMNS)
    .eq("id", runId)
    .maybeSingle<M365SyncRunRow>()
  return data
}

export async function listRecentM365SyncRuns(
  limit = 10
): Promise<M365SyncRunRow[]> {
  const { data } = await getServiceSupabase()
    .from("m365_sync_runs")
    .select(RUN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<M365SyncRunRow[]>()
  return data ?? []
}

export async function cancelM365SyncRun(runId: string): Promise<void> {
  await getServiceSupabase()
    .from("m365_sync_runs")
    .update({
      status: "cancelled",
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .in("status", ["queued", "running"])
}
