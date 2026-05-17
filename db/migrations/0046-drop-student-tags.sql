-- Retire the student_tags feature.
--
-- The freeform-tag UI shipped in 0023 was meant to track interests +
-- status labels (sports, ESL, IEP, scholarship, etc.) without bloating
-- the students table. In practice nobody used it — every kind of label
-- the office actually cares about already lives in a structured column
-- somewhere (english_proficiency for ESL, parent_links.is_homestay for
-- homestay, post_enrollment_data.has_iep / has_504 for accommodations,
-- and applications.student_is_international for the domestic/
-- international distinction). The student detail page now derives
-- chips from those columns instead.
--
-- Dropping the table also lets us strip the lib helpers, the directory
-- filter, the mass-email tag intersection, the reports section, the
-- messaging cohort dropdown, and the calendar VEVENT CATEGORIES — see
-- the same-PR application code changes.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

drop table if exists student_tags cascade;

-- 0025 added a cohort_tag column to scheduled_mass_emails so a delayed
-- send could remember which student tag to intersect with at dispatch
-- time. Going away with the rest of the feature.
alter table scheduled_mass_emails
  drop column if exists cohort_tag;

commit;
