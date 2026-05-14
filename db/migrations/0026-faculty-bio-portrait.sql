-- HBA Phase C — faculty self-uploaded portrait
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: the existing public /faculty pages render a rectangular
-- portrait from a code-side image path (lib/faculty.ts). This
-- column lets faculty (or admins on their behalf) upload a new
-- portrait through /faculty-portal/teaching without a code change.
-- The path is a storage key in the existing profile-photos bucket,
-- using a `portrait-` filename prefix to distinguish from the round
-- avatar already stored there. Falls back to the code-side path
-- when null.

begin;

alter table faculty_bios
  add column if not exists public_photo_path text;

commit;