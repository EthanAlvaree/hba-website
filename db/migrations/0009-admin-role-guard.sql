-- HBA Phase B/C — atomic last-admin guard
--
-- How to apply: paste into the Supabase SQL editor and run. Idempotent.
--
-- Why: we're killing the hardcoded "bootstrap admin" allowlist in
-- lib/admin.ts and moving the admin role 100% into the profiles table.
-- The TypeScript guards in lib/sis.ts (updateProfileRoles,
-- updateProfileActive, deleteProfile) already enforce "at least one
-- active admin" — but they read-then-write across two queries, so two
-- concurrent demotions could both pass the check and leave zero. This
-- trigger closes the race by counting admins inside the transaction.
--
-- The trigger fires only when admin-relevant state actually changes
-- (roles or active flag, or DELETE). Non-admin updates skip it.

begin;

create or replace function enforce_last_admin()
returns trigger
language plpgsql
as $$
declare
  remaining_admins int;
begin
  -- Count active admins after this operation would complete.
  -- Start with everyone EXCEPT the row being touched...
  select count(*) into remaining_admins
  from profiles
  where active = true
    and 'admin' = any(roles)
    and id <> coalesce(new.id, old.id);

  -- ...then add the post-op state of this row (only for UPDATE; DELETE
  -- removes the row entirely so we add nothing).
  if tg_op = 'UPDATE' then
    if new.active = true and 'admin' = any(new.roles) then
      remaining_admins := remaining_admins + 1;
    end if;
  end if;

  if remaining_admins < 1 then
    raise exception
      'At least one active admin must always exist. This operation would leave the system with no admins.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists profiles_enforce_last_admin_update on profiles;
create trigger profiles_enforce_last_admin_update
  before update on profiles
  for each row
  when (
    (old.active is distinct from new.active)
    or (old.roles is distinct from new.roles)
  )
  execute function enforce_last_admin();

drop trigger if exists profiles_enforce_last_admin_delete on profiles;
create trigger profiles_enforce_last_admin_delete
  before delete on profiles
  for each row
  execute function enforce_last_admin();

commit;
