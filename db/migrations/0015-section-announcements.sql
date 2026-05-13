-- HBA Phase C — class announcements
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: a teacher needs a place to post short class messages (test moved
-- to Friday, no reading tonight, project rubric attached). Students see
-- them on their section detail page; parents see them on the kid's
-- section card. Different from email digests (auto-generated) — this is
-- the teacher's direct voice to the class.

begin;

create table if not exists section_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  section_id uuid not null references course_sections(id) on delete cascade,

  -- Author. Email is canonical for the same reason as the audit log:
  -- works even if the profile is deleted later.
  author_email text not null,
  author_profile_id uuid references profiles(id) on delete set null,

  title text not null,
  body text not null,
  -- Optional pin to the top of the section feed.
  pinned boolean not null default false
);

create index if not exists section_announcements_section_idx
  on section_announcements (section_id, created_at desc);

create or replace function section_announcements_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists section_announcements_set_updated_at_trg on section_announcements;
create trigger section_announcements_set_updated_at_trg
  before update on section_announcements
  for each row execute function section_announcements_set_updated_at();

commit;
