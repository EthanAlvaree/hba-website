-- HBA Phase 1 applications schema
--
-- How to apply: paste this whole file into the Supabase project's SQL editor
-- and run it once. Idempotent guard at the top means re-running is a no-op.
--
-- Tables:
--   applications          One row per family submission. Includes drafts (status='draft'
--                         with a magic-link token) and admin workflow state.
--   application_documents Per-file references. Storage lives in the
--                         "application-documents" Supabase Storage bucket
--                         (create separately as a private bucket).

begin;

create extension if not exists "pgcrypto";

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  status text not null default 'draft'
    check (status in (
      'draft',
      'submitted',
      'in_review',
      'info_requested',
      'admit_offered',
      'accepted',
      'declined',
      'withdrawn',
      'enrolled',
      'archived'
    )),

  enrollment_type text
    check (
      enrollment_type is null
      or enrollment_type in ('summer', 'part_time', 'full_time')
    ),

  -- Magic-link draft state. Cleared on submit.
  draft_token text unique,
  draft_email text,
  draft_expires_at timestamptz,

  -- Student
  student_first_name text,
  student_middle_name text,
  student_last_name text,
  student_suffix text,
  student_preferred_name text,
  student_dob date,
  student_gender text,
  student_pronouns text,
  student_birthplace text,
  student_primary_language text,
  student_secondary_language text,
  student_english_proficiency text,
  student_current_grade text,
  student_desired_grade text,
  student_personal_email text,
  student_phone text,
  student_address_line1 text,
  student_address_line2 text,
  student_address_city text,
  student_address_region text,
  student_address_postal_code text,
  student_address_country text,

  -- Guardian 1 (required at submit)
  guardian1_name text,
  guardian1_relationship text,
  guardian1_mobile text,
  guardian1_work_phone text,
  guardian1_email text,
  guardian1_address_same_as_student boolean not null default false,
  guardian1_address_line1 text,
  guardian1_address_line2 text,
  guardian1_address_city text,
  guardian1_address_region text,
  guardian1_address_postal_code text,
  guardian1_address_country text,

  -- Guardian 2 (optional)
  guardian2_name text,
  guardian2_relationship text,
  guardian2_mobile text,
  guardian2_work_phone text,
  guardian2_email text,
  guardian2_address_same_as_student boolean not null default false,
  guardian2_address_line1 text,
  guardian2_address_line2 text,
  guardian2_address_city text,
  guardian2_address_region text,
  guardian2_address_postal_code text,
  guardian2_address_country text,

  -- Homestay (optional, for international students)
  has_homestay boolean not null default false,
  homestay_name text,
  homestay_relationship text,
  homestay_mobile text,
  homestay_work_phone text,
  homestay_email text,
  homestay_address_line1 text,
  homestay_address_line2 text,
  homestay_address_city text,
  homestay_address_region text,
  homestay_address_postal_code text,
  homestay_address_country text,

  -- Course interest: jsonb array of course-catalog keys (matches lib/summer-courses)
  course_interest jsonb not null default '[]'::jsonb,

  -- Prior schools: jsonb array of { name: string, note?: string }
  prior_schools jsonb not null default '[]'::jsonb,

  -- Source + free text from the family
  how_did_you_hear text,
  notes_from_family text,

  -- Admin workflow
  internal_notes text,
  assigned_to text,
  admit_decision_at timestamptz,
  archived_at timestamptz,

  -- Spam protection (parity with contact_submissions)
  source text not null default 'apply-page',
  spam_provider text,
  spam_verified boolean not null default false
);

create index if not exists applications_status_idx on applications(status);
create index if not exists applications_enrollment_type_idx on applications(enrollment_type);
create index if not exists applications_draft_token_idx
  on applications(draft_token)
  where draft_token is not null;
create index if not exists applications_created_at_idx on applications(created_at desc);

create or replace function set_applications_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_updated_at on applications;
create trigger applications_updated_at
before update on applications
for each row
execute function set_applications_updated_at();

create table if not exists application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  kind text not null,
  prior_school_name text,
  filename text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists application_documents_app_id_idx
  on application_documents(application_id);

commit;

-- Storage bucket (run separately in Supabase Storage, not in this SQL editor):
--   1. Create a private bucket named "application-documents".
--   2. Confirm no public access policies are attached.
--   3. The Next.js server reads/writes files via the service role key only.
