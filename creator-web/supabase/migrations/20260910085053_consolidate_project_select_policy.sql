-- The same access rule expressed as one policy avoids evaluating two
-- permissive SELECT policies for authenticated users.

drop policy if exists "Published projects are viewable" on public.projects;
drop policy if exists "Creators view own projects" on public.projects;
drop policy if exists "Visible projects are viewable" on public.projects;

create policy "Visible projects are viewable"
on public.projects for select
to anon, authenticated
using (
  status in ('recruiting', 'completed')
  or creator_id = (select auth.uid())
);
