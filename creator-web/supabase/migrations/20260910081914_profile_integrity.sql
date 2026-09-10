-- Stage 1: keep auth users, public profiles, and wallets in a 1:1 relationship.
-- This migration is idempotent and safe to rerun after taking a production backup.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_nickname text;
  profile_avatar_url text;
begin
  profile_nickname := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '신규크리에이터'
  );

  profile_avatar_url := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'), '')
  );

  insert into public.users as existing (
    id,
    email,
    nickname,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    profile_nickname,
    profile_avatar_url,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      avatar_url = coalesce(existing.avatar_url, excluded.avatar_url),
      updated_at = case
        when existing.email is distinct from excluded.email
          or (existing.avatar_url is null and excluded.avatar_url is not null)
        then now()
        else existing.updated_at
      end;

  insert into public.coin_wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep the profile email aligned when a user changes their Auth email.
create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set email = coalesce(new.email, ''),
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_user_email();

-- Remove the older public-schema trigger function after the trigger is replaced.
drop function if exists public.handle_new_user();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.sync_user_email() from public, anon, authenticated;

-- Repair accounts created before the trigger existed. Existing user-entered profile
-- fields are preserved; only Auth-owned email and missing avatar values are repaired.
insert into public.users as existing (
  id,
  email,
  nickname,
  avatar_url,
  created_at,
  updated_at
)
select
  auth_user.id,
  coalesce(auth_user.email, ''),
  coalesce(
    nullif(btrim(auth_user.raw_user_meta_data ->> 'nickname'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    '신규크리에이터'
  ),
  coalesce(
    nullif(btrim(auth_user.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'picture'), '')
  ),
  coalesce(auth_user.created_at, now()),
  now()
from auth.users as auth_user
on conflict (id) do update
set email = excluded.email,
    avatar_url = coalesce(existing.avatar_url, excluded.avatar_url),
    updated_at = case
      when existing.email is distinct from excluded.email
        or (existing.avatar_url is null and excluded.avatar_url is not null)
      then now()
      else existing.updated_at
    end;

insert into public.coin_wallets (user_id)
select auth_user.id
from auth.users as auth_user
on conflict (user_id) do nothing;

-- Fail and roll back the whole migration if the intended 1:1 relationships were
-- not established. Orphan public rows are checked separately in phase 2 because
-- the foreign keys should already prevent them in a healthy schema.
do $$
begin
  if exists (
    select 1
    from auth.users as auth_user
    left join public.users as profile on profile.id = auth_user.id
    where profile.id is null
  ) then
    raise exception 'profile integrity migration failed: auth user without profile';
  end if;

  if exists (
    select 1
    from public.users as profile
    left join public.coin_wallets as wallet on wallet.user_id = profile.id
    where wallet.user_id is null
  ) then
    raise exception 'profile integrity migration failed: profile without wallet';
  end if;
end;
$$;
