# Database migrations

Schema changes live as numbered SQL files in `db/migrations/`, named
`NNNN-short-description.sql` (zero-padded, sequential).

## Applying migrations

```
npm run db:migrate          # apply every pending migration
npm run db:migrate:status   # show applied vs. pending, change nothing
```

The runner (`scripts/migrate.ts`) connects to the database, applies any
file not yet recorded in the `schema_migrations` table, and records each
one. It's safe to run repeatedly — already-applied migrations are
skipped. If a migration fails it stops; fix the file and re-run.

## One-time setup

Add `HBA_DATABASE_URL` to `.env.local` (and to the Vercel project env).
Get it from the Supabase dashboard:

> Project Settings → Database → Connection string → **URI** (port 5432)

It looks like `postgresql://postgres:[password]@db.<ref>.supabase.co:5432/postgres`.

## Writing a new migration

1. Create `db/migrations/NNNN-description.sql` with the next number.
2. Wrap the body in `begin;` / `commit;`.
3. Make it idempotent where reasonable (`create table if not exists`,
   `insert ... on conflict`, guarded `update`/`delete`) so a re-run is
   harmless.
4. Run `npm run db:migrate`.

## Baseline

Migrations `0001`–`0038` predate the runner and were applied by hand. On
the first run against a fresh `schema_migrations` table, the runner
records those as already-applied **without executing them** — re-running
old seed migrations (e.g. `0011-seed-courses.sql`) would clobber edits
made since via the admin UI. Everything numbered `0039`+ runs normally.

The baseline cutoff is the `BASELINE_THROUGH` constant in
`scripts/migrate.ts`.

## Bootstrapping a fresh database

For a brand-new Supabase project (e.g. a second deployment), the
baseline rule is wrong — there's nothing to baseline. Pass `--fresh`
to apply every migration from 0001 onward:

```
npm run db:migrate -- --env=.env.pci.local --fresh
```

The migrations are written idempotently (`create if not exists`,
`insert ... on conflict`, guarded updates), so this produces the same
end state every time and is safe to re-run if interrupted.
