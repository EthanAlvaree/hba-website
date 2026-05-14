-- Honors course-name standardization + two new state-requirement courses.
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.
--
--  1. Convert every "Honors X" course name to "X (H)" so the catalogue
--     matches the standardized UC A-G titles and sorts cleanly. The
--     regex handles any honors course, including ones added via
--     /admin/academics/courses after the 0011 seed. Mirrored in
--     lib/course-catalog.ts + the 0011 seed.
--
--  2. Seed two courses HBA is adding for new CA graduation requirements:
--     AP 3D Art and Design, and Ethnic Studies (one-semester, CA AB 101).
--     Both also added to lib/course-catalog.ts + the 0011 seed.

begin;

-- 1. "Honors X" -> "X (H)"
update courses
set name = regexp_replace(name, '^Honors (.+)$', '\1 (H)')
where name like 'Honors %';

-- 2. New courses.
insert into courses
  (code, name, subject, department, description, grade_levels,
   is_ap, is_honors, is_elective, credit_hours, active)
values
  ('ELEC-AP3DART', 'AP 3D Art and Design', 'Electives', 'electives', null,
   array['10', '11', '12']::text[], true, false, true, 1, true),
  ('SS-ETHNIC', 'Ethnic Studies', 'Social Science', 'social-science', null,
   array['9', '10', '11', '12']::text[], false, false, false, 0.5, true)
on conflict (code) do nothing;

commit;
