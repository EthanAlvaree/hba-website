-- HBA Phase C — parent-teacher conference scheduling
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: twice a year the office runs parent-teacher conferences. Currently
-- they wrangle this in Google Sheets. This gives a structured "event"
-- (the window of dates/times the conferences are held in) plus pre-
-- generated time slots per teacher. Parents pick from open slots; the
-- system prevents double-booking.

begin;

create table if not exists conference_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text unique not null,
  name text not null,
  description text,

  -- The overall window the conferences run inside. Slots are generated
  -- per teacher between these bounds.
  start_at timestamptz not null,
  end_at timestamptz not null,
  slot_minutes int not null default 15
    check (slot_minutes between 5 and 120),

  active boolean not null default true,

  constraint conference_events_dates_check check (start_at < end_at)
);

create index if not exists conference_events_active_idx on conference_events (active, start_at);

create table if not exists conference_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  event_id uuid not null references conference_events(id) on delete cascade,
  teacher_profile_id uuid not null references profiles(id) on delete cascade,

  start_at timestamptz not null,
  end_at timestamptz not null,

  -- Booking. All nullable when the slot is open. Filled atomically when
  -- a parent claims it. parent_email is the source of truth (works even
  -- if profile is deleted later); booked_by_profile_id is convenience.
  booked_by_parent_email text,
  booked_by_profile_id uuid references profiles(id) on delete set null,
  booked_for_student_id uuid references students(id) on delete set null,
  parent_notes text,
  booked_at timestamptz,
  cancelled_at timestamptz,

  unique (event_id, teacher_profile_id, start_at),
  constraint conference_slots_dates_check check (start_at < end_at)
);

create index if not exists conference_slots_event_idx
  on conference_slots (event_id, teacher_profile_id, start_at);
create index if not exists conference_slots_open_idx
  on conference_slots (event_id, teacher_profile_id, start_at)
  where booked_by_parent_email is null and cancelled_at is null;
create index if not exists conference_slots_parent_idx
  on conference_slots (booked_by_parent_email)
  where booked_by_parent_email is not null;

create or replace function conferences_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists conference_events_set_updated_at_trg on conference_events;
create trigger conference_events_set_updated_at_trg
  before update on conference_events
  for each row execute function conferences_set_updated_at();
drop trigger if exists conference_slots_set_updated_at_trg on conference_slots;
create trigger conference_slots_set_updated_at_trg
  before update on conference_slots
  for each row execute function conferences_set_updated_at();

commit;
