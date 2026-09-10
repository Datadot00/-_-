begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_column(
  'public', 'projects', 'external_survey_url',
  'projects stores an external survey URL separately'
);

select ok(
  has_column_privilege('anon', 'public.projects', 'external_survey_url', 'select'),
  'public project readers can read the non-sensitive survey URL'
);

select ok(
  has_column_privilege('authenticated', 'public.projects', 'external_survey_url', 'insert'),
  'authenticated creators can persist the survey URL'
);

select ok(
  not has_column_privilege('authenticated', 'public.projects', 'service_url', 'update'),
  'the primary service URL is immutable after registration'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.projects'::regclass
      and tgname = 'keep_project_service_url_immutable'
      and not tgisinternal
  ),
  'the database also enforces service URL immutability'
);

select ok(
  not exists (
    select 1 from public.projects
    where service_url is not null
      and service_url !~* '^https?://[^[:space:]]+$'
  ),
  'all persisted primary URLs use HTTP(S)'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_service_url_http_check'
      and convalidated
  ),
  'the primary URL constraint is validated'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_external_survey_url_http_check'
      and convalidated
  ),
  'the survey URL constraint is validated'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_date_range_valid'
      and convalidated
  ),
  'the project date range constraint is validated'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_participant_counts_valid'
      and convalidated
  ),
  'participant counts remain internally consistent'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_reward_values_valid'
      and convalidated
  ),
  'reward values cannot be negative'
);

select ok(
  to_regclass('private.project_url_backup_20260910') is not null,
  'the pre-normalization URL backup exists'
);

select * from finish();

rollback;
