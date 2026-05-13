# Pre-production + refactoring + multi-tenant plan

_Last updated 2026-05-12._

This is the planning doc for the work between "SIS is functional on preview"
and "SIS is the system of record at HBA, and PCI's instance is forked from it
without sacrificing the ability to share improvements."

It is organized in four passes, ordered by what blocks what:

1. **Pre-production must-do** — things that must be true before the SIS
   becomes the system of record for real student data.
2. **Polish & UX rough edges** — things that don't block launch but should
   land before parents and faculty are inside it daily.
3. **Refactoring** — non-functional cleanup that makes the next round of
   features (and the PCI fork) easier.
4. **Multi-tenant strategy for the PCI fork** — the long-running concern.

Items are tagged `[block]` (must-do before production), `[soon]` (next
~2 weeks), or `[fork]` (do as part of, or before, forking to PCI).

---

## 1. Pre-production must-do

### 1.1 `[block]` Row-level security on the Supabase tables

Today the SIS relies entirely on server-side enforcement: every server
action and route handler instantiates a service-role Supabase client and
gates on `session.isAdmin` / `session.facultyId` / `session.parentId` /
`session.studentId`. There is currently **no `enable row level security`
or `create policy`** in any migration (`db/migrations/*.sql`).

That is acceptable as long as nothing in the codebase exposes the
service-role client to the browser, or as long as no one ever points an
anon-key Supabase client at this database. Both are easy mistakes.

**Action:**

- Add `enable row level security` to every table that holds PII or grades.
- For tables only ever read/written from server code, the policy can be as
  simple as `using (false)` plus a "service role only" grant — the policy
  is a defense-in-depth tripwire, not the access mechanism.
- For any table we may eventually want to read with an anon-key client
  (e.g. if we ever move to direct Supabase reads from the portal), write
  real policies keyed off `auth.uid()` mapped through `profiles`.

Reference: `db/migrations/0018-rls.sql` (to be created).

### 1.2 `[block]` Rate limiting on the unauthenticated surfaces

The two unauthenticated POST surfaces are:

- `/apply` — application submissions land in `applications` and trigger a
  Graph notification.
- `/contact` — contact submissions land in `contact_submissions` and
  trigger a Graph notification.

Both have Turnstile, but neither has a per-IP / per-session rate limit
on top. A determined attacker who solves Turnstile can still flood us.
Turnstile is the spam filter; rate limiting is the abuse cap.

**Action:** add an in-memory or Upstash-Redis-backed token bucket in
middleware for these two paths. 5/min/IP is more than enough for a real
applicant.

### 1.3 `[block]` Backup + export tooling

Currently the database is whatever Supabase's automatic daily backups
give us, and there is no admin-side export. Before this becomes the
system of record we need:

- A scheduled (weekly) full export of `applications`, `profiles`,
  `enrollments`, `course_enrollments`, `assignments`, `grades`,
  `attendance`, `incidents`, `health_records`, `conferences`,
  `sent_mass_emails` to encrypted Blob storage.
- An admin-only "Download CSV" button on each high-value list page.
  Several already exist (`/api/admin/reports/*.csv`); audit which ones
  are still missing — at minimum: gradebook history, incidents,
  health records, conferences.
- A documented "if we lose Supabase tomorrow" runbook in
  `docs/disaster-recovery.md`.

### 1.4 `[block]` Audit log coverage gaps

`logAdminAuditEvent` is called in 11 files today (see the recent commit
`752b87b`). But there are 16 `app/admin/**/actions.ts` files, meaning
**five admin action surfaces are unaudited**:

- `app/admin/students/actions.ts`
- `app/admin/academics/requirements/actions.ts`
- `app/admin/contact-submissions/actions.ts`
- `app/admin/academics/sections/[id]/gradebook/actions.ts`
- `app/admin/academics/sections/[id]/attendance/actions.ts`
- `app/admin/students/[id]/health/actions.ts`

Gradebook + attendance + health are the most sensitive of those — they
mutate per-student academic and medical records. Audit logging for those
is a hard requirement before we cut over from GradeLink.

**Action:** add `logAdminAuditEvent` calls and `ADMIN_AUDIT_ACTIONS`
entries for the high-value mutations in those five files.

### 1.5 `[block]` Inconsistent redirect-vs-throw error paths

Several server actions today either `redirect()` to an error page,
`return { ok: false, error }`, or just throw. From the client the
behavior is wildly different (a thrown error in a transition is
swallowed and shows nothing; a redirect refreshes; an `ok: false` is
rendered inline). This means some failure modes silently no-op.

**Action:** standardize on `useActionState`-compatible
`{ ok: true } | { ok: false, error: string }` for any action a user
might re-try, and `redirect("/admin/sign-in")` only for auth failures.
Audit `app/admin/**/actions.ts` and `app/parent/**/actions.ts` against
that rule.

### 1.6 `[block]` "Orphan" visibility

There are at least four classes of orphan record that can silently
break the portal experience:

- A student profile with no parent link → parent portal shows nothing,
  but admin has no view to discover this.
- A parent profile with no student link → parent signs in to an empty
  shell.
- A student with no enrollment for the current term → portal home is
  half-empty, no clear signal why.
- A faculty profile not linked to any section in the current term →
  faculty portal teaching list is empty.

`/admin/students` already shows the first one when you look closely
(no parent column), but there is no dedicated triage view.

**Action:** add an admin page `/admin/orphans` that lists each of the
four classes with a one-click "open profile" / "open enrollments" link.
This is the kind of thing that prevents a 9 PM panicked-parent call.

### 1.7 `[block]` Profile photos

Today profiles have no photo upload. Before parents are using this UI
daily, students should have profile photos so the schedule and roster
views look like a real SIS, not a CSV import.

**Action:** add a `profile_photo_path` column to `profiles`, store in
Supabase Storage, surface upload UI on the admin student page. Display
on portal home, parent home, faculty roster.

### 1.8 `[block]` MASS_EMAIL_SENDER env var in production

The messaging page now defaults to `info@highbluffacademy.com`, which
is delegated to Kristin + Molly in Outlook. To override (e.g. to send
from `principal@` for principal-authored announcements), set
`MASS_EMAIL_SENDER` and `MASS_EMAIL_SENDER_LABEL` in Vercel.

Also remember to apply migration `0017-sent-mass-emails.sql` before
the first mass send in production.

---

## 2. Polish & UX rough edges

### 2.1 Term-locked grade UX

Once a term is locked, the gradebook still shows editable inputs and
the save action silently no-ops. The right UX is a banner at the top
of the section gradebook saying "Q3 was locked on 2026-04-12. Contact
the registrar to amend." plus disabled inputs.

### 2.2 Apply wizard progress indicators

The `/apply` wizard saves draft state to the URL, which is great, but
there is no progress bar or step indicator and no "you have an
in-progress application" surfacing when a returning user lands on
`/apply`. Both would reduce drop-off.

### 2.3 Conferences edge cases

The conference scheduling UI assumes there is exactly one parent per
student. Two-parent families (the common case) need the option to
specify which parent is attending so the calendar invite goes to the
right address.

### 2.4 Capacity warnings on schedule drafts

Already partially shipped (`372f6f7`). Verify the warning shows on the
solver result view too, not only on the manual edit view.

### 2.5 Empty-state copy on the portals

Several portal screens render `[]` literally when there's nothing to
show. The pattern should be:

- Student portal /portal home with no enrollments → "Looks like you
  don't have any classes yet for {term}. Please check with the registrar."
- Parent portal with one student → don't show the student picker.
- Faculty portal teaching list empty → "You haven't been assigned any
  sections for {term} yet. Reach out to academics@."

### 2.6 Mass email: preview before send

The messaging page lets you preview the recipient count. It does **not**
let you see the final rendered email (subject + body + footer). For
school-wide sends this is high-stakes; one typo goes to 400 people.

Add a "Preview message" step that renders the final HTML in a modal
before the "Confirm send" button enables.

### 2.7 Mass email: scheduled sends

Currently sends fire immediately. A "send at 7am tomorrow" option is a
common request and is straightforward with a Vercel cron + a
`scheduled_for` column on `sent_mass_emails`.

### 2.8 Conferences: ICS calendar invites

The conference reminder cron sends email but no `.ics` attachment.
Adding one would dramatically reduce no-shows.

---

## 3. Refactoring opportunities

### 3.1 Centralize the `createClient` factory

There are **34 files** that call `createClient(process.env.HBA_SUPABASE_URL!, process.env.HBA_SUPABASE_SERVICE_ROLE_KEY!, …)`
with the same `{ auth: { autoRefreshToken: false, persistSession: false } }`
options. This is fine; it's also begging for a typo.

**Action:** introduce `lib/supabase-server.ts` exporting `getServiceSupabase()`
and `getUserSupabase(token)` (for the rare case we want auth.uid()
context). Replace the 34 inline call sites in a single sweep. No
behavior change, but it gives us one place to add logging, tracing, or
the eventual RLS migration toggle.

### 3.2 DRY the admin action prelude

Almost every admin action looks like:

```ts
const session = await auth()
if (!session?.isAdmin) redirect("/admin/sign-in")
const parsed = schema.safeParse(Object.fromEntries(formData))
if (!parsed.success) return { ok: false, error: "Invalid input." }
// …actual work…
revalidatePath("…")
return { ok: true }
```

**Action:** introduce `withAdminAction(schema, handler)` in
`lib/server-actions.ts` that handles the auth check, parsing, error
shape, and audit log call uniformly. Migrate actions one folder at a
time — start with `app/admin/applications/actions.ts` since it's the
most-touched.

### 3.3 Unify the two import flows

`app/admin/students/import-students/` and
`app/admin/students/import-parents/` are 80% the same code: parse CSV,
validate rows, dry-run preview, commit-with-progress, audit log. The
divergent 20% is the schema and the link-creation step.

**Action:** extract `lib/admin-csv-import.ts` exposing a
`runCsvImport({ schema, mapRow, onCommit })` helper. The next CSV
import we want (likely a faculty/sections import for fall setup) gets
to be a 50-line file instead of a 500-line copy.

### 3.4 Consolidate audit-log action keys

`ADMIN_AUDIT_ACTIONS` is currently defined inline in `lib/audit.ts` as
a string union. Several action keys are spelled inconsistently across
the call sites (`update_application_status` vs
`application_status_updated`). Pick a tense and a verb-noun ordering
and standardize.

### 3.5 Move `lib/faculty.ts` data to the DB

`lib/faculty.ts` is currently a hand-edited TS array. That's fine for
HBA today, but for the PCI fork (or for HBA when we want a faculty
member to edit their own bio), the data needs to live in `profiles` +
a `faculty_bios` table. The TS file becomes a build-time seed, not
runtime data.

This is a `[fork]` item — it's the kind of code-vs-data split that
matters most when the second school's data starts to drift.

### 3.6 Consolidate `getSupabase` patterns inside route handlers

`app/api/admin/reports/*.csv/route.ts` duplicates the same admin-auth
+ supabase pattern as 3.1 and 3.2. After 3.1 lands, fold these in too.

---

## 4. Multi-tenant strategy for the PCI fork

This is the question Ethan flagged as the long-running one: "if we
fork this for PCI and improve one, how do improvements flow to the
other?"

### 4.1 The three options I considered

| Pattern | Sketch | Why I rejected it |
|---|---|---|
| **A. Hard fork** | `git clone hba-website pci-website`, edit strings, deploy. | Improvements only flow with manual cherry-picks. Two divergent codebases within 6 months guaranteed. |
| **B. Shared library** | Extract a `@hba/sis` npm package; two thin Next.js apps consume it. | Heavy refactor up front; ergonomically painful (every change requires bumping a private package); the apps end up being mostly imports. |
| **C. One codebase, two deploys** | Same Git repo, same Vercel project per school, branding driven by env-var-selected config. | Best of both worlds. Pick this. |

### 4.2 Recommended shape: one codebase, two deploys

```
  ┌─────────────────────────────────────┐
  │     ethanalvaree/hba-website        │   <- one Git repo, one main branch
  └─────────────────────────────────────┘
              │             │
       branch: main    branch: main
              │             │
   ┌──────────▼──┐    ┌─────▼─────────┐
   │ Vercel proj │    │ Vercel proj   │
   │   "hba"     │    │   "pci"       │
   │             │    │               │
   │ SCHOOL_KEY= │    │ SCHOOL_KEY=   │
   │   hba       │    │   pci         │
   │             │    │               │
   │ HBA_SUPABASE_URL  HBA_SUPABASE_URL  (yes, the
   │ HBA_SUPABASE_…    HBA_SUPABASE_…    env name
   │                                     is "HBA_"
   │                                     in both —
   │ NEXTAUTH_URL=     NEXTAUTH_URL=     keep the
   │  hba.com           pci.com          envs the
   │                                     same shape)
   └─────────────┘    └───────────────┘
              │             │
   ┌──────────▼──┐    ┌─────▼─────────┐
   │  Supabase   │    │   Supabase    │
   │  project    │    │   project     │
   │  (HBA)      │    │   (PCI)       │
   └─────────────┘    └───────────────┘
```

- One repo. `main` branch is the source of truth. Bug fixes land once.
- Two Vercel projects, each watching `main`. Each has its own env vars,
  its own Supabase project, its own DNS.
- A `SCHOOL_KEY` env var (or equivalent) tells the app at boot which
  school's branding + config to load.
- All school-specific strings, colors, addresses, social URLs,
  enrollment URLs, CEEB codes live in `lib/site.ts` (already half done).

### 4.3 What needs to happen to get there

Concretely, the work splits into three buckets:

**Bucket A — make `lib/site.ts` the only source of school identity.**

Today `lib/site.ts` already holds name, contact, address, CEEB, socials,
and brand colors. We need to:

- Move the `"HBA "` / `"High Bluff Academy "` prefixes that are still
  inline in JSX (search for `High Bluff` outside of `lib/site.ts`) to
  `siteConfig.name` / `siteConfig.shortName`.
- Move email domain checks (`@highbluffacademy.com`) — there are a few
  in `auth.ts` and `lib/mass-email.ts` — to `siteConfig.contact.emailDomain`.
- Move the `info@highbluffacademy.com` mass-email sender default we
  just shipped to read from `siteConfig.contact.infoEmail` (already does;
  verify).
- Promote brand color hex values (`#1f3f66`, `#f37021`) so Tailwind
  reads them from a CSS-variable theme, and `siteConfig.brand` provides
  the variable values per school.

Once this is done, _changing one constant in `lib/site.ts` rebrands
the entire site_. That is the test.

**Bucket B — convert `SCHOOL_KEY` into a config selector.**

```ts
// lib/site.ts (sketch)
const SCHOOL = process.env.SCHOOL_KEY ?? "hba"

const configs = {
  hba: { name: "High Bluff Academy", brand: { … }, contact: { … }, … },
  pci: { name: "Pacific Coast International", brand: { … }, contact: { … }, … },
}

export const siteConfig = configs[SCHOOL]
```

The configs object stays in the repo. Both schools' branding lives
in version control. No special hosting tricks.

**Bucket C — move code-side data to DB-side data.**

Things that are HBA-specific data hard-coded in TS today, and need to
move into per-school Supabase seeds:

- `lib/faculty.ts` — bios, headshots, departments. Move to `profiles`
  + a `faculty_bios` table.
- Course catalog in `lib/courses.ts` (if it exists) or the seed
  migration `0011-seed-courses.sql`. Per-school seed file.
- Term calendar / bell schedule. Per-school seed.
- Admin bootstrap list in `0005-seed-bootstrap-admins.sql`. Per-school
  seed.

The seeds get split into `db/seeds/hba/*.sql` and `db/seeds/pci/*.sql`.
Migrations stay shared.

### 4.4 What this looks like once it's done

- One Pull Request that fixes a bug in the gradebook lands on `main`,
  triggers both Vercel projects' production deploys, and the fix is
  live for both schools in 60 seconds.
- A PCI-specific feature ("PCI tracks IB Diploma program status") is
  added as a config-gated feature flag: `if (siteConfig.features.ibDiploma)`.
  HBA's deploy renders nothing extra; PCI's deploy renders the IB UI.
- New school onboards by: (a) adding a config entry, (b) creating a
  new Supabase project, (c) creating a new Vercel project, (d) running
  the migrations + seed against the new Supabase. No code fork.

### 4.5 Order of operations

Do **Bucket A first**. It's the lowest-risk, has no schema implications,
and gives us the test of "can one config flip rebrand the site?" If
that test passes, we know the architecture is sound before investing
in Bucket B and C.

Bucket B can land any time after A — it's just adding a layer of
indirection.

Bucket C is the most invasive (it requires migration ordering and a
seed split). Do it _just before_ standing up the PCI Supabase project,
not earlier. Until then the seed lives where it is.

---

## What's already done (just so we don't re-plan it)

- ✅ Native `/apply` form replacing GradeLink (`1d67fd5`)
- ✅ Audit log infrastructure + first wave of coverage (`752b87b`)
- ✅ Bulk parent-link CSV import (`8bd9da6`)
- ✅ Cumulative GPA on portal home + capacity warnings (`372f6f7`)
- ✅ Mass email overhaul: send from `info@`, school footer, sent
  history, all-school cohort (this commit, `0efead3`)
- ✅ Topbar + community-page portal sign-in entrypoints (this commit)

## What's next (recommended sprint order)

1. RLS migration (1.1)
2. Audit-log coverage gaps (1.4) — gradebook + attendance + health
3. Rate limiting on `/apply` + `/contact` (1.2)
4. Profile photos (1.7)
5. Orphan visibility page (1.6)
6. `lib/supabase-server.ts` refactor (3.1)
7. Backup tooling + DR runbook (1.3)
8. Bucket A of the multi-tenant work (4.3) — `lib/site.ts` audit
