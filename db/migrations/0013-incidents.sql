-- HBA Phase C — student incidents (behavior + tardy log)
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent via
-- `create table if not exists` + `create index if not exists`.
--
-- Why: teachers and admins need a lightweight log for the day-to-day stuff
-- — late to class, out too long at lunch, behavior in class, missed
-- assignment, etc. Most entries are minor; a small fraction warrant
-- escalation (parent notified, referral, suspension). We surface a one-
-- click "log + notify parent via email" flow in the gradebook + attendance
-- pages so teachers don't have to leave the SIS to communicate.
--
-- An incident always belongs to a student. Optionally tied to:
--   - section (the class where it happened — null for non-class events)
--   - enrollment (the (student, section) tuple — convenient join)
--   - attendance_record (when the incident is "Sarah was 12 min late to
--     period 3 today" — links back to the attendance row so the two
--     surfaces don't double-count).

begin;

create type incident_kind as enum (
  'tardy',                -- late to class / late back from lunch
  'unexcused_absence',    -- skipped class entirely
  'dress_code',
  'cell_phone',
  'classroom_disruption',
  'missing_assignment',
  'late_assignment',
  'academic_concern',     -- catch-all for "we should talk about this kid's progress"
  'positive',             -- kudos / shout-outs (yes, log the good too)
  'other'
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,

  -- Optional links to the class context. We let any/all of these be null
  -- because some incidents happen outside class (lunchroom, hallway).
  section_id uuid references course_sections(id) on delete set null,
  enrollment_id uuid references enrollments(id) on delete set null,
  attendance_record_id uuid references attendance_records(id) on delete set null,

  kind incident_kind not null,

  -- When the incident happened. May not match created_at (e.g. teacher
  -- logs Monday's incident on Wednesday).
  occurred_at timestamptz not null default now(),

  summary text not null,           -- short one-liner shown in lists
  details text,                    -- longer narrative; optional

  -- Who reported it (typically the teacher of the section).
  reported_by_email text not null,
  reported_by_profile_id uuid references profiles(id) on delete set null,

  -- Parent communication.
  parent_notified boolean not null default false,
  parent_notified_at timestamptz,
  parent_notified_method text,     -- "email", "phone", "in_person", "teams"

  -- Visibility on the parent portal. Defaults to true so parents see
  -- what we logged; teacher / admin can opt out for internal-only notes.
  visible_to_parent boolean not null default true
);

create index if not exists incidents_student_idx on incidents (student_id, occurred_at desc);
create index if not exists incidents_section_idx on incidents (section_id) where section_id is not null;
create index if not exists incidents_kind_idx on incidents (kind);
create index if not exists incidents_occurred_idx on incidents (occurred_at desc);

create or replace function incidents_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists incidents_set_updated_at_trg on incidents;
create trigger incidents_set_updated_at_trg
  before update on incidents
  for each row execute function incidents_set_updated_at();

commit;
