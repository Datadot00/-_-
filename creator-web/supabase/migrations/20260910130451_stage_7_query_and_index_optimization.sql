-- Stage 7: align indexes with the queries used by the explore feed and My Info.

create extension if not exists pg_trgm with schema extensions;

-- PostgREST cannot directly filter an arbitrary concatenated expression. Keep a
-- generated public search surface containing only already-public project text.
alter table public.projects
  add column if not exists search_text text
  generated always as (title || ' ' || service_name || ' ' || service_desc) stored;

grant select (search_text) on table public.projects to anon, authenticated;

create index if not exists idx_projects_search_text_trgm
  on public.projects using gin (search_text extensions.gin_trgm_ops);
create index if not exists idx_projects_feed_recent
  on public.projects (created_at desc, id desc);
create index if not exists idx_projects_category_recent
  on public.projects (category, created_at desc, id desc);
create index if not exists idx_projects_platform_recent
  on public.projects (platform, created_at desc, id desc);

-- Owner-scoped lists use equality on user_id followed by newest-first ordering.
create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);
create index if not exists idx_scraps_user_created_at
  on public.scraps (user_id, created_at desc);

-- Cover the reverse side of foreign keys used during project/participation
-- deletion. The unique indexes on other column orders do not cover these paths.
create index if not exists idx_scraps_project_id
  on public.scraps (project_id);
create index if not exists idx_reviews_participation_identity
  on public.reviews (participation_id, project_id, user_id);

analyze public.projects;
analyze public.notifications;
analyze public.scraps;
analyze public.reviews;

comment on column public.projects.search_text is
  'Generated search surface for project title, service name, and public description.';
comment on index public.idx_projects_search_text_trgm is
  'Accelerates case-insensitive substring search, including Korean project text.';
