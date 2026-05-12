-- HBA Phase B/C — seed bootstrap admin profiles
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent via
-- ON CONFLICT — re-running is a no-op.
--
-- Why: the four founder admin emails are guaranteed admin access at the auth
-- layer (isAllowedAdminEmail in lib/admin.ts) even if no DB profile exists.
-- But /admin/profiles lists the profiles table, so without explicit rows the
-- founders are invisible there. This seed gives them visible profile rows
-- with role 'admin' so they show up in the directory immediately and can be
-- assigned name/contact fields by the office.
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

commit;
