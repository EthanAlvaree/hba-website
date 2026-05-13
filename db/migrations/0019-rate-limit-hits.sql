-- HBA Phase C — public-form rate limiting
--
-- How to apply: paste into Supabase SQL editor and run. Idempotent.
--
-- Why: Turnstile filters obvious bots. Once an attacker clears it,
-- there's nothing else stopping them from submitting 10,000 apps or
-- contact requests from one IP. This adds a Postgres-backed fixed-
-- window token bucket so abuse caps cheaply without new infra.
--
-- Why Postgres and not Redis/Upstash: zero new infrastructure, works
-- offline in dev, portable to the PCI fork. Volume is well below the
-- point where a Postgres roundtrip per request is meaningful.
--
-- The table grows ~1 row per (key, window) bucket. We rely on a
-- weekly cleanup query to drop rows older than 7 days (see
-- delete_old_rate_limit_hits below — call it from a Vercel cron or
-- accept that the table grows slowly).

begin;

create table if not exists rate_limit_hits (
  key text not null,                 -- e.g. "apply:ip:1.2.3.4"
  window_start_at timestamptz not null,
  hit_count int not null default 1,
  primary key (key, window_start_at)
);

create index if not exists rate_limit_hits_window_idx
  on rate_limit_hits (window_start_at desc);

-- Atomic increment. Insert a new row at hit_count=1 if (key, window)
-- is fresh, or increment the existing row otherwise. Returns the new
-- hit count so the caller can compare against its limit.
create or replace function rate_limit_increment(
  p_key text,
  p_window_start timestamptz
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limit_hits (key, window_start_at, hit_count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start_at)
  do update set hit_count = rate_limit_hits.hit_count + 1
  returning hit_count into v_count;
  return v_count;
end;
$$;

-- Optional housekeeping: call from a weekly cron to keep the table
-- small. Not strictly needed at low volume.
create or replace function delete_old_rate_limit_hits(p_older_than interval default '7 days')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_hits
  where window_start_at < now() - p_older_than;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

commit;
