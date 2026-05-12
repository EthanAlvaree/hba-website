-- HBA Phase 2 (post-enrollment data completion) schema
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent
-- guards mean re-running is a no-op.
--
-- Depends on 0002-sis-core.sql (references students.id).
--
-- Tables introduced:
--   student_post_enrollment_data
--     One row per student. Holds immunization status, medical history,
--     insurance, financial aid request, accommodations / IEP, citizenship
--     / visa. The "Phase 1.5" fields from the data model — collected
--     after the family has accepted admission, NOT at apply-time.
--
--   student_documents
--     Per-file references for student docs: immunization records,
--     passport, visa, I-20, IEP, etc. Mirrors application_documents
--     but keyed to students.id and with a broader kind enum. Storage
--     lives in the "application-documents" bucket under a 'students/'
--     prefix (no separate bucket needed).

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- student_post_enrollment_data
-- ---------------------------------------------------------------------------

create table if not exists student_post_enrollment_data (
  -- 1:1 with students. We use the FK as the primary key so each student
  -- has at most one row; upserts target the student_id.
  student_id uuid primary key references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Immunization status. Detailed records go in student_documents; this
  -- row tracks the family-reported status + any exemption reason.
  immunizations_complete boolean not null default false,
  immunizations_notes text,
  immunizations_exemption_reason text,  -- religious, medical, etc.

  -- Medical history (free-form for now; richer fields can be added later)
  medical_blood_type text,
  medical_allergies text,
  medical_conditions text,
  medical_medications text,
  medical_emergency_contact_name text,
  medical_emergency_contact_phone text,
  medical_emergency_contact_relationship text,
  medical_pediatrician_name text,
  medical_pediatrician_phone text,
  medical_notes text,

  -- Medical insurance
  insurance_provider text,
  insurance_policy_number text,
  insurance_group_number text,
  insurance_subscriber_name text,
  insurance_subscriber_dob date,
  insurance_phone text,
  insurance_notes text,

  -- Financial aid request flag — the actual form/details are uploaded as
  -- a document. Office processes those separately.
  financial_aid_requested boolean not null default false,
  financial_aid_notes text,

  -- Accommodations + IEP
  has_iep boolean not null default false,
  has_504 boolean not null default false,
  accommodations_needed text,
  accommodation_notes text,

  -- Citizenship / international student fields
  citizenship_country text,
  visa_type text,                  -- F-1, J-1, etc.
  visa_expiration date,
  i20_number text,
  passport_number text,
  passport_expiration date,

  -- Workflow timestamps. family_completed_at flips when the family clicks
  -- "Submit complete file" on the parent portal. admin_verified_at + by
  -- record review by the office.
  family_completed_at timestamptz,
  admin_verified_at timestamptz,
  admin_verified_by text
);

drop trigger if exists student_post_enrollment_data_updated_at on student_post_enrollment_data;
create trigger student_post_enrollment_data_updated_at
before update on student_post_enrollment_data
for each row
execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- student_documents
-- ---------------------------------------------------------------------------

create table if not exists student_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,

  -- Categorization. 'other' is a free-form bucket for anything that
  -- doesn't fit; office can rename via direct DB edit if a kind comes up
  -- often.
  kind text not null check (kind in (
    'immunization',
    'medical_history',
    'medical_insurance',
    'financial_aid',
    'accommodation',
    'iep',
    'passport',
    'visa',
    'i20',
    'transcript',
    'other'
  )),

  description text,
  filename text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text  -- email of uploader (parent or admin)
);

create index if not exists student_documents_student_idx
  on student_documents(student_id);

create index if not exists student_documents_kind_idx
  on student_documents(kind);

commit;
