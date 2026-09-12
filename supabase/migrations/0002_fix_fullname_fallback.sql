-- ============================================================================
-- Fix: "Veda Member" fallback name causing greetings like "Good evening,
-- Veda." (fullName.split(' ')[0] === "Veda" when the stored name defaulted
-- to "Veda Member"). Run this once against your existing Supabase project —
-- it's safe to re-run.
-- ============================================================================

-- 1. Fix the signup trigger so future accounts never get this default again.
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

-- 2. Repair any accounts already created with the old default. Prefer
--    re-deriving the real name from auth metadata (covers Google users whose
--    profile row was created before their metadata was fully available);
--    fall back to "Friend" only if no real name can be found.
update public.profiles p
set full_name = coalesce(
  u.raw_user_meta_data ->> 'full_name',
  u.raw_user_meta_data ->> 'name',
  nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
  'Friend'
)
from auth.users u
where p.id = u.id
  and p.full_name = 'Veda Member';
