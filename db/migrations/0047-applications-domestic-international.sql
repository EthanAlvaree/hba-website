-- Add a domestic / international flag to applications + students.
--
-- HBA's tuition is set by this status ($28,000 domestic vs $45,580
-- international as of 2026-05) and downstream paperwork differs
-- significantly (F-1 visa support, passport on file, I-20 issuance).
-- Today we infer "international" loosely from address_country, which
-- is brittle (an international student living in a US-based homestay
-- looks domestic by their address). Making it an explicit boolean
-- collected on the application removes the ambiguity.
--
-- Both columns are nullable so pre-existing applications/students
-- don't fail constraints; submit-time validation enforces a value
-- going forward.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

alter table applications
  add column if not exists student_is_international boolean;

alter table students
  add column if not exists is_international boolean;

commit;
