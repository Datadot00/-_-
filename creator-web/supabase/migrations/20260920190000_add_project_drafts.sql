-- Add project_drafts table for cross-device draft persistence

create table if not exists public.project_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_step integer not null default 1 check (current_step between 1 and 3),
  draft_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_drafts_user_unique unique (user_id)
);

alter table public.project_drafts enable row level security;

drop policy if exists "project_drafts_select_own" on public.project_drafts;
create policy "project_drafts_select_own"
  on public.project_drafts for select
  using (auth.uid() = user_id);

drop policy if exists "project_drafts_insert_own" on public.project_drafts;
create policy "project_drafts_insert_own"
  on public.project_drafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "project_drafts_update_own" on public.project_drafts;
create policy "project_drafts_update_own"
  on public.project_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "project_drafts_delete_own" on public.project_drafts;
create policy "project_drafts_delete_own"
  on public.project_drafts for delete
  using (auth.uid() = user_id);

create index if not exists idx_project_drafts_user_id on public.project_drafts (user_id);
