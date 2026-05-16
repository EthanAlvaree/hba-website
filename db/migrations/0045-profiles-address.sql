-- Add a mailing address to profiles.
--
-- Why on profiles and not on parent_links: a parent of two HBA students
-- has one address, not two. Storing on parent_links would force the
-- admin to keep them in sync; profile is the natural home. Faculty +
-- alumni can use the same columns for tax-form mailing later.
--
-- Why not a separate addresses table: we never need >1 address per
-- profile in practice, and a 1:1 join just adds query surface.
--
-- All columns are optional — pre-existing profiles stay empty.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

alter table profiles
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists address_city text,
  add column if not exists address_region text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text;

commit;
