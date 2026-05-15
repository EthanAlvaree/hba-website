-- Re-seed graduation requirements + course→subject assignments for the
-- many-to-many model introduced in 0031.
--
-- Key rule the office cares about: a course's membership in the
-- 'elective' subject area is what makes it Friday-elective-only in the
-- scheduler. So this seed puts every is_elective=true course into
-- 'elective' — EXCEPT Digital Art, which is taught Mon-Thu and instead
-- goes into Computer Science + Visual & Performing Arts.
--
-- All of this is editable from /admin/academics/requirements after the
-- fact — re-categorizing a course (e.g. moving Personal Finance out of
-- Elective into Social Studies) is exactly how the office makes it
-- weekday-schedulable.

begin;

-- ---------------------------------------------------------------------------
-- graduation_requirements: ensure a row exists for every subject area.
-- ---------------------------------------------------------------------------
-- 0031 already folded the real requirements (English 3/4, Math 2/3, …)
-- into single rows. This only FILLS GAPS — Computer Science + Elective
-- never had rows — and never clobbers existing credits or admin edits
-- (on conflict do nothing).

insert into graduation_requirements
  (name, subject_area, required_credits_basic, required_credits_college_bound,
   applies_to_grade_levels, notes)
values
  ('English', 'english', 3, 4, '{}',
   'Three years for the basic diploma; four recommended for college-bound (includes AP Lang / AP Lit).'),
  ('Math', 'math', 2, 3, '{}',
   'Two years for the basic diploma; three to four recommended for college-bound.'),
  ('Science', 'science', 2, 3, '{}',
   'Two years for the basic diploma; three recommended for college-bound.'),
  ('Social studies', 'social_studies', 2, 3, '{}',
   'Two years for the basic diploma; three recommended for college-bound.'),
  ('World languages', 'world_languages', 0, 2, '{}',
   'Two to three years of a single language recommended for college-bound students.'),
  ('Visual & performing arts', 'visual_performing_arts', 1, 1, '{}',
   'One year required. A year of a world language can substitute — admin grants per student.'),
  ('Physical education', 'physical_education', 2, 2, '{}',
   'Two years required unless an exemption is approved by administration.'),
  ('College-preparatory', 'college_preparatory', 0, 1, '{}',
   'One additional college-prep course required for college-bound students.'),
  ('Computer science', 'computer_science', 0, 0, '{}',
   'Not a graduation requirement on its own — a category for tagging CS courses.'),
  ('Elective', 'elective', 0, 0, '{}',
   'Not a graduation requirement. A course''s membership here marks it Friday-elective-only for the scheduler.')
on conflict (subject_area) do nothing;

-- ---------------------------------------------------------------------------
-- course_subject_assignments: full re-seed (many-to-many).
-- ---------------------------------------------------------------------------
-- The old one-to-one seed (0029) is wiped and rebuilt. Any admin
-- re-categorization done before this migration is lost — acceptable
-- because the proper editing UI ships alongside this change.

delete from course_subject_assignments;

-- Rule 1: natural subject area by course-code prefix.
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
    when c.code like 'CS-%'   then 'computer_science'
  end
from courses c
where c.code ~ '^(ENG|MATH|SCI|SS|LANG|PE|CS)-'
on conflict do nothing;

-- Rule 2: Visual & performing arts — the three arts electives, plus
-- Digital Art (a CS course that also counts as VPA).
insert into course_subject_assignments (course_id, subject_area)
select c.id, 'visual_performing_arts'
from courses c
where c.code in (
  'ELEC-STUDIOART', 'ELEC-APARTHIST', 'ELEC-APMUSIC', 'CS-DIGITALART'
)
on conflict do nothing;

-- Rule 3: Elective — every catalog course flagged is_elective, EXCEPT
-- Digital Art (taught Mon-Thu). This membership is the scheduler's
-- Friday-only signal.
insert into course_subject_assignments (course_id, subject_area)
select c.id, 'elective'
from courses c
where c.is_elective = true
  and c.code <> 'CS-DIGITALART'
on conflict do nothing;

commit;
