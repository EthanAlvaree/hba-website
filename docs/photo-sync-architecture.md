# Photo sync architecture

_Last updated 2026-05-13._

How profile photos flow between the three systems that need to stay in
sync: Microsoft 365, the SIS, and email signatures.

## The systems

1. **Microsoft 365 Azure profile photo** — the user's photo in Outlook,
   Teams, and anywhere else M365 renders them. Source of truth for
   most faculty since they manage it themselves through Outlook /
   Teams.
2. **SIS profile photo** — what shows on every internal portal
   surface: rosters, schedules, parent picker, admin views. Stored in
   the `profile-photos` Supabase Storage bucket.
3. **Email signatures (`/email-signatures/*` in this app)** —
   server-rendered HTML signatures faculty paste into Outlook. Pull
   their photo via a dynamic URL.

A fourth system — the public faculty bios page on the main website —
deliberately does NOT sync. Those photos are larger, often non-square,
and curated separately.

## The flow

```
                       ┌─────────────────────────┐
                       │       Microsoft 365     │
                       │   (Azure Entra tenant)  │
                       └─────────────────────────┘
                          ▲                    │
                          │ PUT photo          │ GET /photo/$value
                          │ (Mail.Send +       │ (User.Read.All)
                          │  User.ReadWrite)   │
                          │                    ▼
                       ┌─────────────────────────┐
                       │           SIS           │
                       │ profile-photos bucket   │
                       │ + profiles.photo_path   │
                       └─────────────────────────┘
                                     │
                          GET /api/email-signatures/photo/<email>
                                     │
                                     ▼
                       ┌─────────────────────────┐
                       │   Email signature HTML  │
                       │  /email-signatures/...  │
                       │   (in inboxes worldwide)│
                       └─────────────────────────┘
```

## How each direction works

### M365 → SIS (one-way, nightly + on-demand)

- The Vercel cron at `/api/cron/m365-sync` runs daily.
- For every HBA-domain user, it calls Graph `/users/{email}/photo/$value`.
- If a photo is returned and the SIS has no photo for that profile,
  it's stored.
- Manual override: `/admin/profiles` → "Sync + force-resync all photos"
  re-pulls *every* M365 photo, overwriting whatever the SIS has.
- Per-profile override: every admin student page has a "Resync from
  M365" link in the profile photo card.

### SIS → M365 (one-way, fires on admin upload)

- When an admin uploads a photo through the SIS (per-student page
  or bulk-photo-upload), the same buffer is also PUT to
  `/users/{email}/photo/$value` in Graph.
- Requires `User.ReadWrite.All` on the HBA Graph Mailer app
  registration with admin consent (granted 2026-05-13).
- A 403 from Graph degrades gracefully: the SIS upload still
  succeeds, the UI shows "skipped_permission", and the audit log
  records the partial outcome.

### SIS → Email signatures (live, no cron)

- Email signatures embed photos via:
  `https://highbluffacademy.com/api/email-signatures/photo/<email>`
- The endpoint 302-redirects to the current Supabase Storage URL
  for that profile's photo, with a 1-hour cache header.
- Effect: a signature sent in someone's email last year renders the
  current photo when the recipient opens the email today.
- If the profile has no photo, the endpoint returns a 1x1
  transparent PNG so email clients don't show a broken-image icon.

### Email signatures → SIS (NOT WIRED — by design)

- Email signatures are read-only consumers. They never push back.
- This is fine because nobody edits photos by uploading them to an
  email signature; the photo always originates upstream (M365 or
  SIS admin upload).

## Where photos appear

| Surface                                | Source                                              |
|----------------------------------------|-----------------------------------------------------|
| Outlook / Teams                         | M365                                                |
| `/portal/schedule` teacher chip          | SIS                                                 |
| `/admin/students` roster                 | SIS                                                 |
| `/admin/students/[id]` header upload     | SIS (with M365 push on save)                        |
| `/parent` student picker                 | SIS                                                 |
| Faculty section roster                   | SIS                                                 |
| Portal header (signed-in user)           | SIS                                                 |
| Email signature inboxes                  | SIS (dynamic redirect; rendered by Outlook/Gmail)   |
| Faculty bios page (`/faculty`)           | Static images in `public/images/faculty/*` (no sync) |

## Operational notes

- **First-time bulk onboarding**: the easiest path is to upload via
  `/admin/profiles/bulk-photo-upload` with a zip of files named
  `<firstname>.<lastname>.<year>.jpg`. The pipeline normalizes /
  resizes / WebP-encodes each one, then pushes to M365 if the
  checkbox is on. After that, email signatures and Outlook all
  update.
- **A faculty member changes their photo in Outlook**: Outlook
  uploads to Azure. Either the nightly cron picks it up, or an
  admin clicks "Resync from M365" on their profile to grab it
  immediately.
- **A faculty member changes their photo in the SIS**: admin
  uploads via the per-student page. The same upload pushes to M365.
  Email signatures auto-refresh on next email send.
- **Replacing signatures.highbluffacademy.com**: the new dynamic
  signature system lives at `/email-signatures/[slug]` on the main
  app. The old static files under `public/email-signatures/`
  still resolve (for backwards compatibility with any email
  embedded their URLs), but new emails should use the dynamic
  URLs. To consolidate, point signatures.highbluffacademy.com at
  this Vercel deployment as a domain alias, or set up a 301
  redirect to `https://highbluffacademy.com/email-signatures/`.
