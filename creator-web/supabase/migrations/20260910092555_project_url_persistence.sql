-- Stage 3: make project creation and URL storage durable and verifiable.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.project_url_backup_20260910 as
select
  id,
  service_url,
  ab_url_a,
  ab_url_b,
  app_playstore_url,
  app_appstore_url,
  now() as backed_up_at
from public.projects;

revoke all privileges on table private.project_url_backup_20260910
  from public, anon, authenticated;

alter table public.projects
  add column if not exists external_survey_url text;

-- Preserve existing values while canonicalizing the four legacy rows that
-- were saved without an HTTP scheme. Empty optional URL fields become null.
update public.projects
set
  service_url = case
    when nullif(btrim(service_url), '') is null then null
    when btrim(service_url) ~* '^https?://' then btrim(service_url)
    else 'https://' || btrim(service_url)
  end,
  ab_url_a = case
    when nullif(btrim(ab_url_a), '') is null then null
    when btrim(ab_url_a) ~* '^https?://' then btrim(ab_url_a)
    else 'https://' || btrim(ab_url_a)
  end,
  ab_url_b = case
    when nullif(btrim(ab_url_b), '') is null then null
    when btrim(ab_url_b) ~* '^https?://' then btrim(ab_url_b)
    else 'https://' || btrim(ab_url_b)
  end,
  app_playstore_url = case
    when nullif(btrim(app_playstore_url), '') is null then null
    when btrim(app_playstore_url) ~* '^https?://' then btrim(app_playstore_url)
    else 'https://' || btrim(app_playstore_url)
  end,
  app_appstore_url = case
    when nullif(btrim(app_appstore_url), '') is null then null
    when btrim(app_appstore_url) ~* '^https?://' then btrim(app_appstore_url)
    else 'https://' || btrim(app_appstore_url)
  end;

alter table public.projects
  add constraint projects_title_not_blank
    check (btrim(title) <> '') not valid,
  add constraint projects_service_name_not_blank
    check (btrim(service_name) <> '') not valid,
  add constraint projects_service_desc_not_blank
    check (btrim(service_desc) <> '') not valid,
  add constraint projects_date_range_valid
    check (start_date <= end_date) not valid,
  add constraint projects_participant_counts_valid
    check (target_count > 0 and current_count >= 0 and current_count <= target_count) not valid,
  add constraint projects_reward_values_valid
    check (reward_coin >= 0 and total_funded_cost >= 0) not valid,
  add constraint projects_service_url_http_check
    check (service_url is null or (
      length(service_url) <= 2048 and service_url ~* '^https?://[^[:space:]]+$'
    )) not valid,
  add constraint projects_ab_url_a_http_check
    check (ab_url_a is null or (
      length(ab_url_a) <= 2048 and ab_url_a ~* '^https?://[^[:space:]]+$'
    )) not valid,
  add constraint projects_ab_url_b_http_check
    check (ab_url_b is null or (
      length(ab_url_b) <= 2048 and ab_url_b ~* '^https?://[^[:space:]]+$'
    )) not valid,
  add constraint projects_playstore_url_http_check
    check (app_playstore_url is null or (
      length(app_playstore_url) <= 2048 and app_playstore_url ~* '^https?://[^[:space:]]+$'
    )) not valid,
  add constraint projects_appstore_url_http_check
    check (app_appstore_url is null or (
      length(app_appstore_url) <= 2048 and app_appstore_url ~* '^https?://[^[:space:]]+$'
    )) not valid,
  add constraint projects_external_survey_url_http_check
    check (external_survey_url is null or (
      length(external_survey_url) <= 2048 and external_survey_url ~* '^https?://[^[:space:]]+$'
    )) not valid;

alter table public.projects validate constraint projects_title_not_blank;
alter table public.projects validate constraint projects_service_name_not_blank;
alter table public.projects validate constraint projects_service_desc_not_blank;
alter table public.projects validate constraint projects_date_range_valid;
alter table public.projects validate constraint projects_participant_counts_valid;
alter table public.projects validate constraint projects_reward_values_valid;
alter table public.projects validate constraint projects_service_url_http_check;
alter table public.projects validate constraint projects_ab_url_a_http_check;
alter table public.projects validate constraint projects_ab_url_b_http_check;
alter table public.projects validate constraint projects_playstore_url_http_check;
alter table public.projects validate constraint projects_appstore_url_http_check;
alter table public.projects validate constraint projects_external_survey_url_http_check;

create or replace function private.keep_project_service_url_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.service_url is distinct from old.service_url then
    raise exception 'project service_url cannot be changed after registration'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.keep_project_service_url_immutable()
  from public, anon, authenticated;

drop trigger if exists keep_project_service_url_immutable on public.projects;
create trigger keep_project_service_url_immutable
  before update on public.projects
  for each row
  execute function private.keep_project_service_url_immutable();

grant select (external_survey_url) on table public.projects to anon, authenticated;
grant insert (external_survey_url) on table public.projects to authenticated;
grant update (external_survey_url) on table public.projects to authenticated;
revoke update (service_url) on table public.projects from authenticated;

comment on column public.projects.external_survey_url is
  'Optional external feedback form URL, normalized to HTTP(S).';
comment on function private.keep_project_service_url_immutable() is
  'Keeps the primary service URL stable after project registration.';
