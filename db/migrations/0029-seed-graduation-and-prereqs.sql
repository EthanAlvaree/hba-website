-- Seed graduation requirements, course → subject mappings, course
-- prerequisite chains, and alternating-year offering patterns.
--
-- Idempotent — re-running this script updates existing rows but never
-- inserts duplicates. Admin can edit any of these from
-- /admin/academics/requirements (and downstream UIs we'll add) without
-- fear of being overwritten by a re-run; the upserts only touch the
-- specific columns this seed owns.
--
-- Source of truth for HBA's published requirements:
--   English: 3 yrs basic, 4 yrs college-bound
--   Math: 2 yrs basic, 3 yrs college-bound (4 recommended for STEM-track)
--   Science: 2 yrs basic, 3 yrs college-bound
--   Social Studies: 2 yrs basic, 3 yrs college-bound
--   Visual & Performing Arts: 1 yr (foreign language can substitute)
--   World Languages: 0 basic, 2 college-bound (3 recommended)
--   Physical Education: 2 yrs (unless admin-approved exemption)
--   College Preparatory: 0 basic, 1 college-bound
--
-- The "art ↔ foreign language" substitution rule isn't expressed in
-- the schema today — admins handle it manually on the trajectory page
-- via a per-student override. Same for the PE exemption.

begin;

-- ---------------------------------------------------------------------------
-- graduation_requirements
-- ---------------------------------------------------------------------------
--
-- Two rows per subject (one per track) so a college-bound student's
-- trajectory pulls a strict requirement while a basic-diploma student
-- gets the lighter ask. The trajectory UI picks the row matching the
-- student's chosen track; an "all" row applies to both tracks (used
-- for PE + Arts where the requirement is identical).

insert into graduation_requirements (name, subject_area, required_credits, track, notes)
values
  ('English (basic diploma)',        'english',                3, 'basic',          'Three years of English required for the HBA basic diploma.'),
  ('English (college-bound)',        'english',                4, 'college_bound',  'Four years of English recommended for college-bound students. Includes AP Lang / AP Lit.'),
  ('Math (basic diploma)',           'math',                   2, 'basic',          'Two years of math required for the HBA basic diploma.'),
  ('Math (college-bound)',           'math',                   3, 'college_bound',  'Three to four years of math recommended for college-bound students; STEM-track students should aim for four.'),
  ('Science (basic diploma)',        'science',                2, 'basic',          'Two years of science required for the HBA basic diploma.'),
  ('Science (college-bound)',        'science',                3, 'college_bound',  'Three years of science recommended for college-bound students.'),
  ('Social studies (basic diploma)', 'social_studies',         2, 'basic',          'Two years of social studies required for the HBA basic diploma.'),
  ('Social studies (college-bound)', 'social_studies',         3, 'college_bound',  'Three years of social studies recommended for college-bound students.'),
  ('Visual & performing arts',       'visual_performing_arts', 1, 'all',            'One year of art required. An academic year of a foreign language can substitute — admin grants the substitution per student.'),
  ('World languages (college-bound)','world_languages',        2, 'college_bound',  'Two to three years of a single world language recommended for college-bound students.'),
  ('Physical education',             'physical_education',     2, 'all',            'Two years of PE required unless an exemption is approved by school administration.'),
  ('College-preparatory',            'college_preparatory',    1, 'college_bound',  'One year of an additional college-preparatory course required for college-bound students. Admin classifies which catalog courses count.')
on conflict do nothing;

-- Backfill: if these rows already exist (from prior tinkering) ensure
-- the credit + notes columns match the canonical values.
update graduation_requirements
set required_credits = 3, notes = 'Three years of English required for the HBA basic diploma.'
where subject_area = 'english' and track = 'basic';

update graduation_requirements
set required_credits = 4, notes = 'Four years of English recommended for college-bound students. Includes AP Lang / AP Lit.'
where subject_area = 'english' and track = 'college_bound';

update graduation_requirements
set required_credits = 2
where subject_area = 'math' and track = 'basic';

update graduation_requirements
set required_credits = 3
where subject_area = 'math' and track = 'college_bound';

update graduation_requirements
set required_credits = 2
where subject_area = 'science' and track = 'basic';

update graduation_requirements
set required_credits = 3
where subject_area = 'science' and track = 'college_bound';

update graduation_requirements
set required_credits = 2
where subject_area = 'social_studies' and track = 'basic';

update graduation_requirements
set required_credits = 3
where subject_area = 'social_studies' and track = 'college_bound';

update graduation_requirements
set required_credits = 1
where subject_area = 'visual_performing_arts' and track = 'all';

update graduation_requirements
set required_credits = 2
where subject_area = 'world_languages' and track = 'college_bound';

update graduation_requirements
set required_credits = 2
where subject_area = 'physical_education' and track = 'all';

update graduation_requirements
set required_credits = 1
where subject_area = 'college_preparatory' and track = 'college_bound';

-- ---------------------------------------------------------------------------
-- course_subject_assignments
-- ---------------------------------------------------------------------------
--
-- Every catalog course maps to exactly one subject_area. The mapping
-- is generated from the course code prefix; admin can re-assign on the
-- /admin/academics/courses page later. Idempotent: upsert on
-- (course_id) — the primary key.

insert into course_subject_assignments (course_id, subject_area)
select
  c.id,
  case
    when c.code like 'ENG-%'  then 'english'
    when c.code like 'MATH-%' then 'math'
    when c.code like 'SCI-%'  then 'science'
    when c.code like 'SS-%'   then 'social_studies'
    when c.code like 'LANG-%' then 'world_languages'
    when c.code like 'PE-%'   then 'physical_education'
    when c.code in ('ELEC-STUDIOART', 'ELEC-APARTHIST', 'ELEC-APMUSIC')
                              then 'visual_performing_arts'
    when c.code like 'CS-AP%' then 'college_preparatory'
    else                           'elective'
  end as subject_area
from courses c
on conflict (course_id) do update
  set subject_area = excluded.subject_area;

-- ---------------------------------------------------------------------------
-- course offering patterns
-- ---------------------------------------------------------------------------
--
-- AP Lang runs on odd-start school years (2025-26, 2027-28, …).
-- AP Lit runs on even-start school years (2026-27, 2028-29, …).
-- That way the same student can take both: AP Lang as a junior,
-- AP Lit as a senior (or vice versa, depending on when they entered
-- HBA's rotation).
--
-- Everything else stays 'always' (the default).

update courses set offered_pattern = 'odd_start_year'  where code = 'ENG-APLANG';
update courses set offered_pattern = 'even_start_year' where code = 'ENG-APLIT';

-- ---------------------------------------------------------------------------
-- course_prerequisites
-- ---------------------------------------------------------------------------
--
-- Hard prereqs only — the recommended-prereq layer is left empty for
-- now and admin can flesh it out. group_key is used for OR-chains
-- (e.g. honors and standard precalc both unlock Calc AB).
--
-- We resolve course UUIDs by code, so this is safe even if course IDs
-- rotate across environments.

with code_id as (
  select id, code from courses
)
insert into course_prerequisites (course_id, prerequisite_course_id, kind, group_key, notes)
select
  c.id as course_id,
  p.id as prerequisite_course_id,
  pr.kind,
  pr.group_key,
  pr.notes
from (values
  -- English sequence
  ('ENG-10', 'ENG-9',    'hard', null, null),
  ('ENG-11', 'ENG-10',   'hard', null, null),
  ('ENG-12', 'ENG-11',   'hard', null, null),
  -- AP Capstone: Research requires Seminar
  ('ENG-APRES', 'ENG-APSEM', 'hard', null, 'AP Capstone Diploma: AP Research requires AP Seminar.'),

  -- Standard integrated math sequence
  ('MATH-IM2', 'MATH-IM1', 'hard', null, null),
  ('MATH-IM3', 'MATH-IM2', 'hard', null, null),
  -- Honors integrated math sequence
  ('MATH-HIM2', 'MATH-HIM1', 'hard', null, null),
  ('MATH-HIM3', 'MATH-HIM2', 'hard', null, null),
  -- Precalc unlocks Calc AB (any IM3 path counts)
  ('MATH-PRECALC',   'MATH-IM3',  'hard', 'precalc_entry', null),
  ('MATH-PRECALC',   'MATH-HIM3', 'hard', 'precalc_entry', null),
  ('MATH-HPRECALC',  'MATH-HIM3', 'hard', null, null),
  ('MATH-APPRECALC', 'MATH-HIM3', 'hard', null, null),
  -- Calc AB unlocked by any precalc variant
  ('MATH-APCALCAB', 'MATH-PRECALC',   'hard', 'calcab_entry', null),
  ('MATH-APCALCAB', 'MATH-HPRECALC',  'hard', 'calcab_entry', null),
  ('MATH-APCALCAB', 'MATH-APPRECALC', 'hard', 'calcab_entry', null),
  -- Calc BC: prefer honors precalc, AP precalc, or Calc AB
  ('MATH-APCALCBC', 'MATH-HPRECALC',  'hard', 'calcbc_entry', null),
  ('MATH-APCALCBC', 'MATH-APPRECALC', 'hard', 'calcbc_entry', null),
  ('MATH-APCALCBC', 'MATH-APCALCAB',  'hard', 'calcbc_entry', null),
  -- Stats: precalc-level math (any flavor)
  ('MATH-APSTATS', 'MATH-PRECALC',   'hard', 'stats_entry', null),
  ('MATH-APSTATS', 'MATH-HPRECALC',  'hard', 'stats_entry', null),
  ('MATH-APSTATS', 'MATH-APPRECALC', 'hard', 'stats_entry', null),
  -- Linear algebra unlocks after a precalc variant
  ('MATH-HLINALG', 'MATH-HPRECALC',  'hard', 'linalg_entry', null),
  ('MATH-HLINALG', 'MATH-APPRECALC', 'hard', 'linalg_entry', null),
  ('MATH-HLINALG', 'MATH-APCALCAB',  'hard', 'linalg_entry', null),
  -- Multivariable + further honors math gated by Calc BC
  ('MATH-HMULTIVAR', 'MATH-APCALCBC', 'hard', null, null),
  ('MATH-HGROUP',    'MATH-HMULTIVAR', 'hard', null, null),
  ('MATH-HSET',      'MATH-HMULTIVAR', 'hard', null, null),
  -- ML Math needs the linear-algebra foundation
  ('MATH-HMLMATH', 'MATH-HLINALG', 'hard', null, null),

  -- World languages: each level requires the previous one
  ('LANG-SPAN2', 'LANG-SPAN1', 'hard', null, null),
  ('LANG-SPAN3', 'LANG-SPAN2', 'hard', null, null),
  ('LANG-SPAN4', 'LANG-SPAN3', 'hard', null, null),
  ('LANG-APSPAN', 'LANG-SPAN4', 'hard', null, null),
  ('LANG-FREN2', 'LANG-FREN1', 'hard', null, null),
  ('LANG-FREN3', 'LANG-FREN2', 'hard', null, null),
  ('LANG-FREN4', 'LANG-FREN3', 'hard', null, null),
  ('LANG-APFREN', 'LANG-FREN4', 'hard', null, null),
  ('LANG-CHIN2', 'LANG-CHIN1', 'hard', null, null),
  ('LANG-CHIN3', 'LANG-CHIN2', 'hard', null, null),
  ('LANG-CHIN4', 'LANG-CHIN3', 'hard', null, null),
  ('LANG-APCHIN', 'LANG-CHIN4', 'hard', null, null),

  -- CS sequence: APCSA after APCSP (recommended path)
  ('CS-APCSA', 'CS-APCSP', 'recommended', null, 'AP CS Principles is the typical lead-in to AP CS A.'),

  -- AP US History after standard US History
  ('SS-APUSHIST', 'SS-USHIST', 'recommended', null, 'AP USH benefits from a year of standard US History first.')
) as pr(course_code, prereq_code, kind, group_key, notes)
join code_id c on c.code = pr.course_code
join code_id p on p.code = pr.prereq_code
on conflict (course_id, prerequisite_course_id) do update
  set kind = excluded.kind,
      group_key = excluded.group_key,
      notes = excluded.notes;

commit;