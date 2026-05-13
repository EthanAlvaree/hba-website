-- HBA Phase C — sent mass email log
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: when an admin sends to a cohort via /admin/messaging, we record
-- one row here so the office can answer "who has been emailed and when?"
-- and operationally so we never accidentally double-send the same message
-- twice. recipients is a JSONB array of email addresses; if a school
-- grows to many thousands we'd switch to a child table.

begin;

create table if not exists sent_mass_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  sender_email text not null,      -- the mailbox sendMail was called on
  sender_label text,                -- display name shown in the message header

  cohort_audience text not null,    -- "parents" | "students" | "all_school" | ...
  cohort_grade text,
  cohort_section_id uuid,

  subject text not null,
  body_html text not null,

  recipient_count int not null,
  recipients jsonb not null,        -- string[]; for audit, not for re-send
  sent_count int not null,
  failed_count int not null,
  failed_recipients jsonb,          -- string[] of emails that errored

  sent_by_email text not null,      -- the admin who triggered the send
  sent_by_profile_id uuid references profiles(id) on delete set null
);

create index if not exists sent_mass_emails_created_idx
  on sent_mass_emails (created_at desc);
create index if not exists sent_mass_emails_sent_by_idx
  on sent_mass_emails (sent_by_email);

commit;
