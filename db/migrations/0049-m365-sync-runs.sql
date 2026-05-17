-- Background M365 sync runs.
--
-- The old admin "Sync from M365" button ran the entire sync in a
-- single server-action call — fine for a 50-mailbox tenant, but at
-- 100+ users (and thousands post-Gradelink) a force-photo-resync
-- routinely outruns Vercel's 300s function ceiling. We need to chunk
-- the work across function invocations.
--
-- Model: an admin click inserts a row in m365_sync_runs and a row in
-- m365_sync_run_items per M365 user to process. A cron picks up the
-- active run every minute, processes the next batch of items, and
-- bumps progress counters on the run row. The admin polls the run
-- row from the UI. A run is "done" when every item has processed_at
-- set; "partial" if it gets cancelled or hits a fatal error mid-way.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

create table if not exists m365_sync_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  started_by_email text not null,
  started_at timestamptz,
  finished_at timestamptz,
  -- Bumped at the end of every batch. The cron uses this to detect
  -- stalled runs (heartbeat older than ~3 min on a running row =
  -- worker probably died; recoverable on the next tick).
  heartbeat_at timestamptz,

  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),

  force_photo_resync boolean not null default false,

  -- Totals (set after the initial M365 list fetch).
  total_users integer,
  -- Progress counters bumped by each batch.
  processed_users integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  filtered_count integer not null default 0,
  photos_pulled integer not null default 0,
  photos_failed integer not null default 0,
  failed_count integer not null default 0,

  -- Last fatal error if status='failed', or any per-batch error that
  -- the worker captured for surfacing in the UI.
  last_error text
);

-- Index for the cron's "find the next active run" query.
create index if not exists m365_sync_runs_active_idx
  on m365_sync_runs (status, created_at desc)
  where status in ('queued', 'running');

-- One row per M365 user the run intends to process. Created in bulk
-- when the run starts; each batch flips processed_at on a slice.
create table if not exists m365_sync_run_items (
  run_id uuid not null references m365_sync_runs(id) on delete cascade,
  entra_oid text not null,
  email text not null,
  display_name text,
  first_name text,
  last_name text,
  active boolean not null,
  processed_at timestamptz,
  outcome text
    check (outcome is null or outcome in (
      'created', 'updated', 'skipped', 'filtered', 'failed'
    )),
  error_message text,

  primary key (run_id, entra_oid)
);

-- The cron's batch query: WHERE run_id = X AND processed_at IS NULL.
create index if not exists m365_sync_run_items_pending_idx
  on m365_sync_run_items (run_id)
  where processed_at is null;

commit;
