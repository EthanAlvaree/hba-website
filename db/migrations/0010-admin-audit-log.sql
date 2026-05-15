-- HBA Phase C — admin audit log
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent via
-- `create table if not exists` + `create index if not exists`.
--
-- Why: until now, sensitive admin actions (promote/demote admin, delete
-- profile, lock term, commit draft schedule, bulk-import parent links)
-- left no trace beyond a row mutation. This table records who-did-what-
-- when so the office can answer "who locked the spring term?" and
-- forensically reconstruct mistakes.
--
-- actor_email is the source of truth — we keep it as text instead of a
-- foreign key so deleting an admin's profile doesn't lose their history.
-- actor_profile_id is a convenience FK that nulls on delete.

begin;

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identity of the admin who took the action. Email is canonical; the
  -- profile_id may not exist if the actor is no longer in the DB.
  actor_email text not null,
  actor_profile_id uuid references profiles(id) on delete set null,

  -- Category of action — see lib/audit.ts for the list of constants
  -- the codebase emits. Free-form text so new event types don't need a
  -- migration.
  action text not null,

  -- What kind of target was acted on (e.g. "profile", "term", "section",
  -- "schedule_draft", "parent_link", "parent_links_import"). target_id
  -- is the row's UUID when relevant; both are nullable for "global"
  -- actions that don't have a single target.
  target_kind text,
  target_id text,

  -- Structured detail. Captures inputs (e.g. {make_admin: "yes"}) and
  -- outputs (e.g. {links_created: 12}) so a single audit row is
  -- self-explanatory.
  details jsonb,

  -- Network metadata. Optional — populated when the caller can resolve it.
  ip text,
  user_agent text
);

-- Latest-first browse is the dominant query, so index created_at desc.
create index if not exists admin_audit_log_created_at_idx
  on admin_audit_log (created_at desc);

-- Filters: by action category, by actor, and by (target_kind, target_id)
-- for "show me everything that happened to this profile/term/etc."
create index if not exists admin_audit_log_action_idx
  on admin_audit_log (action);
create index if not exists admin_audit_log_actor_email_idx
  on admin_audit_log (actor_email);
create index if not exists admin_audit_log_target_idx
  on admin_audit_log (target_kind, target_id);

commit;
