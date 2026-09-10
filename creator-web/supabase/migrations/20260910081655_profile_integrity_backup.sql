-- Recovery snapshot for the stage-1 profile integrity migration.
-- These tables stay in a non-exposed schema and capture only the rows and
-- database objects that the next migration can change.

create schema if not exists private;
revoke all on schema private from public;

create table private.profile_integrity_users_backup_20260910 as
select *
from public.users;

create table private.profile_integrity_wallets_backup_20260910 as
select *
from public.coin_wallets;

create table private.profile_integrity_objects_backup_20260910 as
select
  'function'::text as object_type,
  namespace.nspname::text as schema_name,
  procedure.proname::text as object_name,
  pg_get_function_identity_arguments(procedure.oid)::text as identity_arguments,
  pg_get_functiondef(procedure.oid)::text as definition,
  now() as backed_up_at
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.proname = 'handle_new_user'

union all

select
  'trigger'::text,
  'auth'::text,
  trigger.tgname::text,
  null::text,
  pg_get_triggerdef(trigger.oid, true)::text,
  now()
from pg_trigger as trigger
where trigger.tgrelid = 'auth.users'::regclass
  and trigger.tgname in ('on_auth_user_created', 'on_auth_user_email_updated')
  and not trigger.tgisinternal;

revoke all on table private.profile_integrity_users_backup_20260910
  from public, anon, authenticated;
revoke all on table private.profile_integrity_wallets_backup_20260910
  from public, anon, authenticated;
revoke all on table private.profile_integrity_objects_backup_20260910
  from public, anon, authenticated;
