# Launching the PCI deployment

This is the operational procedure for standing up the Pacific Crest
Institute (PCI) deployment of this codebase. The repository is
multi-tenant: HBA and PCI are two Vercel projects pulling from the same
source, each with its own `SCHOOL_KEY` + env. The PCI scaffolding
(`lib/site.ts` placeholder config, brand-color swap, `SCHOOL_KEY` env
discriminator) is already in place — this doc walks through filling it
in and provisioning the external resources.

## Before you start

Decide and gather:

- **Microsoft 365 tenant for PCI.** Strongly recommended: a *separate*
  tenant from HBA. Clean data isolation, separate license pools, separate
  domains. (Shared tenant is possible but couples the two operationally.)
- **Supabase project for PCI.** A separate Supabase project. Student PII
  shouldn't sit in HBA's database.
- **Vercel project for PCI.** A second Vercel project pointing at this
  same repo. The two deployments share source; everything school-specific
  flows through `SCHOOL_KEY`.
- **Domain.** What is PCI's web domain? (`pacificcrestinstitute.org`,
  `pacificcrest.edu`, etc.) You'll need DNS access to point it at Vercel.

## 1. Fill in `lib/site.ts` for PCI

The `pci` block currently has `TODO_PCI` placeholders and a coastal-teal
brand palette. Replace each `TODO_PCI` with real values:

- `name`, `shortName`, `tagline`
- `domain`, `url` (the URL is also overridden at runtime by
  `NEXT_PUBLIC_SITE_URL` when set)
- `contact.phone`, `phoneTel`, `admissionsEmail`, `infoEmail`,
  `emailDomain`
- `address.streetLine1`, `locality`, `region`, `regionCode`, `postalCode`
- `ceebCode` if applicable
- `social.*` URLs as they exist
- `brand.navy`, `navyDeep`, `orange` — finalize PCI's actual palette
  (the teal placeholders exist so an accidental PCI deploy is visually
  unmistakable, not silently wearing HBA's look)

The runtime warning that fires on `SCHOOL_KEY=pci` while `TODO_PCI`
markers remain is in `lib/site.ts` itself — once everything is filled in,
the warning stops.

## 2. Provision the Supabase project

1. Create a new Supabase project for PCI. Capture:
   - **Project URL** (`SUPABASE_URL`)
   - **Service-role key** (`SUPABASE_SERVICE_ROLE_KEY`) — Project
     Settings → API → "Service role" key
   - **Database password** — Project Settings → Database → "Reset database
     password" (shown once; copy immediately; alphanumeric-friendly)
   - **Connection string** (`DATABASE_URL`) — Project Settings → Database
     → Connection string → **Session pooler** URI (port 5432), since
     direct connections are IPv6-only on most home networks. Replace
     `[YOUR-PASSWORD]` with the password from above.

2. Put `DATABASE_URL` in a temporary local `.env.local` (or just export
   it inline) and run:
   ```
   npm run db:migrate
   ```
   The runner creates `schema_migrations` and applies every numbered file
   in `db/migrations/` from scratch (since the table is empty and this is
   a fresh DB, the baseline rule still applies — see `scripts/migrate.ts`).
   On a fresh project: every migration runs in order.

3. Verify:
   ```
   npm run db:migrate:status
   ```
   Should report all current migrations applied, 0 pending.

## 3. Provision the Microsoft Graph app

In PCI's M365 tenant:

1. **Register an app** in Entra → App registrations → New registration.
   Name it something like "PCI SIS Graph". Single tenant. Capture the
   **client ID** and **tenant ID**.
2. **Create a client secret** under Certificates & secrets → New client
   secret. Capture the value (shown once).
3. **Add API permissions** (Microsoft Graph → Application permissions),
   then grant admin consent for each:
   - `User.ReadWrite.All` (creates student accounts + assigns licenses)
   - `User.Read.All` (M365 sync)
   - `Organization.Read.All` (resolves the student license SKU)
   - `Mail.Send` (sends notification emails)
   - `Directory.Read.All` (legacy, defense-in-depth — match HBA's grant
     for consistency)

   For OIDC sign-in (NextAuth), add the standard delegated scopes:
   `openid`, `profile`, `email`, `offline_access`, `User.Read`.
4. **Confirm the student-license SKU exists in this tenant.** The
   provisioner defaults to `STANDARDWOFFPACK_STUDENT` ("Office 365 A1 for
   students"). If the PCI tenant uses a different SKU part number, set
   `M365_STUDENT_LICENSE_SKU` to the right one in the Vercel env.

## 4. Create the Vercel project

1. **Import this repository** into Vercel as a new project named e.g.
   `pci-website`. Use the `preview` branch for previews, `main` for
   production (same as HBA).
2. **Set environment variables** in Project Settings → Environment
   Variables (apply to Production + Preview + Development):

   | Variable | Value |
   | --- | --- |
   | `SCHOOL_KEY` | `pci` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<pci-domain>` |
   | `SUPABASE_URL` | from §2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from §2 |
   | `DATABASE_URL` | from §2 |
   | `GRAPH_CLIENT_ID` | from §3 |
   | `GRAPH_CLIENT_SECRET` | from §3 |
   | `GRAPH_TENANT_ID` | from §3 |
   | `GRAPH_MAIL_SENDER` | the M365 mailbox to send-as (e.g. `noreply@<pci-domain>`) |
   | `CRON_SECRET` | a fresh random token (used by `/api/cron/*` routes) |
   | `M365_STUDENT_LICENSE_SKU` | only if PCI's SKU part number differs |
   | `NEXTAUTH_SECRET` | a fresh random token for NextAuth |
   | `NEXTAUTH_URL` | `https://<pci-domain>` |

3. **Configure the custom domain** in Project Settings → Domains. Point
   DNS as Vercel instructs.

4. **Deploy.** Push to `preview` (or trigger from the dashboard). The
   first deploy should boot with `SCHOOL_KEY=pci` and serve PCI branding
   immediately.

## 5. Smoke tests

After the first deploy lands:

- **Token / Graph permissions:** run a one-off read-only check against
  PCI's tenant (the pattern from earlier in the HBA session — token
  request, `GET /subscribedSkus`, `GET /users?$top=5`, 404 on a fake UPN).
- **The home page** should show PCI branding (name, colors, contact).
- **`/admin/profiles`** loads (you'll need to seed yourself an admin —
  see §6).
- **`/programs/courses`** loads (will be empty until PCI's catalogue is
  seeded — that's expected; the page is DB-driven).

## 6. Seed PCI's initial admin

The bootstrap admin migration (`db/migrations/0005-seed-bootstrap-admins.sql`)
seeds HBA admins. For PCI you'll need to either:

- Manually `insert` into `profiles` with `roles = '{admin}'` and your
  PCI email via the Supabase SQL editor, **or**
- Add a `0042-seed-pci-bootstrap-admins.sql` migration with the same
  shape as `0005-` but referencing PCI admin emails. (This is cleaner if
  more than one person is bootstrapping.)

Either way, the first sign-in via Entra OIDC will populate `entra_oid`
on the profile row, and from that point on the admin dashboard works
normally.

## 7. PCI-specific build-out (post-launch)

Features that exist for HBA but **don't apply to PCI's weekend test-prep +
art model** can be gated by `schoolKey === "hba"` or moved into HBA-only
route groups:

- The graduation map / trajectory (`/portal/trajectory`)
- Transcripts with cumulative GPA (`/admin/students/[id]/transcript`,
  `/portal/transcript`)
- The schedule builder (`/admin/academics/scheduler`)
- The bell-period scheduler-solver (`lib/scheduler-solver.ts`)
- Graduation requirements (`/admin/academics/requirements`)

PCI-specific surfaces to build (won't exist in HBA):

- Test-prep cohort signup (different from HBA's full-time enrollment)
- Digital-art portfolio + publisher-partnership surfacing
- Guest-artist event signups
- Weekend session calendar

The codebase pattern: shared infra (profiles, students, parent_links,
enrollments, M365 provisioning, transcripts core, audit log, migration
runner) evolves once for both. School-specific surfaces live in route
groups (`app/(hba)/...`, `app/(pci)/...`) or behind `schoolKey` gates in
shared pages.

## Reference

- Multi-tenant config: `lib/site.ts`
- `SCHOOL_KEY` resolution: `lib/site.ts` line ~201
- Brand-color CSS-var override: `app/layout.tsx`
- Migration runner: `scripts/migrate.ts`, `db/README.md`
- M365 provisioning: `lib/graph.ts` (`provisionStudentM365Account`)
