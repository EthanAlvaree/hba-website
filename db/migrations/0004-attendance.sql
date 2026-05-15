-- HBA Phase B (attendance) schema
--
-- How to apply: paste this whole file into the Supabase project's SQL editor
-- and run it once. Idempotent guards mean re-running is a no-op.
--
-- Depends on 0002-sis-core.sql (references enrollments.id).
--
-- Tables introduced:
--   attendance_records   One row per (enrollment, date) with a status enum
--                        (present / absent / tardy / excused / left_early)
--                        and an optional note. Recorded_by tracks which
--                        admin/teacher wrote the row.

begin;

create extension if not exists "pgcrypto";

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Attendance is per-enrollment because a student can be present in one
  -- section but absent from another on the same day (e.g. missed Period 4
  -- only). on delete cascade: if an enrollment is removed, its attendance
  -- history goes with it.
  enrollment_id uuid not null references enrollments(id) on delete cascade,

  -- Calendar date the record applies to. Date — not timestamptz — because
  -- school attendance is bucketed by school day, not by precise time of
  -- arrival.
  date date not null,

  status text not null
    check (status in ('present', 'absent', 'tardy', 'excused', 'left_early')),

  -- Free-text context. "Doctor's appointment", "Family emergency",
  -- "Arrived 15 min late", etc.
  note text,

  -- Admin or teacher email who recorded this. Useful for audit when
  -- families dispute a record.
  recorded_by text,

  -- One row per (enrollment, date). Re-recording updates in place.
  unique (enrollment_id, date)
);

create index if not exists attendance_records_enrollment_idx
  on attendance_records(enrollment_id);
create index if not exists attendance_records_date_idx
  on attendance_records(date);
create index if not exists attendance_records_status_idx
  on attendance_records(status);

drop trigger if exists attendance_records_updated_at on attendance_records;
create trigger attendance_records_updated_at
before update on attendance_records
for each row
execute function set_updated_at();

commit;
