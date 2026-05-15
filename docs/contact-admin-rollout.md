# Contact and admin rollout handoff

This document captures the contact-form replacement, admin-dashboard implementation, and the main rollout/debugging decisions so future sessions can work from the current state instead of re-deriving context.

## What was built

- Replaced the old Tally embed with a native Next.js contact form.
- Added server-side validation and submission handling for the public form.
- Added Supabase persistence for contact submissions.
- Added Cloudflare Turnstile spam protection.
- Added Microsoft Graph email notifications to `info@highbluffacademy.com`.
- Added an admin dashboard with Microsoft Entra sign-in for reviewing and triaging submissions.

## Main request flow

Public form flow:

1. `app/contact/ContactForm.tsx`
2. `app/api/contact/route.ts`
3. `lib/contact-submissions.ts`
4. `lib/graph.ts`

Admin auth and dashboard flow:

1. `auth.ts`
2. `app/api/auth/[...nextauth]/route.ts`
3. `app/admin/contact-submissions/page.tsx`
4. `app/admin/contact-submissions/archived/page.tsx`
5. `app/admin/contact-submissions/ContactSubmissionsDashboard.tsx`
6. `app/admin/contact-submissions/actions.ts`

## Data model and workflow notes

- Contact submissions are stored in the `contact_submissions` table in Supabase.
- The `status` column is plain text, so richer workflow stages were rolled out in code without a database migration.
- Current workflow statuses in use are:
  - `new`
  - `follow_up`
  - `tour_scheduled`
  - `tour_completed`
  - `archived`
- Legacy `contacted` is normalized to `follow_up` in code.
- Active and archived queues are separated into different admin pages.
- Archived submissions can be permanently deleted.

## Important verified behavior

- The contact notification email is sent only after `createContactSubmission` succeeds.
- If the office receives the email, the submission was already written to Supabase.
- A missing item in the admin dashboard is more likely to be filtering or sort confusion than a failed write.

## Preview and production rollout notes

- Preview-first review is the preferred workflow for this repo.
- Turnstile preview failures were fixed by:
  - improving server-side verification behavior
  - not sending the optional `remoteip`
  - using Cloudflare test keys locally
  - correcting Vercel preview environment and alias drift
- Production auth uses Microsoft Entra via NextAuth with `trustHost: true`, so callback URLs follow the request host.
- Azure app registration must include every real callback host that users might hit in production, including the `www` host if that is used.

## Recent UX and operations decisions

- Parent/guardian and student naming were clarified across the public form, validation copy, admin dashboard, and Graph notification email.
- The duplicate queue-state card was removed from expanded admin rows.
- The extra parent/guardian badge before submission titles was removed from the admin queue row header.
- The active admin queue now defaults to newest-first so fresh submissions appear at the top.
- The contact page was reorganized so the form is more prominent.
- Supporting contact details were compressed into a side column to avoid awkward wrapping.
- Missing form placeholders were standardized so all primary inputs have clear sample text.

## Files most likely to matter for future work

- `app/contact/page.tsx`
- `app/contact/ContactForm.tsx`
- `app/api/contact/route.ts`
- `app/admin/contact-submissions/page.tsx`
- `app/admin/contact-submissions/archived/page.tsx`
- `app/admin/contact-submissions/ContactSubmissionsDashboard.tsx`
- `app/admin/contact-submissions/actions.ts`
- `lib/contact-submissions.ts`
- `lib/graph.ts`
- `lib/turnstile.ts`
- `auth.ts`

## Current production reference point

- Latest production commit at the time this handoff was written: `9db1f1d`
