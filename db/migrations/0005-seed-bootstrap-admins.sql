-- HBA Phase B/C — seed founding admin profiles
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent via
-- ON CONFLICT — re-running is a no-op.
--
-- Why: admin authorization lives 100% in the profiles table (no hardcoded
-- allowlist). This seed guarantees the founding admin emails exist with
-- role 'admin' so the system always boots with at least one admin. Once
-- this has run, admins can promote/demote/delete each other through
-- /admin/profiles like any other role. Migration 0009 adds a DB trigger
-- that prevents the last active admin from being removed.
--
-- Note: this does NOT set entra_oid. That's populated on first sign-in via
-- bootstrapProfileForSignIn in lib/sis.ts.

begin;

insert into profiles (email, roles, display_name, first_name, last_name, active)
values
  ('ethan@highbluffacademy.com',   array['admin']::text[], 'Ethan Alvarée',  'Ethan',   'Alvarée',  true),
  ('george@highbluffacademy.com',  array['admin','faculty']::text[], 'George Humphreys', 'George', 'Humphreys', true),
  ('molly@highbluffacademy.com',   array['admin']::text[], 'Molly',          'Molly',   null,       true),
  ('kristin@highbluffacademy.com', array['admin']::text[], 'Kristin',        'Kristin', null,       true),
  ('kun@highbluffacademy.com',     array['admin','faculty']::text[], 'Kun Xuan', 'Kun',     'Xuan',     true)
on conflict (email) do update
  set
    -- Make sure the admin role is present even if a prior bootstrap run
    -- created the profile with just 'faculty' (which would happen if they
    -- signed in before the seed ran — they'd default to 'faculty' since
    -- HBA emails default to 'faculty' unless in the bootstrap admin list,
    -- and Ethan/George/Kun aren't all in that list).
    --
    -- We only ADD 'admin' to roles if it's not already there. Other roles
    -- stay intact.
    roles = case
      when 'admin' = any(profiles.roles) then profiles.roles
      else array_append(profiles.roles, 'admin')
    end,
    active = true;

-- Sanity check: bail if zero active admins exist after this migration.
-- (Would only happen on a brand-new DB if all five inserts failed silently.)
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
