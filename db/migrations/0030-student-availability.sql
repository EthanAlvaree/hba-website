-- Student period availability.
--
-- Mirrors teacher_availability for students. The scheduler solver
-- treats unchecked periods as "this student cannot take a class
-- during this slot" — so when Brynn and Frankie are only available
-- P1-P4, any core graduation requirement they're missing has to
-- land in P1-P4.
--
-- Default behavior (no row) is "available for all periods" so new
-- students don't need an explicit setup step before the solver can
-- schedule them. Existing students stay schedulable without a
-- backfill — only the kids with actual constraints need rows.

begin;

create table if not exists student_availability (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,

  -- Mirrors the section_period enum used everywhere.
  period text not null check (period in (
    'period_1','period_2','period_3','period_4','period_5','period_6',
    'elective_1','elective_2','async'
  )),

  available boolean not null default true,
  notes text,

  unique (student_id, period)
);

create index if not exists student_availability_student_idx
  on student_availability(student_id);

drop trigger if exists student_availability_updated_at on student_availability;
create trigger student_availability_updated_at
before update on student_availability
for each row
execute function set_updated_at();

commit;
