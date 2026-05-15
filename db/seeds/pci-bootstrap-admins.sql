-- PCI bootstrap admins
--
-- Tenant-specific seed for PCI's Supabase project. Idempotent via
-- ON CONFLICT — safe to re-run.
--
-- Run against PCI's DB:
--   npm run db:sql -- --school=pci db/seeds/pci-bootstrap-admins.sql
--
-- Why this is here and not in db/migrations/:
--   db/migrations/0005-seed-bootstrap-admins.sql seeds HBA's admin
--   emails. Running that against PCI's DB would write HBA-domain rows
--   into PCI's profiles table (harmless but cluttery). Tenant-specific
--   admin seeds live in db/seeds/ so each is applied explicitly to the
--   right project — never via the auto-migrate runner.
--
-- After running: founders sign in via /admin/sign-in. The next JWT
-- refresh picks up the new 'admin' role and routes them to
-- /admin/contact-submissions. Admins can then promote / demote other
-- users via /admin/profiles like any other role.

begin;

insert into profiles (email, roles, display_name, first_name, last_name, active)
values
  ('ethan@pacificcrestinstitute.com', array['admin','faculty']::text[], 'Ethan Alvarée', 'Ethan', 'Alvarée', true),
  ('molly@pacificcrestinstitute.com', array['admin']::text[],           'Molly Sun',     'Molly', 'Sun',     true),
  ('kun@pacificcrestinstitute.com',   array['admin']::text[],           'Kun Xuan',      'Kun',   'Xuan',    true)
on conflict (email) do update
  set
    -- Add the 'admin' role to existing profiles without disturbing
    -- other roles (faculty, parent, etc.) that may have been set
    -- during their first sign-in or by another admin.
    roles = case
      when 'admin' = any(profiles.roles) then profiles.roles
      else array_append(profiles.roles, 'admin')
    end,
    active = true;

-- Sanity check: bail if zero active admins exist after this seed.
do $$
declare
  admin_count int;
begin
  select count(*) into admin_count
  from profiles
  where active = true and 'admin' = any(roles);
  if admin_count < 1 then
    raise exception 'Seed completed but no active admin exists. Aborting.';
  end if;
end $$;

commit;
