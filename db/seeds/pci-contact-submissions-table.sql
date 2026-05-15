-- Create contact_submissions on PCI's DB
--
-- Why this is here and not in db/migrations/:
--   HBA's contact_submissions table predates the migration runner —
--   it was applied by hand before db/migrations/ existed. The 0001
--   baseline shortcut records 0001 as applied without re-running it,
--   so a fresh deploy like PCI ends up missing the table even though
--   schema_migrations claims everything through 0038 is applied.
--
--   Adding a CREATE TABLE migration now would re-fire on HBA via the
--   normal flow and conflict with the existing table. Keeping it as a
--   one-off seed (idempotent via IF NOT EXISTS) lets PCI catch up
--   without disturbing HBA.
--
-- Run against PCI's DB:
--   npm run db:sql -- --school=pci db/seeds/pci-contact-submissions-table.sql
--
-- Schema mirrors HBA's table column-for-column (verified via
-- information_schema). All non-PK/timestamp columns nullable to match.

begin;

create table if not exists contact_submissions (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  name             text,
  email            text,
  phone            text,
  student_name     text,
  message          text,
  schedule_tour    boolean,
  how_did_you_hear text,
  status           text,
  assigned_to      text,
  notes            text,
  source           text,
  spam_provider    text,
  spam_verified    boolean,
  archived_at      timestamptz
);

-- Useful read indexes for the admin dashboard.
create index if not exists contact_submissions_created_at_idx
  on contact_submissions (created_at desc);
create index if not exists contact_submissions_status_idx
  on contact_submissions (status)
  where archived_at is null;

commit;
