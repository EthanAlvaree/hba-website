-- HBA Phase C — faculty self-edit bios
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: until now faculty bios lived in lib/faculty.ts, a TypeScript
-- file. Every update required a code change. This table lets faculty
-- self-edit their own bio fields from /faculty-portal/teaching.
--
-- Scope: only the *bio-like* fields are in the DB. Slug + image
-- still live in code so URLs stay stable and the carefully-curated
-- portrait images don't get accidentally swapped out. Adding a
-- *new* faculty member who doesn't exist in lib/faculty.ts still
-- requires a code change today; the common case (existing faculty
-- updating their own paragraphs) is now a form.
--
-- Merge: the public /faculty page calls
-- getFacultyMembersWithOverrides() in lib/faculty.ts. The base
-- array comes from the static file; for each member whose
-- profile_id has a faculty_bios row, fields here override the
-- code-side defaults.

begin;

create table if not exists faculty_bios (
  profile_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Override fields (all nullable — null means "use code-side default")
  title text,
  area text,
  hba_start text,            -- free-form, e.g. "June 2007"
  career_start text,         -- free-form, e.g. "2008 in Santiago, Chile"
  courses_taught text[],     -- list of course names taught at HBA
  short_bio text,            -- 1–2 sentence intro (faculty index cards)
  full_bio text              -- multi-paragraph bio (detail page)
);

drop trigger if exists faculty_bios_set_updated_at on faculty_bios;
create trigger faculty_bios_set_updated_at
  before update on faculty_bios
  for each row execute function set_updated_at();

commit;
