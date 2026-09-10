-- My Projects reload path: owner filter plus newest-first ordering.

create index if not exists idx_projects_creator_id_created_at
  on public.projects (creator_id, created_at desc);
