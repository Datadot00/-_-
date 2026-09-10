-- Stage 5 recovery point before normalizing project counters and write grants.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.transaction_project_counts_backup_20260910 (
  project_id uuid primary key,
  stored_current_count integer not null,
  actual_participant_count integer not null,
  backed_up_at timestamptz not null default now()
);

insert into private.transaction_project_counts_backup_20260910 (
  project_id,
  stored_current_count,
  actual_participant_count
)
select
  project.id,
  project.current_count,
  count(participation.id)::integer
from public.projects as project
left join public.participations as participation
  on participation.project_id = project.id
group by project.id, project.current_count
on conflict (project_id) do nothing;

revoke all on table private.transaction_project_counts_backup_20260910
  from public, anon, authenticated;

comment on table private.transaction_project_counts_backup_20260910 is
  'Stage 5 recovery point for project counters before transactional participation rollout.';
