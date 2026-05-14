-- HBA Phase C — seed canonical course catalogue
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent via
-- ON CONFLICT (code) — re-running updates names/flags but never wipes a row.
--
-- Source of truth: lib/course-catalog.ts. Keep this migration in sync when
-- adding / renaming courses there. (Future course additions can also be made
-- via /admin/academics/courses, but the seed gives every fresh database a
-- complete starting catalogue.)
--
-- Powers:
--   - /admin/academics/courses (catalogue management)
--   - /faculty-portal/teaching qualifications dropdown
--   - Scheduler "Seed teacher qualifications from bios" (matches bio course
--     names against catalogue names by lowercase, exact)
--   - Section creation (a section is an instance of one of these courses)

begin;

insert into courses (code, name, subject, department, description, grade_levels, is_ap, is_honors, is_elective, credit_hours, active)
values
  ('MATH-ALG1', 'Algebra 1', 'Mathematics', 'math', null, array['9', '10']::text[], false, false, false, 1, true),
  ('MATH-GEO', 'Geometry', 'Mathematics', 'math', null, array['9', '10', '11']::text[], false, false, false, 1, true),
  ('MATH-ALG2', 'Algebra 2', 'Mathematics', 'math', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('MATH-IM1', 'Integrated Math 1', 'Mathematics', 'math', null, array['9']::text[], false, false, false, 1, true),
  ('MATH-IM2', 'Integrated Math 2', 'Mathematics', 'math', null, array['10']::text[], false, false, false, 1, true),
  ('MATH-IM3', 'Integrated Math 3', 'Mathematics', 'math', null, array['11']::text[], false, false, false, 1, true),
  ('MATH-HIM1', 'Integrated Math 1 (H)', 'Mathematics', 'math', null, array['9']::text[], false, true, false, 1, true),
  ('MATH-HIM2', 'Integrated Math 2 (H)', 'Mathematics', 'math', null, array['10']::text[], false, true, false, 1, true),
  ('MATH-HIM3', 'Integrated Math 3 (H)', 'Mathematics', 'math', null, array['11']::text[], false, true, false, 1, true),
  ('MATH-PRECALC', 'Intro to Calculus', 'Mathematics', 'math', null, array['11', '12']::text[], false, false, false, 1, true),
  ('MATH-APPRECALC', 'AP Precalculus', 'Mathematics', 'math', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('MATH-APSTATS', 'AP Statistics', 'Mathematics', 'math', null, array['11', '12']::text[], true, false, false, 1, true),
  ('MATH-APCALCAB', 'AP Calculus AB', 'Mathematics', 'math', null, array['11', '12']::text[], true, false, false, 1, true),
  ('MATH-APCALCBC', 'AP Calculus BC', 'Mathematics', 'math', null, array['11', '12']::text[], true, false, false, 1, true),
  ('MATH-HLINALG', 'Linear Algebra (H)', 'Mathematics', 'math', null, array['11', '12']::text[], false, true, false, 1, true),
  ('MATH-HMULTIVAR', 'Multivariable Calculus (H)', 'Mathematics', 'math', null, array['11', '12']::text[], false, true, false, 1, true),
  ('MATH-HGROUP', 'Group Theory and Abstract Algebra (H)', 'Mathematics', 'math', null, array['11', '12']::text[], false, true, false, 1, true),
  ('MATH-HSET', 'Set Theory and Real Analysis (H)', 'Mathematics', 'math', null, array['11', '12']::text[], false, true, false, 1, true),
  ('MATH-HMLMATH', 'Mathematics of Machine Learning (H)', 'Mathematics', 'math', null, array['11', '12']::text[], false, true, false, 1, true),
  ('SCI-BIO', 'Biology: The Living Earth', 'Science', 'science', null, array['9', '10']::text[], false, false, false, 1, true),
  ('SCI-HBIO', 'Biology (H)', 'Science', 'science', null, array['9', '10']::text[], false, true, false, 1, true),
  ('SCI-CHEM', 'Chemistry: In the Earth System', 'Science', 'science', null, array['10', '11']::text[], false, false, false, 1, true),
  ('SCI-HCHEM', 'Chemistry: In the Earth System (H)', 'Science', 'science', null, array['10', '11']::text[], false, true, false, 1, true),
  ('SCI-PHYS', 'Physics of the Universe', 'Science', 'science', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('SCI-ENVI', 'Environmental Science', 'Science', 'science', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('SCI-APBIO', 'AP Biology', 'Science', 'science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SCI-APCHEM', 'AP Chemistry', 'Science', 'science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SCI-APENVI', 'AP Environmental Science', 'Science', 'science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SCI-APPHYS1', 'AP Physics 1', 'Science', 'science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SCI-APPHYS2', 'AP Physics 2', 'Science', 'science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SCI-APPHYSC-MECH', 'AP Physics C: Mechanics', 'Science', 'science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SCI-APPHYSC-EM', 'AP Physics C: Electricity and Magnetism', 'Science', 'science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('CS-INTROPROG', 'Intro to Programming', 'Computer Science', 'computer-science', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('CS-INTROROBOT', 'Intro to Robotic Engineering', 'Computer Science', 'computer-science', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('CS-DIGITALART', 'Digital Art', 'Computer Science', 'computer-science', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('CS-APCSP', 'AP Computer Science Principles', 'Computer Science', 'computer-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('CS-APCSA', 'AP Computer Science A', 'Computer Science', 'computer-science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SS-WORLD', 'World History', 'Social Science', 'social-science', null, array['10']::text[], false, false, false, 1, true),
  ('SS-ETHNIC', 'Ethnic Studies', 'Social Science', 'social-science', null, array['9', '10', '11', '12']::text[], false, false, false, 0.5, true),
  ('SS-USHIST', 'United States History', 'Social Science', 'social-science', null, array['11']::text[], false, false, false, 1, true),
  ('SS-ECON', 'Economics', 'Social Science', 'social-science', null, array['12']::text[], false, false, false, 0.5, true),
  ('SS-PERSFIN', 'Personal Finance', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], false, false, true, 0.5, true),
  ('SS-PSYCH', 'Psychology', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], false, false, true, 1, true),
  ('SS-APUSG', 'AP United States Government and Politics', 'Social Science', 'social-science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SS-APCOMPG', 'AP Comparative Government and Politics', 'Social Science', 'social-science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SS-APWORLD', 'AP World History: Modern', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SS-APUSHIST', 'AP United States History', 'Social Science', 'social-science', null, array['11', '12']::text[], true, false, false, 1, true),
  ('SS-APEUROHIST', 'AP European History', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SS-APAAS', 'AP African American Studies', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SS-APPSYCH', 'AP Psychology', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('SS-APHUMGEO', 'AP Human Geography', 'Social Science', 'social-science', null, array['9', '10', '11', '12']::text[], true, false, false, 1, true),
  ('SS-APMACRO', 'AP Macroeconomics', 'Social Science', 'social-science', null, array['11', '12']::text[], true, false, false, 0.5, true),
  ('SS-APMICRO', 'AP Microeconomics', 'Social Science', 'social-science', null, array['11', '12']::text[], true, false, false, 0.5, true),
  ('SS-APBUSFIN', 'AP Business with Personal Finance', 'Social Science', 'social-science', null, array['10', '11', '12']::text[], true, false, false, 1, true),
  ('ENG-SUPPORT', 'English Support', 'English', 'english', 'ELD / ESL pull-out support for English-language learners.', array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('ENG-9', 'English 9', 'English', 'english', null, array['9']::text[], false, false, false, 1, true),
  ('ENG-10', 'English 10', 'English', 'english', null, array['10']::text[], false, false, false, 1, true),
  ('ENG-11', 'English 11', 'English', 'english', null, array['11']::text[], false, false, false, 1, true),
  ('ENG-12', 'English 12', 'English', 'english', null, array['12']::text[], false, false, false, 1, true),
  ('ENG-APLANG', 'AP English Language and Composition', 'English', 'english', null, array['11', '12']::text[], true, false, false, 1, true),
  ('ENG-APLIT', 'AP English Literature and Composition', 'English', 'english', null, array['12']::text[], true, false, false, 1, true),
  ('ENG-APSEM', 'AP Seminar', 'English', 'english', 'AP Capstone Diploma program. Live instructor only. Pairs with AP Research.', array['10', '11']::text[], true, false, false, 1, true),
  ('ENG-APRES', 'AP Research', 'English', 'english', 'AP Capstone Diploma program. Live instructor only. Requires AP Seminar prerequisite.', array['11', '12']::text[], true, false, false, 1, true),
  ('LANG-SPAN1', 'Spanish 1', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-SPAN2', 'Spanish 2', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-SPAN3', 'Spanish 3', 'World Languages', 'world-languages', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-SPAN4', 'Spanish 4', 'World Languages', 'world-languages', null, array['11', '12']::text[], false, false, false, 1, true),
  ('LANG-APSPAN', 'AP Spanish Language and Culture', 'World Languages', 'world-languages', null, array['11', '12']::text[], true, false, false, 1, true),
  ('LANG-FREN1', 'French 1', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-FREN2', 'French 2', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-FREN3', 'French 3', 'World Languages', 'world-languages', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-FREN4', 'French 4', 'World Languages', 'world-languages', null, array['11', '12']::text[], false, false, false, 1, true),
  ('LANG-APFREN', 'AP French Language and Culture', 'World Languages', 'world-languages', null, array['11', '12']::text[], true, false, false, 1, true),
  ('LANG-CHIN1', 'Chinese 1', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-CHIN2', 'Chinese 2', 'World Languages', 'world-languages', null, array['9', '10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-CHIN3', 'Chinese 3', 'World Languages', 'world-languages', null, array['10', '11', '12']::text[], false, false, false, 1, true),
  ('LANG-CHIN4', 'Chinese 4', 'World Languages', 'world-languages', null, array['11', '12']::text[], false, false, false, 1, true),
  ('LANG-APCHIN', 'AP Chinese Language and Culture', 'World Languages', 'world-languages', null, array['11', '12']::text[], true, false, false, 1, true),
  ('ELEC-STUDIOART', 'Studio Art', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('ELEC-APARTHIST', 'AP Art History', 'Electives', 'electives', null, array['10', '11', '12']::text[], true, false, true, 1, true),
  ('ELEC-APMUSIC', 'AP Music Theory', 'Electives', 'electives', null, array['10', '11', '12']::text[], true, false, true, 1, true),
  ('ELEC-AP3DART', 'AP 3D Art and Design', 'Electives', 'electives', null, array['10', '11', '12']::text[], true, false, true, 1, true),
  ('ELEC-LOGIC', 'Logic and Philosophy', 'Electives', 'electives', null, array['10', '11', '12']::text[], false, false, true, 1, true),
  ('ELEC-CREATWRIT', 'Creative Writing', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('ELEC-PUBSPEAK', 'Public Speaking', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('ELEC-JOURNAL', 'Journalism', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('ELEC-YEARBOOK', 'Yearbook', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 1, true),
  ('ELEC-APPMAG', 'Art | Poetry | Prose Magazine', 'Electives', 'electives', 'HBA''s student-run literary and arts magazine.', array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('ELEC-COMMSERV', 'Community Service', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('ELEC-MODELUN', 'Model UN', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('ELEC-COOKING', 'Cooking', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('ELEC-HEALTH', 'Health', 'Electives', 'electives', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('PE-FITNESS', 'PE Fitness', 'Physical Education', 'pe', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('PE-GOLF', 'PE Golf', 'Physical Education', 'pe', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true),
  ('PE-HIKING', 'PE Hiking', 'Physical Education', 'pe', null, array['9', '10', '11', '12']::text[], false, false, true, 0.5, true)
on conflict (code) do update
  set
    name = excluded.name,
    subject = excluded.subject,
    department = excluded.department,
    description = excluded.description,
    grade_levels = excluded.grade_levels,
    is_ap = excluded.is_ap,
    is_honors = excluded.is_honors,
    is_elective = excluded.is_elective,
    credit_hours = excluded.credit_hours,
    active = excluded.active;

commit;

