-- HBA Phase C — add tag filter to scheduled mass emails
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: /admin/messaging now supports a per-tag cohort filter (only
-- send to families of students tagged "scholarship", "sports",
-- "esl", etc.). Scheduled sends need to remember the tag at compose
-- time so the dispatcher resolves the right cohort at send time.

begin;

alter table scheduled_mass_emails
  add column if not exists cohort_tag text;

commit;