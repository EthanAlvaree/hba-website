-- Gradelink migration prep:
--   1. New role 'shared_mailbox' for accounts like info@ / admissions@ /
--      noreply@ / etc. so they have a category that isn't student / parent
--      / faculty / admin. The directory UI gets a new filter for them and
--      they're excluded from student / faculty / admin lists.
--   2. New academic_history.source value 'legacy_hba'. Used by the
--      transfer-credit half of the Gradelink transcript import — rows
--      from HBA's own past terms get source='legacy_hba' so they're
--      distinguishable from true transfer credit (Torrey Pines, BYU,
--      etc.) on the transcript.
--   3. Idempotency keys so re-running the importers is safe:
--      profiles.gradelink_account_id  — Gradelink's AccountId
--      students.gradelink_student_id  — Gradelink's StudentID
--      Both nullable + unique.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.

begin;

-- 1) Roles: add 'shared_mailbox'.
alter table profiles drop constraint if exists profiles_roles_check;
alter table profiles add constraint profiles_roles_check
  check (
    roles <@ array[
      'student',
      'parent',
      'faculty',
      'admin',
      'shared_mailbox'
    ]::text[]
  );

-- 2) academic_history.source: add 'legacy_hba'.
alter table academic_history drop constraint if exists academic_history_source_check;
alter table academic_history add constraint academic_history_source_check
  check (source in ('transfer', 'summer', 'concurrent', 'other', 'legacy_hba'));

-- 3) Idempotency keys.
alter table profiles
  add column if not exists gradelink_account_id text;
alter table students
  add column if not exists gradelink_student_id text;

-- Indexes (partial-unique so multiple null rows are fine — most profiles
-- and students will have no Gradelink id forever).
create unique index if not exists profiles_gradelink_account_id_uidx
  on profiles(gradelink_account_id)
  where gradelink_account_id is not null;
create unique index if not exists students_gradelink_student_id_uidx
  on students(gradelink_student_id)
  where gradelink_student_id is not null;

commit;
