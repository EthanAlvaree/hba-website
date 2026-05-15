-- HBA Phase C — scheduled mass emails
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: most school-wide announcements are planned ("send Tuesday
-- morning at 7am") not in-the-moment. Until now /admin/messaging only
-- supported send-now. This table queues a planned send + audience
-- filter + body, and a Vercel cron dispatches it when the scheduled
-- time arrives.
--
-- Resolution: the cron runs every ~5 min, claims rows where
-- scheduled_for <= now() AND status = 'pending', flips them to
-- 'sending', dispatches, and flips them to 'sent' (or 'failed' with
-- a reason).
--
-- We write to sent_mass_emails at dispatch time as well — that table
-- is the "log of what was sent" and shouldn't have un-sent rows.

begin;

create table if not exists scheduled_mass_emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Cohort filters (same shape as sent_mass_emails)
  cohort_audience text not null,
  cohort_grade text,
  cohort_section_id uuid,

  -- Compose
  subject text not null,
  body text not null,                  -- raw text; the dispatcher
                                       -- builds the final html with the
                                       -- school footer at send time

  -- Sender (resolved at compose time so a future env-var change can't
  -- silently reroute a queued send)
  sender_email text not null,
  sender_label text,

  -- Scheduling
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','cancelled')),
  failure_reason text,

  -- Pointer to the resulting log row once dispatched (null until sent)
  sent_mass_email_id uuid references sent_mass_emails(id) on delete set null,

  -- Audit
  created_by_email text not null,
  created_by_profile_id uuid references profiles(id) on delete set null,
  cancelled_by_email text,
  cancelled_at timestamptz
);

create index if not exists scheduled_mass_emails_due_idx
  on scheduled_mass_emails (scheduled_for)
  where status = 'pending';

create index if not exists scheduled_mass_emails_created_idx
  on scheduled_mass_emails (created_at desc);

drop trigger if exists scheduled_mass_emails_set_updated_at on scheduled_mass_emails;
create trigger scheduled_mass_emails_set_updated_at
  before update on scheduled_mass_emails
  for each row execute function set_updated_at();

commit;
