-- Stage 2: protect personal/sensitive columns and replace broad default grants
-- with the minimum browser permissions used by the current application.

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.participations enable row level security;
alter table public.reviews enable row level security;
alter table public.coin_wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.marketplace_exchanges enable row level security;
alter table public.scraps enable row level security;
alter table public.notifications enable row level security;

-- Profiles: public display fields remain readable. Contact fields stay on the
-- table for phase 4 but are no longer selectable through the browser roles.
drop policy if exists "Public profiles are viewable by everyone" on public.users;
drop policy if exists "Public profile fields are viewable" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users update own editable profile" on public.users;

create policy "Public profile fields are viewable"
on public.users for select
to anon, authenticated
using (true);

create policy "Users update own editable profile"
on public.users for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Projects: only recruiting/completed projects are public. A creator can still
-- read drafts and manage their own projects. Credentials are blocked by grants.
drop policy if exists "Projects viewable by everyone" on public.projects;
drop policy if exists "Published projects are viewable" on public.projects;
drop policy if exists "Creators view own projects" on public.projects;
drop policy if exists "Visible projects are viewable" on public.projects;
drop policy if exists "Authenticated users with gating pass can create projects" on public.projects;
drop policy if exists "Qualified users create own projects" on public.projects;
drop policy if exists "Creators can update own projects" on public.projects;
drop policy if exists "Creators can delete own projects" on public.projects;

create policy "Visible projects are viewable"
on public.projects for select
to anon, authenticated
using (
  status in ('recruiting', 'completed')
  or creator_id = (select auth.uid())
);

create policy "Qualified users create own projects"
on public.projects for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and exists (
    select 1
    from public.users as profile
    where profile.id = (select auth.uid())
      and profile.has_passed_gating
  )
);

create policy "Creators update own projects"
on public.projects for update
to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

create policy "Creators delete own projects"
on public.projects for delete
to authenticated
using ((select auth.uid()) = creator_id);

-- Participation and review rows are private to the tester and project creator,
-- except reviews explicitly marked public by the project.
drop policy if exists "Users view own participations or creators view project participations" on public.participations;
drop policy if exists "Users view own participations or creators view project particip" on public.participations;
drop policy if exists "Users can apply for participation" on public.participations;
drop policy if exists "Participants and creators view participations" on public.participations;
drop policy if exists "Users apply as themselves" on public.participations;

create policy "Participants and creators view participations"
on public.participations for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.projects as project
    where project.id = participations.project_id
      and project.creator_id = (select auth.uid())
  )
);

create policy "Users apply as themselves"
on public.participations for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Reviews viewable based on public setting or ownership" on public.reviews;
drop policy if exists "Testers can insert own review" on public.reviews;
drop policy if exists "Reviews follow project visibility or ownership" on public.reviews;
drop policy if exists "Testers insert own reviews" on public.reviews;
drop policy if exists "Creators update reviews on own projects" on public.reviews;

create policy "Reviews follow project visibility or ownership"
on public.reviews for select
to anon, authenticated
using (
  exists (
    select 1
    from public.projects as project
    where project.id = reviews.project_id
      and (
        project.is_reviews_public
        or project.creator_id = (select auth.uid())
      )
  )
  or (select auth.uid()) = user_id
);

create policy "Testers insert own reviews"
on public.reviews for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Creators update reviews on own projects"
on public.reviews for update
to authenticated
using (
  exists (
    select 1
    from public.projects as project
    where project.id = reviews.project_id
      and project.creator_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects as project
    where project.id = reviews.project_id
      and project.creator_id = (select auth.uid())
  )
);

-- User-owned financial and activity rows.
drop policy if exists "Users view own wallet" on public.coin_wallets;
create policy "Users view own wallet"
on public.coin_wallets for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users view own coin transactions" on public.coin_transactions;
create policy "Users view own coin transactions"
on public.coin_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users view own exchanges" on public.marketplace_exchanges;
create policy "Users view own exchanges"
on public.marketplace_exchanges for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users view own scraps" on public.scraps;
drop policy if exists "Users insert own scraps" on public.scraps;
drop policy if exists "Users delete own scraps" on public.scraps;

create policy "Users view own scraps"
on public.scraps for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users insert own scraps"
on public.scraps for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users delete own scraps"
on public.scraps for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users view own notifications" on public.notifications;
drop policy if exists "Users insert own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Users delete own notifications" on public.notifications;

create policy "Users view own notifications"
on public.notifications for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users insert own notifications"
on public.notifications for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update own notifications"
on public.notifications for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete own notifications"
on public.notifications for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Market items viewable by everyone" on public.marketplace_items;
drop policy if exists "Active market items are viewable" on public.marketplace_items;
create policy "Active market items are viewable"
on public.marketplace_items for select
to anon, authenticated
using (is_active);

-- Remove the broad Supabase defaults first. RLS remains the row boundary;
-- grants below become the operation/column boundary.
revoke all privileges on table public.users from anon, authenticated;
revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.participations from anon, authenticated;
revoke all privileges on table public.reviews from anon, authenticated;
revoke all privileges on table public.coin_wallets from anon, authenticated;
revoke all privileges on table public.coin_transactions from anon, authenticated;
revoke all privileges on table public.marketplace_items from anon, authenticated;
revoke all privileges on table public.marketplace_exchanges from anon, authenticated;
revoke all privileges on table public.scraps from anon, authenticated;
revoke all privileges on table public.notifications from anon, authenticated;

grant select (
  id, nickname, bio, avatar_url, interests, level, rank_badge,
  has_passed_gating, completed_test_count, created_at, updated_at
) on table public.users to anon, authenticated;

grant update (
  nickname, bio, avatar_url, interests, has_passed_gating
) on table public.users to authenticated;

grant select (
  id, creator_id, title, service_name, service_desc, test_notice,
  thumbnail_url, category, platform, is_ab_test, service_url, ab_url_a,
  ab_url_b, app_playstore_url, app_appstore_url, login_required,
  privacy_items, test_guide, questions, quizzes, duration, start_date,
  end_date, target_count, current_count, reward_coin, total_funded_cost,
  is_reviews_public, status, tech_tags, created_at
) on table public.projects to anon, authenticated;

grant insert (
  creator_id, title, service_name, service_desc, test_notice, thumbnail_url,
  category, platform, is_ab_test, service_url, ab_url_a, ab_url_b,
  app_playstore_url, app_appstore_url, login_required, test_account_id,
  test_account_pw, privacy_items, test_guide, questions, quizzes, duration,
  start_date, end_date, target_count, reward_coin, total_funded_cost,
  is_reviews_public, status, tech_tags
) on table public.projects to authenticated;

grant update (
  title, service_name, service_desc, test_notice, thumbnail_url, category,
  platform, is_ab_test, service_url, ab_url_a, ab_url_b, app_playstore_url,
  app_appstore_url, login_required, test_account_id, test_account_pw,
  privacy_items, test_guide, questions, quizzes, duration, start_date,
  end_date, target_count, reward_coin, total_funded_cost, is_reviews_public,
  status, tech_tags
) on table public.projects to authenticated;

grant delete on table public.projects to authenticated;

grant select on table public.participations to authenticated;
grant insert (project_id, user_id, assigned_variant, status)
  on table public.participations to authenticated;

grant select (
  id, project_id, user_id, rating, reuse_intention, answers,
  creator_reply, creator_replied_at, status, created_at
) on table public.reviews to anon, authenticated;
grant insert (
  project_id, participation_id, user_id, rating, reuse_intention, answers,
  quiz_answers, is_quiz_passed, screenshot_url
) on table public.reviews to authenticated;
grant update (creator_reply, creator_replied_at, status)
  on table public.reviews to authenticated;

grant select on table public.coin_wallets to authenticated;
grant select on table public.coin_transactions to authenticated;
grant select on table public.marketplace_items to anon, authenticated;
grant select on table public.marketplace_exchanges to authenticated;
grant select, insert, delete on table public.scraps to authenticated;

grant select, delete on table public.notifications to authenticated;
grant insert (user_id, type, title, message, target_url, is_read)
  on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;

-- Abort the migration if any high-risk grant survived or required public
-- display access was accidentally removed.
do $$
begin
  if has_column_privilege('anon', 'public.users', 'email', 'select')
    or has_column_privilege('authenticated', 'public.users', 'email', 'select')
    or has_column_privilege('anon', 'public.users', 'phone', 'select')
    or has_column_privilege('authenticated', 'public.users', 'phone', 'select')
    or has_column_privilege('anon', 'public.users', 'sns_links', 'select')
    or has_column_privilege('authenticated', 'public.users', 'sns_links', 'select')
  then
    raise exception 'privacy hardening failed: a browser role can read profile contact data';
  end if;

  if has_column_privilege('anon', 'public.projects', 'test_account_id', 'select')
    or has_column_privilege('authenticated', 'public.projects', 'test_account_id', 'select')
    or has_column_privilege('anon', 'public.projects', 'test_account_pw', 'select')
    or has_column_privilege('authenticated', 'public.projects', 'test_account_pw', 'select')
  then
    raise exception 'privacy hardening failed: a browser role can read test credentials';
  end if;

  if has_column_privilege('anon', 'public.reviews', 'screenshot_url', 'select')
    or has_column_privilege('authenticated', 'public.reviews', 'quiz_answers', 'select')
  then
    raise exception 'privacy hardening failed: a sensitive review column remains readable';
  end if;

  if has_table_privilege('anon', 'public.users', 'insert')
    or has_table_privilege('anon', 'public.projects', 'update')
    or has_table_privilege('anon', 'public.projects', 'delete')
    or has_table_privilege('authenticated', 'public.users', 'truncate')
    or has_table_privilege('authenticated', 'public.projects', 'trigger')
  then
    raise exception 'privacy hardening failed: an unsafe table privilege remains';
  end if;

  if not has_column_privilege('anon', 'public.users', 'nickname', 'select')
    or not has_column_privilege('anon', 'public.projects', 'title', 'select')
    or not has_table_privilege('authenticated', 'public.coin_wallets', 'select')
  then
    raise exception 'privacy hardening failed: required application access is missing';
  end if;
end;
$$;
