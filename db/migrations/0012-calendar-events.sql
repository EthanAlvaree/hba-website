-- HBA Phase C — calendar events table + seed
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent via
-- ON CONFLICT (slug). Re-running updates fields but never wipes a row,
-- so seed-tweaks here won't clobber rows admins have edited in the UI
-- (unless the slug also exists in the seed).
--
-- Why: until now the public /calendar page read from content/events.json
-- on disk. That made it impossible for non-technical admins to update
-- holidays, finals dates, etc. without a code change. This migration
-- moves the calendar to a DB table editable from /admin/academics/calendar,
-- and the same source of truth feeds:
--   - the public /calendar page (and the .ics subscription + printable views)
--   - eventually attendance (skip non-school days) and the scheduler
--
-- Categories match the existing CategoryKey enum:
-- academics | holiday | faculty | community.
--
-- start_date / end_date follow the existing JSON convention: end_date is
-- EXCLUSIVE (the day AFTER the last day the event spans). Null end_date
-- = single day.

begin;

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Stable identifier used in URLs / .ics UIDs / log references. Matches
  -- the old JSON "id" field for migrated rows so links don't break.
  slug text unique not null,

  title text not null,
  start_date date not null,
  end_date date,            -- exclusive; null = single-day event
  all_day boolean not null default true,
  start_time time,          -- nullable; populated when all_day=false
  end_time time,

  category text not null,
  location text,
  description text,

  created_by_email text     -- audit hint; nullable for seeded rows
);

create index if not exists calendar_events_start_idx
  on calendar_events (start_date);
create index if not exists calendar_events_category_idx
  on calendar_events (category);

-- Auto-update updated_at on UPDATE.
create or replace function calendar_events_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calendar_events_set_updated_at_trg on calendar_events;
create trigger calendar_events_set_updated_at_trg
  before update on calendar_events
  for each row execute function calendar_events_set_updated_at();

insert into calendar_events (slug, title, start_date, end_date, all_day, category, location, description)
values
  ('2025-08-14-inservice', 'Teacher in-service', '2025-08-14', '2025-08-16', true, 'faculty', null, 'No school for students.'),
  ('2025-08-18-first-day', 'First day of school', '2025-08-18', null, true, 'academics', null, 'Classes begin for the 2025–2026 academic year.'),
  ('2025-09-01-labor-day', 'Labor Day', '2025-09-01', null, true, 'holiday', null, null),
  ('2025-10-13-indigenous-peoples-day', 'Indigenous Peoples’ Day', '2025-10-13', null, true, 'holiday', null, null),
  ('2025-11-11-veterans-day', 'Veterans Day', '2025-11-11', null, true, 'holiday', null, null),
  ('2025-11-24-fall-break', 'Fall Break', '2025-11-24', '2025-11-29', true, 'holiday', null, null),
  ('2025-12-15-semester-1-finals', 'Semester 1 Finals', '2025-12-15', '2025-12-18', true, 'academics', null, null),
  ('2025-12-18-inservice', 'Teacher in-service', '2025-12-18', '2025-12-20', true, 'faculty', null, 'No school for students.'),
  ('2025-12-22-winter-break', 'Winter Break', '2025-12-22', '2026-01-03', true, 'holiday', null, null),
  ('2026-01-05-inservice', 'Teacher in-service', '2026-01-05', '2026-01-07', true, 'faculty', null, 'No school for students.'),
  ('2026-01-07-semester-2-start', 'First day of Semester 2', '2026-01-07', null, true, 'academics', null, null),
  ('2026-01-19-mlk-day', 'Martin Luther King Jr. Day', '2026-01-19', null, true, 'holiday', null, null),
  ('2026-02-16-presidents-day', 'Presidents’ Day Holiday', '2026-02-16', '2026-02-18', true, 'holiday', null, null),
  ('2026-03-30-spring-break', 'Spring Break', '2026-03-30', '2026-04-04', true, 'holiday', null, null),
  ('2026-04-29-sd-zoo-field-trip', 'San Diego Zoo field trip', '2026-04-29', null, true, 'community', 'San Diego Zoo', 'All-school field trip to the San Diego Zoo.'),
  ('2026-05-18-semester-2-finals', 'Semester 2 Finals', '2026-05-18', '2026-05-21', true, 'academics', null, null),
  ('2026-05-21-graduation', 'Graduation', '2026-05-21', null, true, 'community', 'Rancho Santa Fe campus', 'Class of 2026 graduation ceremony.'),
  ('2026-05-25-memorial-day', 'Memorial Day', '2026-05-25', null, true, 'holiday', null, null),
  ('2026-06-08-summer-classes-start', 'First day of summer classes', '2026-06-08', null, true, 'academics', null, 'All summer programs begin — six-, seven-, and eight-week courses, on campus and online.'),
  ('2026-07-03-independence-day', 'Independence Day (observed)', '2026-07-03', null, true, 'holiday', null, null),
  ('2026-08-17-inservice', 'Teacher in-service', '2026-08-17', '2026-08-19', true, 'faculty', null, 'No school for students.'),
  ('2026-08-19-first-day', 'First day of school', '2026-08-19', null, true, 'academics', null, 'Classes begin for the 2026–2027 academic year.'),
  ('2026-08-21-orientation', 'Orientation Day', '2026-08-21', null, true, 'community', null, 'Orientation for new students and families.'),
  ('2026-09-07-labor-day', 'Labor Day', '2026-09-07', null, true, 'holiday', null, null),
  ('2026-10-12-indigenous-peoples-day', 'Indigenous Peoples’ Day', '2026-10-12', null, true, 'holiday', null, null),
  ('2026-11-11-veterans-day', 'Veterans Day', '2026-11-11', null, true, 'holiday', null, null),
  ('2026-11-23-fall-break', 'Fall Break', '2026-11-23', '2026-11-28', true, 'holiday', null, null),
  ('2026-12-16-semester-1-finals', 'Semester 1 Finals', '2026-12-14', '2026-12-17', true, 'academics', null, null),
  ('2026-12-17-inservice', 'Teacher in-service', '2026-12-17', '2026-12-19', true, 'faculty', null, 'No school for students.'),
  ('2026-12-21-winter-break', 'Winter Break', '2026-12-21', '2027-01-02', true, 'holiday', null, null),
  ('2027-01-04-inservice', 'Teacher in-service', '2027-01-04', '2027-01-06', true, 'faculty', null, 'No school for students.'),
  ('2027-01-06-semester-2-start', 'First day of Semester 2', '2027-01-06', null, true, 'academics', null, null),
  ('2027-01-18-mlk-day', 'Martin Luther King Jr. Day', '2027-01-18', null, true, 'holiday', null, null),
  ('2027-02-15-presidents-day', 'Presidents’ Day Holiday', '2027-02-15', '2027-02-17', true, 'holiday', null, null),
  ('2027-03-29-spring-break', 'Spring Break', '2027-03-29', '2027-04-03', true, 'holiday', null, null),
  ('2027-05-17-semester-2-finals', 'Semester 2 Finals', '2027-05-17', '2027-05-20', true, 'academics', null, null),
  ('2027-05-20-graduation', 'Graduation', '2027-05-20', null, true, 'community', 'Rancho Santa Fe campus', 'Class of 2027 graduation ceremony.'),
  ('2027-05-31-memorial-day', 'Memorial Day', '2027-05-31', null, true, 'holiday', null, null),
  ('2027-06-07-summer-classes-start', 'First day of summer classes', '2027-06-07', null, true, 'academics', null, 'All summer programs begin for 2027.'),
  ('2027-07-05-independence-day', 'Independence Day (observed)', '2027-07-05', null, true, 'holiday', null, null)
on conflict (slug) do update
  set
    title = excluded.title,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    all_day = excluded.all_day,
    category = excluded.category,
    location = excluded.location,
    description = excluded.description;

commit;

