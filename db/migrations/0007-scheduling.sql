-- HBA scheduler — Phase 1 (data collection)
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.
--
-- Depends on 0002-sis-core.sql (profiles, courses, terms, students).
--
-- Tables introduced (all in one migration to avoid re-migrations as the
-- scheduler subsystem grows out):
--
--   teacher_qualifications        which courses each faculty member can teach
--   teacher_availability          which periods each faculty member is free
--   teacher_workload_preferences  min/max periods per week per teacher
--   graduation_requirements       credits-per-subject by grade band
--   course_subject_assignments    which subject area each course satisfies
--   student_course_requests       per-term course wishlist (full-time)
--
-- The first three tables drive the solver's TEACHER inputs. The middle two
-- drive the GRADUATION constraint. The last drives STUDENT demand. The
-- solver itself (a separate file in lib/) consumes these tables to produce
-- proposed schedules. Schedule drafts get persisted in a future migration
-- once we know the solver's output shape.

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- teacher_qualifications
-- ---------------------------------------------------------------------------

create table if not exists teacher_qualifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  profile_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,

  -- 1 = most preferred to teach this course, higher = less preferred. The
  -- solver uses this to break ties when multiple teachers can teach the
  -- same course.
  preference_rank integer not null default 1
    check (preference_rank >= 1),

  -- Free-form notes — years of experience, AP certification, etc.
  notes text,

  unique (profile_id, course_id)
);

create index if not exists teacher_qualifications_profile_idx
  on teacher_qualifications(profile_id);
create index if not exists teacher_qualifications_course_idx
  on teacher_qualifications(course_id);

drop trigger if exists teacher_qualifications_updated_at on teacher_qualifications;
create trigger teacher_qualifications_updated_at
before update on teacher_qualifications
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- teacher_availability
-- ---------------------------------------------------------------------------

create table if not exists teacher_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  profile_id uuid not null references profiles(id) on delete cascade,

  -- HBA bell-schedule period names, mirroring the course_sections.period
  -- enum. 'async' lets a teacher mark themselves available for async-online
  -- courses (no fixed meeting time).
  period text not null check (period in (
    'period_1','period_2','period_3','period_4','period_5','period_6',
    'elective_1','elective_2','async'
  )),

  available boolean not null default true,
  notes text,

  unique (profile_id, period)
);

create index if not exists teacher_availability_profile_idx
  on teacher_availability(profile_id);

drop trigger if exists teacher_availability_updated_at on teacher_availability;
create trigger teacher_availability_updated_at
before update on teacher_availability
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- teacher_workload_preferences
-- ---------------------------------------------------------------------------

create table if not exists teacher_workload_preferences (
  -- 1:1 with profile.
  profile_id uuid primary key references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A "period" here means one of the 8 weekly periods. Some teachers want
  -- a lighter load: "Alan Saltamachio only wants to teach 2 or 3 periods
  -- a day at most." We capture that with a per-week ceiling. Solver
  -- treats null as "no limit".
  min_periods_per_week integer
    check (min_periods_per_week is null or min_periods_per_week >= 0),
  max_periods_per_week integer
    check (max_periods_per_week is null or max_periods_per_week >= 0),

  -- Optional: cap consecutive periods. A teacher who really doesn't want
  -- 4 periods in a row can set this to 3.
  max_consecutive_periods integer
    check (max_consecutive_periods is null or max_consecutive_periods >= 1),

  notes text
);

drop trigger if exists teacher_workload_preferences_updated_at on teacher_workload_preferences;
create trigger teacher_workload_preferences_updated_at
before update on teacher_workload_preferences
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- graduation_requirements
-- ---------------------------------------------------------------------------

create table if not exists graduation_requirements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- "English 9-12", "4 years of math", "PE / wellness", etc.
  name text not null,

  -- Required subject area. Courses are tagged with their subject area in
  -- course_subject_assignments below. The standard HBA list is English,
  -- Math, Science, Social Studies, Foreign Language, Arts, PE, Elective.
  subject_area text not null,

  -- Total credits needed in this subject area to graduate.
  required_credits numeric(4,2) not null default 0
    check (required_credits >= 0),

  -- Which grade levels this requirement applies to. Used to vary rules by
  -- graduation track (e.g. "class of 2027 needs 4 years of math; class of
  -- 2028 needs 3"). Empty array means applies to all.
  applies_to_grade_levels text[] not null default '{}',

  notes text
);

create index if not exists graduation_requirements_subject_idx
  on graduation_requirements(subject_area);

drop trigger if exists graduation_requirements_updated_at on graduation_requirements;
create trigger graduation_requirements_updated_at
before update on graduation_requirements
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- course_subject_assignments
-- ---------------------------------------------------------------------------

-- Tags each course with a subject area for graduation-requirement matching.
-- A course can satisfy at most one subject area; if you need a course to
-- count for multiple, create a second row in graduation_requirements that
-- shares the same subject_area.
create table if not exists course_subject_assignments (
  course_id uuid primary key references courses(id) on delete cascade,
  subject_area text not null,
  updated_at timestamptz not null default now()
);

create index if not exists course_subject_assignments_subject_idx
  on course_subject_assignments(subject_area);

drop trigger if exists course_subject_assignments_updated_at on course_subject_assignments;
create trigger course_subject_assignments_updated_at
before update on course_subject_assignments
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- student_course_requests
-- ---------------------------------------------------------------------------

create table if not exists student_course_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,

  -- 'core' = one of the 6 required course slots; 'elective' = one of the
  -- 2 elective slots; 'alternate' = a backup the student would accept if
  -- their first choice is full or can't be scheduled.
  kind text not null
    check (kind in ('core','elective','alternate')),

  -- 1 = first choice, higher = less preferred. Solver gives big positive
  -- score for matching low-rank (preferred) requests.
  preference_rank integer not null default 1
    check (preference_rank >= 1),

  notes text,
  submitted_at timestamptz,

  unique (student_id, term_id, course_id)
);

create index if not exists student_course_requests_student_idx
  on student_course_requests(student_id);
create index if not exists student_course_requests_term_idx
  on student_course_requests(term_id);
create index if not exists student_course_requests_course_idx
  on student_course_requests(course_id);

drop trigger if exists student_course_requests_updated_at on student_course_requests;
create trigger student_course_requests_updated_at
before update on student_course_requests
for each row
execute function set_updated_at();

commit;
