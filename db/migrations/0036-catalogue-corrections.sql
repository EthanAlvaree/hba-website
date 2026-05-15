-- Catalogue corrections from the 2026-27 UC A-G list reconciliation.
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.
--
--  1. Reactivate "Intro to Calculus" (MATH-PRECALC). Migration 0033
--     deactivated it with the other legacy math courses, but HBA does
--     still offer it — it stays on the A-G list, distinct from AP
--     Precalculus. Algebra 1 / Geometry / Algebra 2 / Honors Precalculus
--     stay deactivated; those really are retired.
--
--  2. Rename U.S. History -> United States History (SS-USHIST) to match
--     the standardized A-G course title. Also applied to the
--     lib/course-catalog.ts source of truth + the 0011 seed.

begin;

update courses set active = true where code = 'MATH-PRECALC';

update courses set name = 'United States History' where code = 'SS-USHIST';

commit;
