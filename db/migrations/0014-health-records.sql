-- HBA Phase C — student health records
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent via
-- `create table if not exists`.
--
-- Why: schools are legally required to keep some health info on file
-- (allergies, medications, emergency contact reachable during the day).
-- Until now we had `parent_links` (who's a parent) but no structured
-- place to record "Sarah has a peanut allergy and carries an EpiPen."
--
-- The shape is intentionally minimal: enough to be useful in an
-- emergency, not a full clinical record. One row per student. JSON
-- arrays for allergies and medications so we can iterate without a
-- migration when the office wants more fields.

begin;

create table if not exists student_health_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null unique references students(id) on delete cascade,

  -- Free-text. Office uses this for "no known allergies" or a short list.
  allergies text,
  medications text,
  conditions text,        -- asthma, diabetes, etc.
  dietary_restrictions text,

  immunizations_on_file boolean not null default false,
  immunization_notes text,

  -- Out-of-band emergency contact (not necessarily a parent — could be
  -- grandma, a neighbor, anyone the office should call if guardians
  -- are unreachable).
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  emergency_contact_email text,

  primary_physician_name text,
  primary_physician_phone text,
  insurance_provider text,
  insurance_policy_number text,

  -- The office can add private notes parents don't see.
  internal_notes text
);

create or replace function student_health_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists student_health_set_updated_at_trg on student_health_records;
create trigger student_health_set_updated_at_trg
  before update on student_health_records
  for each row execute function student_health_set_updated_at();

commit;
