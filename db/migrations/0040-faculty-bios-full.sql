-- Phase 3: make faculty_bios the full record, not just an override layer.
--
-- How to apply: handled by the migration runner (`npm run db:migrate`).
--
-- 0024 created faculty_bios as a per-profile *override* on top of the
-- hardcoded list in lib/faculty.ts — slug, name, and portrait stayed in
-- code, so a new hire still needed a code change. This adds the identity
-- columns so the table can stand on its own; 0041 seeds the 14 existing
-- faculty, and lib/faculty.ts becomes a thin DB reader.
--
-- slug + name are nullable on purpose: the faculty self-edit form
-- (saveBioAction) upserts only the bio fields, so a row can briefly
-- exist without identity columns. The public /faculty pages only render
-- rows that have a slug.

begin;

alter table faculty_bios add column if not exists slug text;
alter table faculty_bios add column if not exists name text;
alter table faculty_bios add column if not exists image text;          -- /public portrait path; public_photo_path (uploads) wins over it
alter table faculty_bios add column if not exists display_order int;
alter table faculty_bios
  add column if not exists is_leadership boolean not null default false;

-- Unique slug for /faculty/<slug>. Nullable — Postgres allows multiple
-- NULLs in a unique index, so unpublished rows don't collide.
create unique index if not exists faculty_bios_slug_key
  on faculty_bios(slug);

commit;
