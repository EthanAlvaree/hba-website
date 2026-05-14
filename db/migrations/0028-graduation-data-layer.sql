-- Graduation requirements + course-sequencing data layer.
--
-- Extends migration 0007's graduation_requirements + course_subject_assignments
-- with the bits the student trajectory UI + course-request UX need:
--   - per-track requirements (basic diploma vs. college-bound)
--   - course prerequisites with a hard-vs-recommended distinction
--   - per-course offering pattern (some APs run on alternating years
--     because the student body is too small to fill both annually)
--   - per-student prereq overrides so admins can let a kid jump a level
--     when warranted, without monkey-patching the catalog
--
-- Seeded data lives in the next migration (0029). This one is schema-only
-- so a forward migration of the database doesn't depend on whatever course
-- codes happen to exist.

begin;

-- ---------------------------------------------------------------------------
-- graduation_requirements: add track column
-- ---------------------------------------------------------------------------

alter table graduation_requirements
  add column if not exists track text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'graduation_requirements_track_check'
  ) then
    alter table graduation_requirements
      add constraint graduation_requirements_track_check
      check (track in ('all', 'basic', 'college_bound'));
  end if;
end$$;

create index if not exists graduation_requirements_track_idx
  on graduation_requirements(track);

-- ---------------------------------------------------------------------------
-- course_prerequisites
-- ---------------------------------------------------------------------------
--
-- A row says "to take course_id, the student must (or should) have
-- completed prerequisite_course_id first." Kind 'hard' is enforced by
-- the trajectory UI (course is filtered out of the eligible list);
-- 'recommended' surfaces as a warning but doesn't block selection.
-- Multiple prereq rows on the same course are ANDed by default — to
-- express OR (e.g. "Precalc or Honors Precalc"), set the same
-- `group_key` on the alternatives and the UI treats them as a single
-- ANY-OF group.

create table if not exists course_prerequisites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  course_id uuid not null references courses(id) on delete cascade,
  prerequisite_course_id uuid not null references courses(id) on delete cascade,

  kind text not null default 'hard'
    check (kind in ('hard', 'recommended')),

  -- Free-form group label; rows sharing the same group_key on the same
  -- course are evaluated as OR. NULL = standalone AND prereq.
  group_key text,

  notes text,

  unique (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create index if not exists course_prerequisites_course_idx
  on course_prerequisites(course_id);
create index if not exists course_prerequisites_prereq_idx
  on course_prerequisites(prerequisite_course_id);

drop trigger if exists course_prerequisites_updated_at on course_prerequisites;
create trigger course_prerequisites_updated_at
before update on course_prerequisites
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- courses.offered_pattern
-- ---------------------------------------------------------------------------
--
-- HBA is small enough that some APs run on alternating years (AP Lang
-- one year, AP Lit the next, etc.). This column expresses the
-- intended cadence; the trajectory UI uses it to hide courses that
-- won't run next year. 'manual' = admin schedules per-term without a
-- predictable pattern.

alter table courses
  add column if not exists offered_pattern text not null default 'always';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_offered_pattern_check'
  ) then
    alter table courses
      add constraint courses_offered_pattern_check
      check (offered_pattern in ('always', 'odd_start_year', 'even_start_year', 'manual'));
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- student_prereq_overrides
-- ---------------------------------------------------------------------------
--
-- Admin-granted exception. When a student has a row here for a course,
-- the trajectory UI treats them as if they'd cleared every prereq for
-- that course. Audited via admin_audit_log.

create table if not exists student_prereq_overrides (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,

  granted_by_email text not null,
  notes text,

  unique (student_id, course_id)
);

create index if not exists student_prereq_overrides_student_idx
  on student_prereq_overrides(student_id);

commit;
