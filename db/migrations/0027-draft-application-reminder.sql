-- Tracks when we last nudged a draft applicant.
--
-- Used by the daily inactivity-reminder cron at
-- /api/cron/draft-application-reminders. The cron picks up drafts that
-- haven't been touched in a week and aren't yet expired, sends a
-- friendly "your application is waiting" email to draft_email, and
-- stamps this column so we only nudge once. (If a parent saves again
-- after being nudged, draft_expires_at gets refreshed but
-- draft_reminder_sent_at stays set — that's fine. The reminder did its
-- job: the parent came back.)

begin;

alter table applications
  add column if not exists draft_reminder_sent_at timestamptz;

-- Helps the cron's filter (drafts that haven't been reminded yet, and
-- aren't expired) without scanning the full applications table.
create index if not exists applications_draft_reminder_pending_idx
  on applications(updated_at)
  where status = 'draft'
    and draft_reminder_sent_at is null
    and draft_token is not null;

commit;
