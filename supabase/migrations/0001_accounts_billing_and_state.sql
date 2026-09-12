-- ============================================================================
-- Veda: accounts, subscription/trial source-of-truth, and per-user app state
-- ============================================================================
-- Run this once in your Supabase project's SQL editor (or via `supabase db
-- push` if you use the CLI). It is written to be safe to re-run.
--
-- Design:
--   * public.profiles        -> identity + subscription/trial fields.
--                                Trial start / premium status / PayPal
--                                subscription fields can ONLY be written by
--                                the server (service_role key), never by the
--                                client. This is what makes trial-reset and
--                                self-granted-premium impossible from the
--                                app itself.
--   * public.user_app_state  -> one JSONB blob per user holding everything
--                                else (tasks, notes, habits, prayer logs,
--                                etc.). Fully owned by the user via RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,

  tier text not null default 'premium' check (tier in ('free', 'premium')),
  has_paid_subscription boolean not null default false,
  subscription_billing text check (subscription_billing in ('monthly', 'yearly')),

  -- PayPal linkage (server-authoritative)
  paypal_subscription_id text unique,
  subscription_status text check (
    subscription_status in ('APPROVAL_PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')
  ),
  current_period_start timestamptz,
  current_period_end timestamptz,

  -- Trial (server-authoritative, set exactly once at signup)
  trial_started_at timestamptz not null default now(),
  trial_duration_days integer not null default 14,
  trial_decision text not null default 'pending' check (trial_decision in ('pending', 'subscribed', 'free')),

  has_completed_onboarding boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level privileges: the signed-in user may only edit their own basic
-- profile info. Every subscription/trial column is left un-granted to
-- `authenticated`, so only the service_role (used exclusively by our
-- server for verified PayPal events) can ever change them. This is what
-- makes it impossible for the client app to grant itself premium.
revoke all on public.profiles from authenticated;
grant select, insert on public.profiles to authenticated;
grant update (full_name, avatar_url, has_completed_onboarding) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. user_app_state — the rest of the app's data (tasks, notes, habits, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "app_state_select_own" on public.user_app_state;
create policy "app_state_select_own" on public.user_app_state
  for select using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.user_app_state;
create policy "app_state_insert_own" on public.user_app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.user_app_state;
create policy "app_state_update_own" on public.user_app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_app_state to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Auto-create a profile (and start the trial) the moment an account is
--    created — this is what ties the trial to the ACCOUNT rather than the
--    device/install. Runs once, server-side, inside the same transaction as
--    the signup itself (works for email/password, magic link, and Google).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, trial_started_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1), 'Friend'),
    new.raw_user_meta_data ->> 'avatar_url',
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_app_state (user_id, state_json)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_app_state_updated_at on public.user_app_state;
create trigger set_app_state_updated_at
  before update on public.user_app_state
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Backfill: if you already have real users in auth.users from before this
--    migration, give them a profile + trial row too (idempotent).
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, avatar_url, trial_started_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(coalesce(u.email, ''), '@', 1), 'Friend'),
  u.raw_user_meta_data ->> 'avatar_url',
  u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.user_app_state (user_id, state_json)
select u.id, '{}'::jsonb
from auth.users u
left join public.user_app_state s on s.user_id = u.id
where s.user_id is null;
