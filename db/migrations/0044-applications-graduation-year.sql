-- Add an explicit graduation-year field to applications and students.
--
-- The UPN format f.l.YY@highbluffacademy.com derives YY from this year.
-- Without it we'd be computing it from desired_grade + enrollment year,
-- which is fragile in spring-to-summer when families disagree on whether
-- the student is "currently 9th" or "currently 10th" (the in-between).
-- Asking for graduation year directly removes the ambiguity.
--
-- Both columns are optional — pre-existing rows stay populated by the
-- desired_grade fallback in studentUpnFromApplication.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

alter table applications
  add column if not exists student_graduation_year smallint;

alter table students
  add column if not exists graduation_year smallint;

commit;
