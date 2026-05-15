-- Deactivate legacy math courses + retire the 'college_preparatory'
-- subject area.
--
-- How to apply: paste into the Supabase SQL editor and run. Safe to
-- re-run (idempotent — UPDATE/DELETE on already-changed rows are no-ops).
--
-- Two unrelated cleanups bundled because they're both "the catalogue
-- drifted from what HBA actually does":
--
--  1. Legacy math courses. HBA teaches the Integrated Math sequence
--     (IM1/IM2/IM3 + honors) and AP Precalculus. The old Algebra 1 /
--     Geometry / Algebra 2 / Intro to Calculus / Honors Precalculus
--     courses haven't been taught in years. We DEACTIVATE rather than
--     delete: the scheduler + course-request UIs already filter on
--     `active`, so deactivating keeps them out of new schedules while
--     leaving the rows intact for any historical enrollment that still
--     references them. Incoming transfer work named "Algebra 1" etc. is
--     recorded in academic_history (migration 0034) as free-text and
--     does not need a catalogue row.
--
--  2. 'college_preparatory' subject area. This mirrored UC A-G's "G"
--     category, but G is an *overflow* requirement (an extra year of
--     any A-F subject satisfies it) — not its own subject. Modeling it
--     as a tagged bucket just diluted the real categories (AP Macro is
--     Social Studies, AP Research is English, etc.). We remove it as a
--     tracked requirement; courses keep their true subject tags.

begin;

-- 1. Deactivate legacy math courses.
update courses
set active = false
where code in (
  'MATH-ALG1',      -- Algebra 1
  'MATH-GEO',       -- Geometry
  'MATH-ALG2',      -- Algebra 2
  'MATH-PRECALC',   -- Intro to Calculus
  'MATH-HPRECALC'   -- Honors Precalculus
);

-- 2. Retire the 'college_preparatory' subject area. Drop its course
--    tags and its (always-empty post-0032) requirement row. Supersedes
--    the college_preparatory rows seeded by migration 0032.
delete from course_subject_assignments
where subject_area = 'college_preparatory';

delete from graduation_requirements
where subject_area = 'college_preparatory';

commit;
