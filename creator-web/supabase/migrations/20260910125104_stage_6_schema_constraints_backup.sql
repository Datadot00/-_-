-- Stage 6 recovery point before normalizing profile gating.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.schema_constraints_users_backup_20260910 (
  user_id uuid primary key,
  has_passed_gating boolean not null,
  completed_test_count integer not null,
  backed_up_at timestamptz not null default now()
);

insert into private.schema_constraints_users_backup_20260910 (
  user_id,
  has_passed_gating,
  completed_test_count
)
select id, has_passed_gating, completed_test_count
from public.users
on conflict (user_id) do nothing;

revoke all on table private.schema_constraints_users_backup_20260910
  from public, anon, authenticated;

comment on table private.schema_constraints_users_backup_20260910 is
  'Stage 6 recovery point for profile gating values before consistency enforcement.';
