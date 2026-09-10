-- Stage 4: connect My Info submenus to owner-scoped database records.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null default 'other',
  subject text not null,
  message text not null,
  status text not null default 'open',
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint support_tickets_category_valid
    check (category in ('account', 'project', 'coin', 'bug', 'other')),
  constraint support_tickets_status_valid
    check (status in ('open', 'in_progress', 'answered', 'closed')),
  constraint support_tickets_subject_valid
    check (btrim(subject) <> '' and char_length(subject) <= 100),
  constraint support_tickets_message_valid
    check (btrim(message) <> '' and char_length(message) <= 2000)
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users view own support tickets" on public.support_tickets;
create policy "Users view own support tickets"
on public.support_tickets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create own support tickets" on public.support_tickets;
create policy "Users create own support tickets"
on public.support_tickets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

revoke all privileges on table public.support_tickets from public, anon, authenticated;
grant select on table public.support_tickets to authenticated;
grant insert (user_id, category, subject, message)
  on table public.support_tickets to authenticated;

create index if not exists idx_support_tickets_user_created_at
  on public.support_tickets (user_id, created_at desc);

create index if not exists idx_coin_transactions_user_created_at
  on public.coin_transactions (user_id, created_at desc);

create index if not exists idx_marketplace_exchanges_user_created_at
  on public.marketplace_exchanges (user_id, created_at desc);

create or replace function public.get_my_private_profile()
returns table (
  id uuid,
  email text,
  phone text,
  nickname text,
  bio text,
  interests text[],
  sns_links jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.email,
    profile.phone,
    profile.nickname,
    profile.bio,
    profile.interests,
    profile.sns_links,
    profile.updated_at
  from public.users as profile
  where profile.id = (select auth.uid());
$$;

create or replace function public.update_my_private_profile(
  p_nickname text,
  p_bio text default '',
  p_interests text[] default '{}'::text[],
  p_sns_links jsonb default '[]'::jsonb
)
returns table (
  id uuid,
  email text,
  phone text,
  nickname text,
  bio text,
  interests text[],
  sns_links jsonb,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_nickname is null
     or char_length(btrim(p_nickname)) < 1
     or char_length(btrim(p_nickname)) > 20 then
    raise exception 'nickname must contain 1 to 20 characters' using errcode = '22023';
  end if;

  if char_length(coalesce(p_bio, '')) > 50 then
    raise exception 'bio must contain at most 50 characters' using errcode = '22023';
  end if;

  if cardinality(coalesce(p_interests, '{}'::text[])) > 10
     or exists (
       select 1
       from unnest(coalesce(p_interests, '{}'::text[])) as interest(value)
       where btrim(interest.value) = '' or char_length(interest.value) > 50
     ) then
    raise exception 'interests are invalid' using errcode = '22023';
  end if;

  if p_sns_links is null or jsonb_typeof(p_sns_links) <> 'array'
     or jsonb_array_length(p_sns_links) > 5
     or exists (
       select 1
       from jsonb_array_elements_text(p_sns_links) as link(value)
       where link.value !~* '^https?://[^[:space:]]+$'
          or char_length(link.value) > 2048
     ) then
    raise exception 'SNS links are invalid' using errcode = '22023';
  end if;

  update public.users as profile
  set
    nickname = btrim(p_nickname),
    bio = btrim(coalesce(p_bio, '')),
    interests = coalesce(p_interests, '{}'::text[]),
    sns_links = p_sns_links,
    updated_at = now()
  where profile.id = v_user_id;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  return query
  select
    profile.id,
    profile.email,
    profile.phone,
    profile.nickname,
    profile.bio,
    profile.interests,
    profile.sns_links,
    profile.updated_at
  from public.users as profile
  where profile.id = v_user_id;
end;
$$;

revoke all on function public.get_my_private_profile() from public, anon, authenticated;
revoke all on function public.update_my_private_profile(text, text, text[], jsonb)
  from public, anon, authenticated;
grant execute on function public.get_my_private_profile() to authenticated;
grant execute on function public.update_my_private_profile(text, text, text[], jsonb)
  to authenticated;

comment on table public.support_tickets is
  'Owner-scoped customer support inquiries submitted from My Info.';
comment on function public.get_my_private_profile() is
  'Returns private profile fields only for the active authenticated user.';
comment on function public.update_my_private_profile(text, text, text[], jsonb) is
  'Validates and updates editable private profile fields for the active user.';
