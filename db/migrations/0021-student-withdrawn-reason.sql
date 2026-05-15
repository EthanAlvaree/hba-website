-- HBA Phase C — withdrawn-reason column
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: students.status already supports 'withdrawn' and we already
-- record withdrawn_at when set, but the *reason* for withdrawal
-- (moved out of state, transferred to another school, family choice,
-- etc.) was previously buried in internal_notes. Promoting it to a
-- dedicated column makes:
--   - the orphans + reports views able to render it cleanly,
--   - the audit log row capture the reason at withdrawal time,
--   - the admin student page display "Withdrawn on X — reason" as
--     first-class data, not parsed out of free text.

begin;

alter table students
  add column if not exists withdrawn_reason text;

commit;
