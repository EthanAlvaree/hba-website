-- Add the UC A-G category to the courses table.
--
-- How to apply: handled by the migration runner (`npm run db:migrate`).
--
-- Until now the UC A-G letter (A-G) lived only in lib/course-catalog.ts.
-- Phase 2 of the catalogue consolidation makes the courses table the
-- single source of truth, so the column moves into the DB and the
-- static catalogue file goes away. Backfill values are the ones that
-- were in course-catalog.ts.

begin;

alter table courses
  add column if not exists uc_category text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_uc_category_check'
  ) then
    alter table courses
      add constraint courses_uc_category_check
      check (uc_category is null or uc_category in ('A','B','C','D','E','F','G'));
  end if;
end$$;

-- Backfill from the former course-catalog.ts values.
update courses set uc_category = 'A' where code in (
  'SS-WORLD','SS-USHIST','SS-APUSG','SS-APCOMPG','SS-APWORLD',
  'SS-APUSHIST','SS-APEUROHIST','SS-APAAS'
);
update courses set uc_category = 'B' where code in (
  'ENG-9','ENG-10','ENG-11','ENG-12','ENG-APLANG','ENG-APLIT'
);
update courses set uc_category = 'C' where code in (
  'MATH-ALG1','MATH-GEO','MATH-ALG2','MATH-IM1','MATH-IM2','MATH-IM3',
  'MATH-HIM1','MATH-HIM2','MATH-HIM3','MATH-PRECALC','MATH-APPRECALC',
  'MATH-APSTATS','MATH-APCALCAB','MATH-APCALCBC','MATH-HLINALG',
  'MATH-HMULTIVAR','MATH-HGROUP','MATH-HSET','MATH-HMLMATH','CS-APCSA'
);
update courses set uc_category = 'D' where code in (
  'SCI-BIO','SCI-HBIO','SCI-CHEM','SCI-HCHEM','SCI-PHYS','SCI-ENVI',
  'SCI-APBIO','SCI-APCHEM','SCI-APENVI','SCI-APPHYS1','SCI-APPHYS2',
  'SCI-APPHYSC-MECH','SCI-APPHYSC-EM'
);
update courses set uc_category = 'E' where code in (
  'LANG-SPAN1','LANG-SPAN2','LANG-SPAN3','LANG-SPAN4','LANG-APSPAN',
  'LANG-FREN1','LANG-FREN2','LANG-FREN3','LANG-FREN4','LANG-APFREN',
  'LANG-CHIN1','LANG-CHIN2','LANG-CHIN3','LANG-CHIN4','LANG-APCHIN'
);
update courses set uc_category = 'F' where code in (
  'CS-DIGITALART','ELEC-STUDIOART','ELEC-APARTHIST','ELEC-APMUSIC','ELEC-AP3DART'
);
update courses set uc_category = 'G' where code in (
  'CS-INTROPROG','CS-INTROROBOT','CS-APCSP','SS-ECON','SS-PERSFIN','SS-PSYCH',
  'SS-APPSYCH','SS-APHUMGEO','SS-APMACRO','SS-APMICRO','SS-APBUSFIN',
  'ENG-APSEM','ENG-APRES','ELEC-LOGIC','ELEC-CREATWRIT','ELEC-PUBSPEAK','ELEC-JOURNAL'
);

commit;
