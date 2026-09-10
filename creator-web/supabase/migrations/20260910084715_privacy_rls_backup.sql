-- Structural recovery snapshot for the stage-2 privacy/RLS migration.
-- No application row data is copied because the next migration changes only
-- policies and grants.

create schema if not exists private;
revoke all on schema private from public;

create table private.privacy_rls_policies_backup_20260910 as
select *
from pg_policies
where schemaname = 'public';

create table private.privacy_rls_table_grants_backup_20260910 as
select *
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');

create table private.privacy_rls_column_grants_backup_20260910 as
select *
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');

revoke all on table private.privacy_rls_policies_backup_20260910
  from public, anon, authenticated;
revoke all on table private.privacy_rls_table_grants_backup_20260910
  from public, anon, authenticated;
revoke all on table private.privacy_rls_column_grants_backup_20260910
  from public, anon, authenticated;
