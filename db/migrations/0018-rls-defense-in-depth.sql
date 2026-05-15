-- HBA Phase C — row-level security tripwire
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: every table in this project is accessed exclusively from server
-- code via the service-role key (getServiceSupabase()), which BYPASSES
-- RLS by design. So why turn RLS on at all?
--
-- Defense in depth. If a future commit accidentally exposes a
-- supabase-js client to the browser, or someone wires up a route that
-- uses the anon key, RLS with no policies = nothing reads. Without
-- this migration, the anon role can SELECT every PII column in the
-- entire database via the public REST endpoint by default. With it,
-- the anon role gets back "permission denied" until we explicitly
-- write a policy granting access.
--
-- This migration intentionally does NOT add policies. Every legitimate
-- access path today is the service role, which is unaffected. If/when
-- a feature needs anon or authenticated-role access (e.g. moving the
-- portal to direct Supabase reads, or shipping a browser-side mutation
-- through an anon key), the corresponding policy lands alongside that
-- feature — not here.
--
-- Tables NOT touched: anything Supabase manages itself (auth.*,
-- storage.*, etc.) is out of scope; storage bucket policies are
-- already configured per-bucket via the dashboard.

begin;

-- Applications + intake
alter table applications enable row level security;
alter table application_documents enable row level security;

-- SIS core
alter table profiles enable row level security;
alter table students enable row level security;
alter table parent_links enable row level security;
alter table terms enable row level security;
alter table courses enable row level security;
alter table course_sections enable row level security;
alter table enrollments enable row level security;

-- Gradebook + attendance
alter table assignment_categories enable row level security;
alter table assignments enable row level security;
alter table scores enable row level security;
alter table attendance_records enable row level security;

-- Post-enrollment
alter table student_post_enrollment_data enable row level security;
alter table student_documents enable row level security;

-- Scheduling + drafts
alter table teacher_qualifications enable row level security;
alter table teacher_availability enable row level security;
alter table teacher_workload_preferences enable row level security;
alter table graduation_requirements enable row level security;
alter table course_subject_assignments enable row level security;
alter table student_course_requests enable row level security;
alter table schedule_drafts enable row level security;
alter table schedule_draft_sections enable row level security;
alter table schedule_draft_assignments enable row level security;

-- Audit + ops tables
alter table admin_audit_log enable row level security;
alter table calendar_events enable row level security;
alter table incidents enable row level security;
alter table student_health_records enable row level security;
alter table section_announcements enable row level security;
alter table conference_events enable row level security;
alter table conference_slots enable row level security;
alter table sent_mass_emails enable row level security;

commit;
