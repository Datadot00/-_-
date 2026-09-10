begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_table('public', 'users', 'public.users exists');
select has_table('public', 'coin_wallets', 'public.coin_wallets exists');

select is(
  (
    select count(*)
    from auth.users as auth_user
    left join public.users as profile on profile.id = auth_user.id
    where profile.id is null
  ),
  0::bigint,
  'every auth user has exactly one public profile'
);

select is(
  (
    select count(*)
    from public.users as profile
    left join public.coin_wallets as wallet on wallet.user_id = profile.id
    where wallet.user_id is null
  ),
  0::bigint,
  'every public profile has exactly one wallet'
);

select ok(
  exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'handle_new_user'
      and procedure.prosecdef
  ),
  'signup trigger function is private and security definer'
);

select ok(
  exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'handle_new_user'
      and array_to_string(coalesce(procedure.proconfig, array[]::text[]), ',') like '%search_path=%'
  ),
  'signup trigger function has a fixed search_path'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and not tgisinternal
  ),
  'signup profile trigger exists'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_email_updated'
      and not tgisinternal
  ),
  'Auth email synchronization trigger exists'
);

select * from finish();

rollback;
