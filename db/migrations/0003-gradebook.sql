-- HBA Phase B (gradebook) schema
--
-- How to apply: paste this whole file into the Supabase project's SQL editor
-- and run it once. Idempotent guards mean re-running is a no-op.
--
-- Depends on 0002-sis-core.sql (references course_sections.id, enrollments.id).
--
-- Tables introduced:
--   assignment_categories  Grading-scheme buckets per section (Homework, Test,
--                          Quiz, Project, Participation, ...). Each category
--                          carries a weight; the section's category weights
--                          sum to 100 in the UI (the DB doesn't enforce this).
--   assignments            One row per teacher-created assignment in a section.
--                          Title, dates, point total, optional category, and
--                          a draft/published flag so teachers can stage work
--                          before students see it.
--   scores                 One row per (enrollment, assignment). Carries the
--                          numeric score OR a categorical kind (excused /
--                          incomplete / missing / not_counted) — matching the
--                          data model's "numeric, excused, incomplete, blank
--                          doesn't count" vocabulary.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- assignment_categories
-- ---------------------------------------------------------------------------

create table if not exists assignment_categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  section_id uuid not null references course_sections(id) on delete cascade,

  name text not null,                       -- "Homework", "Tests", etc.

  -- Weight as a percentage of the section's final grade. Teachers can set
  -- weights that don't sum to 100; the gradebook UI flags it.
  weight numeric(5,2) not null default 0
    check (weight >= 0 and weight <= 100),

  -- Drop the N lowest scores in this category from the final calculation.
  -- Null means don't drop anything.
  drop_lowest_count integer check (drop_lowest_count is null or drop_lowest_count >= 0),

  -- Display order within the section's gradebook setup.
  sort_order integer not null default 0,

  -- Within a section, category names should be unique so the teacher can
  -- pick them unambiguously from a dropdown.
  unique (section_id, name)
);

create index if not exists assignment_categories_section_idx
  on assignment_categories(section_id);

drop trigger if exists assignment_categories_updated_at on assignment_categories;
create trigger assignment_categories_updated_at
before update on assignment_categories
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- assignments
-- ---------------------------------------------------------------------------

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  section_id uuid not null references course_sections(id) on delete cascade,

  -- Category is optional so a teacher can sketch an assignment before deciding
  -- which bucket it belongs to. on delete set null so deleting a category
  -- doesn't destroy the assignments under it.
  category_id uuid references assignment_categories(id) on delete set null,

  title text not null,
  description text,

  assigned_date date,
  due_date date,

  points_possible numeric(8,2) not null default 0
    check (points_possible >= 0),

  -- Draft assignments are visible to teachers and admins but hidden from
  -- students/parents on portal views. Default false so a teacher's
  -- in-progress assignment doesn't leak.
  is_published boolean not null default false,

  -- When the gradebook needs to support extra-credit assignments that don't
  -- count against the points_possible total, flip this.
  is_extra_credit boolean not null default false
);

create index if not exists assignments_section_idx on assignments(section_id);
create index if not exists assignments_category_idx
  on assignments(category_id)
  where category_id is not null;
create index if not exists assignments_due_date_idx
  on assignments(due_date)
  where due_date is not null;

drop trigger if exists assignments_updated_at on assignments;
create trigger assignments_updated_at
before update on assignments
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- scores
-- ---------------------------------------------------------------------------

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  enrollment_id uuid not null references enrollments(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,

  -- Mirrors the data model's score vocabulary:
  --   numeric       points_earned holds the actual score
  --   excused       Doesn't count for or against; counted as "excluded"
  --   incomplete    Teacher hasn't graded it yet (or student needs more time)
  --   missing       Student didn't turn it in. Counts as 0.
  --   not_counted   "Blank — doesn't count": stored intentionally as a non-grade
  kind text not null default 'numeric'
    check (kind in ('numeric','excused','incomplete','missing','not_counted')),

  -- Required when kind='numeric'; null otherwise. The application layer
  -- enforces this — keeping the DB constraint loose to allow stored partial
  -- scores even on non-numeric kinds (e.g. "excused, but it would have been
  -- 92 if we had to count it" notes).
  points_earned numeric(8,2)
    check (points_earned is null or points_earned >= 0),

  submitted_at timestamptz,
  graded_at timestamptz,

  feedback text,

  -- One row per (enrollment, assignment). Re-grading updates in place.
  unique (enrollment_id, assignment_id)
);

create index if not exists scores_enrollment_idx on scores(enrollment_id);
create index if not exists scores_assignment_idx on scores(assignment_id);

drop trigger if exists scores_updated_at on scores;
create trigger scores_updated_at
before update on scores
for each row
execute function set_updated_at();

commit;
