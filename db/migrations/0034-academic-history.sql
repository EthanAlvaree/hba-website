-- Academic history: coursework a student completed at another school.
--
-- How to apply: paste into the Supabase SQL editor and run.
--
-- HBA enrolls a fair number of transfer students. Their prior coursework
-- belongs on the HBA transcript as a cumulative record, but it is NOT
-- HBA coursework: HBA never re-grades it, never schedules it, and the
-- scheduler must never see it. So it lives in its own table — not as
-- fake `enrollments` rows.
--
-- buildTranscriptForStudent() unions these rows with locked HBA
-- enrollments to produce the cumulative GPA; the HBA-only GPA ignores
-- them. The graduation trajectory counts a row's `credits` toward its
-- `subject_area` bucket.
--
-- Retake model: when a student failed a class elsewhere and retook it at
-- HBA, the HBA retake is a normal enrollment with an HBA grade. The
-- original external attempt is recorded here with `superseded = true` —
-- it stays visible on the transcript (struck through) but is excluded
-- from both GPA and credit math, so the cumulative GPA reflects the
-- retake, not the original failure.

begin;

create table if not exists academic_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  student_id uuid not null references students(id) on delete cascade,

  -- Course title exactly as named at the originating school, plus that
  -- school's name. We keep the original title — articulation to an HBA
  -- equivalent is expressed by `subject_area` / `course_id`, not by
  -- renaming what the student actually took.
  title text not null,
  school_name text not null,

  -- Free-text so it survives whatever the prior school's calendar was.
  academic_year text,            -- e.g. "2023-24"
  term_label text,               -- e.g. "Fall", "Semester 1", "Full year"

  -- Standard +/- letters (A … F) or null for in-progress / ungraded.
  grade_letter text,
  credits numeric(4,2) not null default 1,

  -- Which graduation bucket this counts toward. One of lib/scheduler
  -- subjectAreas, or null when it doesn't map to a tracked requirement.
  subject_area text,

  -- Optional articulation link to the closest HBA catalogue course
  -- (e.g. an incoming "Algebra 1" -> Integrated Math 1). Informational;
  -- on delete of the course we just clear the link.
  course_id uuid references courses(id) on delete set null,

  -- Where the credit came from. Drives nothing in logic today but lets
  -- the office distinguish a true transfer from summer / community-
  -- college concurrent enrollment on the transcript.
  source text not null default 'transfer'
    check (source in ('transfer', 'summer', 'concurrent', 'other')),

  -- Honors / AP weighting for the cumulative weighted GPA.
  is_ap boolean not null default false,
  is_honors boolean not null default false,

  -- Credit-only acceptance (Pass / credit-recovery grades that carry
  -- credit but no grade points). When false, the row still counts for
  -- credit but is skipped in GPA math.
  counts_toward_gpa boolean not null default true,

  -- Retaken at HBA — excluded from BOTH cumulative GPA and credit, but
  -- still rendered on the transcript for completeness.
  superseded boolean not null default false,

  notes text,

  check (credits >= 0)
);

create index if not exists academic_history_student_idx
  on academic_history(student_id);

drop trigger if exists academic_history_updated_at on academic_history;
create trigger academic_history_updated_at
before update on academic_history
for each row
execute function set_updated_at();

commit;
