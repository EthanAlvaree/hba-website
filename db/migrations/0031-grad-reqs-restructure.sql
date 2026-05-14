-- Graduation-requirements restructure + many-to-many course subjects.
--
-- Two structural changes the new Graduation Requirements page needs:
--
-- 1. graduation_requirements: collapse the per-(subject, track) rows
--    into ONE row per subject area, with required_credits_basic and
--    required_credits_college_bound as columns. The new page is a
--    card per subject with both credit fields side by side — the
--    old "one row per track" model fought that UI.
--
-- 2. course_subject_assignments: was course_id PRIMARY KEY (one
--    subject per course). Now a composite (course_id, subject_area)
--    PK — a course can satisfy multiple subject areas at once.
--    Studio Art counts toward Visual & Performing Arts AND lives in
--    the Elective category (which is what makes it Friday-only in
--    the scheduler). Digital Art is in Computer Science + VPA but
--    NOT Elective, so it stays weekday-schedulable.
--
-- The actual seed data lives in 0032. This migration is structure
-- only, so a forward migration doesn't depend on course codes.

begin;

-- ---------------------------------------------------------------------------
-- 1. graduation_requirements → one row per subject area
-- ---------------------------------------------------------------------------

alter table graduation_requirements
  add column if not exists required_credits_basic numeric(4,2) not null default 0,
  add column if not exists required_credits_college_bound numeric(4,2) not null default 0;

-- Fold the existing per-track rows into the two new columns. For each
-- subject area: basic credits = max over its basic/all rows;
-- college-bound credits = max over its college_bound/all rows. (max,
-- not sum — multiple rows for the same subject+track were never
-- intended; if they exist, the larger requirement wins.)
do $$
declare
  area text;
begin
  for area in select distinct subject_area from graduation_requirements loop
    update graduation_requirements gr
    set required_credits_basic = coalesce((
          select max(required_credits)
          from graduation_requirements
          where subject_area = area and track in ('basic', 'all')
        ), 0),
        required_credits_college_bound = coalesce((
          select max(required_credits)
          from graduation_requirements
          where subject_area = area and track in ('college_bound', 'all')
        ), 0)
    where gr.subject_area = area;
  end loop;
end$$;

-- Keep the earliest-created row per subject area, drop the rest.
delete from graduation_requirements
where id in (
  select id from (
    select id,
           row_number() over (
             partition by subject_area order by created_at, id
           ) as rn
    from graduation_requirements
  ) ranked
  where ranked.rn > 1
);

-- One row per subject area from here on.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'graduation_requirements_subject_area_key'
  ) then
    alter table graduation_requirements
      add constraint graduation_requirements_subject_area_key
      unique (subject_area);
  end if;
end$$;

-- The per-track columns are obsolete now. name becomes optional —
-- the new UI derives the heading from subject_area.
alter table graduation_requirements drop column if exists track;
alter table graduation_requirements drop column if exists required_credits;
alter table graduation_requirements alter column name drop not null;

-- ---------------------------------------------------------------------------
-- 2. course_subject_assignments → many-to-many
-- ---------------------------------------------------------------------------

-- Drop the single-subject primary key. (The old PK name is the
-- Postgres default: <table>_pkey.)
alter table course_subject_assignments
  drop constraint if exists course_subject_assignments_pkey;

-- De-dup any accidental (course_id, subject_area) repeats before the
-- composite PK goes on — ctid is the physical row id, so a.ctid <
-- b.ctid keeps exactly one of each pair.
delete from course_subject_assignments a
using course_subject_assignments b
where a.ctid < b.ctid
  and a.course_id = b.course_id
  and a.subject_area = b.subject_area;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'course_subject_assignments_pkey'
  ) then
    alter table course_subject_assignments
      add primary key (course_id, subject_area);
  end if;
end$$;

commit;
