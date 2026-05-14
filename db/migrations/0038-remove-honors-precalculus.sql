-- Remove the retired "Precalculus (H)" course (MATH-HPRECALC) from the SIS.
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.
--
-- HBA doesn't offer Honors Precalculus — migration 0033 already
-- deactivated it. It's now also pulled from lib/course-catalog.ts +
-- the 0011 seed, so this drops the row to match.
--
-- Guarded: the delete is skipped if a course_section was ever created
-- for it (course_sections.course_id is ON DELETE RESTRICT — we never
-- want to lose section / enrollment history). In that unlikely case
-- the row just stays deactivated, which is harmless. Catalogue-side
-- metadata (teacher_qualifications, course_subject_assignments,
-- course_prerequisites, student_course_requests, student_prereq_overrides)
-- is cleaned up automatically by the existing ON DELETE CASCADE FKs.

begin;

delete from courses
where code = 'MATH-HPRECALC'
  and not exists (
    select 1 from course_sections cs where cs.course_id = courses.id
  );

commit;
