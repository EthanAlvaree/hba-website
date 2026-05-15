-- HBA Phase C — student tags
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: the office wants to track free-form tags on students
-- (interests, sports, scholarship status, ESL, IEP, etc.) without
-- bloating the students table with bespoke columns. Tags are
-- searchable and filterable in the admin directory; a future
-- mass-email cohort could target a tag.
--
-- Shape: one row per (student, tag). PK on the pair so the same
-- tag can't be added to the same student twice. Tags are
-- lowercased on write so "Soccer" and "soccer" don't both exist.

begin;

create table if not exists student_tags (
  student_id uuid not null references students(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  created_by_email text,
  primary key (student_id, tag),
  constraint student_tags_tag_check check (length(tag) between 1 and 80)
);

-- Tag index for the directory filter ("show every student tagged X").
create index if not exists student_tags_tag_idx on student_tags (tag);

commit;
