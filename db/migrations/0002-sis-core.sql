-- HBA Phase B (SIS core) schema
--
-- How to apply: paste this whole file into the Supabase project's SQL editor
-- and run it once. Idempotent guards mean re-running is a no-op.
--
-- Depends on 0001-applications.sql (references applications.id).
--
-- Tables introduced:
--   profiles          One row per person (student/parent/faculty/admin).
--                     Keyed by lowercase email; entra_oid attaches on first
--                     Microsoft Entra sign-in. Roles is a constrained text[].
--   students          Student-specific demographics + enrollment state.
--                     1:1 with profiles; optional back-link to applications.
--   parent_links      Many-to-many between students and parent profiles, with
--                     relationship type, primary/homestay flags, and portal
--                     permissions.
--   terms             Academic terms (Fall 2025, Spring 2026, Summer 2026, ...).
--   courses           Catalog entries — the abstract course, not a section.
--   course_sections   A course offered in a specific term, with teacher,
--                     bell-schedule period, room, modality, and capacity.
--   enrollments       A student in a section, with lifecycle status and the
--                     final grade snapshot for transcript convenience.

begin;

create extension if not exists "pgcrypto";

-- Shared updated_at trigger for all Phase B tables.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Microsoft Entra object ID; populated on first sign-in. Null for profiles
  -- created by admin before the person has authenticated (e.g. a newly
  -- enrolled student whose HBA M365 account is still being provisioned).
  entra_oid text unique,

  -- Canonical login email, lowercased. HBA email for students/faculty/admins
  -- once provisioned; personal email for parents.
  email text not null unique check (email = lower(email)),

  first_name text,
  middle_name text,
  last_name text,
  display_name text,

  -- Constrained role set. A person may hold multiple roles (e.g. a faculty
  -- member who is also a parent).
  roles text[] not null default '{}'
    check (roles <@ array['student','parent','faculty','admin']::text[]),

  -- Secondary contact info (mainly for parents who sign in with a personal
  -- email but list a different phone, or for emergency contact display).
  personal_email text,
  mobile_phone text,
  work_phone text,

  active boolean not null default true
);

create index if not exists profiles_roles_gin_idx on profiles using gin (roles);
create index if not exists profiles_active_idx on profiles(active) where active;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
before update on profiles
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One profile = at most one student record.
  profile_id uuid not null unique references profiles(id) on delete restrict,

  -- Back-link to the application that led to this student. on delete set null
  -- so archiving an application does not destroy the student record.
  application_id uuid references applications(id) on delete set null,

  -- Legal name (may differ from profile.display_name / preferred name).
  legal_first_name text not null,
  legal_middle_name text,
  legal_last_name text not null,
  suffix text,
  preferred_name text,

  -- Demographics
  dob date,
  gender text,
  pronouns text,
  birthplace text,
  primary_language text,
  secondary_language text,
  english_proficiency text,

  -- Residence
  address_line1 text,
  address_line2 text,
  address_city text,
  address_region text,
  address_postal_code text,
  address_country text,

  -- Enrollment classification (mirrors applications.enrollment_type vocabulary)
  enrollment_type text
    check (
      enrollment_type is null
      or enrollment_type in ('summer','part_time','full_time')
    ),

  current_grade text,

  status text not null default 'active'
    check (status in ('active','graduated','withdrawn')),

  -- Official start at HBA — set when admin completes the conversion from
  -- accepted application to enrolled student.
  registered_at_hba date,
  graduated_at date,
  withdrawn_at date,

  -- Admin-only
  internal_notes text,
  assigned_to text  -- admin email
);

create index if not exists students_status_idx on students(status);
create index if not exists students_enrollment_type_idx on students(enrollment_type);
create index if not exists students_application_id_idx
  on students(application_id)
  where application_id is not null;
create index if not exists students_current_grade_idx on students(current_grade);

drop trigger if exists students_updated_at on students;
create trigger students_updated_at
before update on students
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- parent_links
-- ---------------------------------------------------------------------------

create table if not exists parent_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,
  parent_profile_id uuid not null references profiles(id) on delete restrict,

  -- Free-text label from the family ("Mother", "Father", "Guardian", "Aunt").
  relationship text,

  -- Phase 1 intake captures Guardian 1 (required) and optional Guardian 2
  -- plus an optional Homestay contact. Map them with these flags.
  is_primary boolean not null default false,
  is_homestay boolean not null default false,
  is_emergency_contact boolean not null default true,

  -- Portal permissions (parents see grades/attendance by default; admin can
  -- revoke for split-custody situations).
  can_view_grades boolean not null default true,
  can_view_attendance boolean not null default true,
  can_receive_communications boolean not null default true,

  unique (student_id, parent_profile_id)
);

create index if not exists parent_links_student_idx on parent_links(student_id);
create index if not exists parent_links_parent_idx on parent_links(parent_profile_id);

drop trigger if exists parent_links_updated_at on parent_links;
create trigger parent_links_updated_at
before update on parent_links
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- terms
-- ---------------------------------------------------------------------------

create table if not exists terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,             -- e.g. "Fall 2025"
  slug text not null unique,      -- e.g. "fall-2025"

  kind text not null check (kind in ('fall','spring','summer')),
  academic_year text not null,    -- e.g. "2025-2026"

  start_date date not null,
  end_date date not null,

  -- Exactly-one-current is enforced by a partial unique index below.
  is_current boolean not null default false,

  -- When true, gradebook entries for sections in this term are read-only.
  is_grades_locked boolean not null default false,

  constraint terms_dates_check check (start_date < end_date)
);

create unique index if not exists terms_only_one_current_idx
  on terms((true))
  where is_current;

create index if not exists terms_academic_year_idx on terms(academic_year);

drop trigger if exists terms_updated_at on terms;
create trigger terms_updated_at
before update on terms
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  code text not null unique,      -- e.g. "ENG-101", "MATH-AP-CALC-AB"
  name text not null,             -- e.g. "English 9", "AP Calculus AB"

  subject text,
  department text,
  description text,

  -- Grade levels eligible to take the course, e.g. {'9','10','11','12'}.
  grade_levels text[] not null default '{}',

  is_ap boolean not null default false,
  is_honors boolean not null default false,
  is_elective boolean not null default false,

  -- Credit value used by transcript GPA math. Most HBA courses are 1.0;
  -- summer / part-time courses may be fractional.
  credit_hours numeric(4,2) not null default 1.0,

  active boolean not null default true
);

create index if not exists courses_active_idx on courses(active) where active;
create index if not exists courses_subject_idx on courses(subject);

drop trigger if exists courses_updated_at on courses;
create trigger courses_updated_at
before update on courses
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- course_sections
-- ---------------------------------------------------------------------------

create table if not exists course_sections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  course_id uuid not null references courses(id) on delete restrict,
  term_id uuid not null references terms(id) on delete restrict,

  -- Teacher is a profile with 'faculty' in roles. on delete set null so we
  -- can deactivate a faculty profile without orphaning history.
  teacher_profile_id uuid references profiles(id) on delete set null,

  -- Optional code to distinguish multiple sections of the same course/term
  -- (e.g. "A", "B"). Null when there's only one section.
  section_code text,

  -- HBA bell-schedule period names, plus 'async' for online courses with no
  -- fixed meeting time (e.g. the online async AP Calc AB case from the data
  -- model). 'elective_1' / 'elective_2' are the Friday elective blocks.
  period text check (
    period is null
    or period in (
      'period_1','period_2','period_3','period_4','period_5','period_6',
      'elective_1','elective_2','async'
    )
  ),
  room text,

  max_enrollment integer check (max_enrollment is null or max_enrollment > 0),

  modality text not null default 'in_person'
    check (modality in ('in_person','online_async','online_sync','hybrid')),

  notes text,

  -- Multiple sections of one course in one term are allowed only when
  -- distinguished by section_code. Postgres treats nulls as distinct, so
  -- two null-coded rows would technically be permitted; in practice the
  -- admin UI will assign codes when creating a second section.
  unique (course_id, term_id, section_code)
);

create index if not exists course_sections_course_idx on course_sections(course_id);
create index if not exists course_sections_term_idx on course_sections(term_id);
create index if not exists course_sections_teacher_idx
  on course_sections(teacher_profile_id)
  where teacher_profile_id is not null;

drop trigger if exists course_sections_updated_at on course_sections;
create trigger course_sections_updated_at
before update on course_sections
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete restrict,
  section_id uuid not null references course_sections(id) on delete restrict,

  status text not null default 'enrolled'
    check (status in ('enrolled','dropped','withdrawn','completed','audit')),

  enrolled_at timestamptz not null default now(),
  dropped_at timestamptz,

  -- Final grade snapshot. Calculated by the gradebook (Phase 2); stored here
  -- so transcript queries don't have to recompute. Locked when the term is
  -- locked or admin explicitly locks the row.
  final_grade_percentage numeric(5,2)
    check (final_grade_percentage is null
           or (final_grade_percentage >= 0 and final_grade_percentage <= 150)),
  final_grade_letter text,
  grade_locked boolean not null default false,

  unique (student_id, section_id)
);

create index if not exists enrollments_student_idx on enrollments(student_id);
create index if not exists enrollments_section_idx on enrollments(section_id);
create index if not exists enrollments_status_idx on enrollments(status);

drop trigger if exists enrollments_updated_at on enrollments;
create trigger enrollments_updated_at
before update on enrollments
for each row
execute function set_updated_at();

commit;
