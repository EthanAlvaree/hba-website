-- Persist the "Add individual recipients" list across the schedule
-- wait. Without this, an admin who picked Audience=parents + added
-- one-off addresses ('prospect@gmail.com') would lose those one-offs
-- at dispatch time because the cron only re-resolves the audience.
--
-- text[] keeps the storage trivial — no extra table, the cron splits
-- it like any array column. Nullable so older rows scheduled before
-- this migration land as null on dispatch (= empty extras list).
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

alter table scheduled_mass_emails
  add column if not exists cohort_extra_emails text[];

commit;
