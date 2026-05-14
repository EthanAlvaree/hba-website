-- Belt-and-suspenders CHECK constraints on academic_history.
--
-- How to apply: paste into the Supabase SQL editor and run.
--
-- `subject_area` and `grade_letter` are validated in the app layer
-- (lib/academic-history.ts), but nothing stopped a direct SQL edit — or
-- a future subject-area rename — from leaving a stale value that the
-- transcript / trajectory code would then silently skip. These
-- constraints make the database reject bad values outright.
--
-- Both columns stay nullable: null subject_area = "not tracked toward a
-- requirement", null grade_letter = "in progress / ungraded".

begin;

alter table academic_history
  drop constraint if exists academic_history_subject_area_check;
alter table academic_history
  add constraint academic_history_subject_area_check
  check (
    subject_area is null
    or subject_area in (
      'english',
      'math',
      'science',
      'social_studies',
      'world_languages',
      'visual_performing_arts',
      'physical_education',
      'computer_science',
      'elective'
    )
  );

alter table academic_history
  drop constraint if exists academic_history_grade_letter_check;
alter table academic_history
  add constraint academic_history_grade_letter_check
  check (
    grade_letter is null
    or grade_letter in (
      'A', 'A-',
      'B+', 'B', 'B-',
      'C+', 'C', 'C-',
      'D+', 'D', 'D-',
      'F'
    )
  );

commit;
