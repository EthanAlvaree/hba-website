-- Track Stripe registration-fee payments per application.
--
-- How to apply: handled by `npm run db:migrate`. Idempotent.
--
-- The apply wizard's Submit button now redirects the family to a Stripe
-- hosted Payment Link (gated submit — they can't apply without paying
-- the $350 registration fee). Stripe's webhook calls back to the SIS
-- and we flip these columns to mark the application paid; only then do
-- admin notifications go out and the application enters the active
-- queue from the office's point of view.
--
-- A 100%-off coupon (Admin100Off) lets staff test the full flow
-- end-to-end without a real charge — Stripe still fires the same
-- checkout.session.completed event with payment_status=paid.

begin;

alter table applications
  add column if not exists fee_paid_at timestamptz,
  add column if not exists stripe_session_id text;

create index if not exists applications_fee_paid_at_idx
  on applications(fee_paid_at);

commit;
