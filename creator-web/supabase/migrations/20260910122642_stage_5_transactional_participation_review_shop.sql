-- Stage 5: make participation, review rewards, and shop exchanges atomic.

-- Replace sample counters with the source-of-truth participation count.
update public.projects as project
set current_count = counts.actual_count
from (
  select
    target.id as project_id,
    count(participation.id)::integer as actual_count
  from public.projects as target
  left join public.participations as participation
    on participation.project_id = target.id
  group by target.id
) as counts
where project.id = counts.project_id
  and project.current_count is distinct from counts.actual_count;

alter table public.participations
  drop constraint if exists participations_variant_valid,
  drop constraint if exists participations_status_valid;
alter table public.participations
  add constraint participations_variant_valid
    check (assigned_variant is null or assigned_variant in ('A', 'B')),
  add constraint participations_status_valid
    check (status in ('applied', 'in_progress', 'submitted', 'approved', 'rejected'));

alter table public.reviews
  alter column participation_id set not null;
alter table public.reviews
  drop constraint if exists reviews_participation_unique,
  drop constraint if exists reviews_rating_valid,
  drop constraint if exists reviews_status_valid;
alter table public.reviews
  add constraint reviews_participation_unique unique (participation_id),
  add constraint reviews_rating_valid check (rating >= 1 and rating <= 5),
  add constraint reviews_status_valid check (status in ('submitted', 'approved', 'rejected'));

alter table public.coin_wallets
  drop constraint if exists coin_wallets_nonnegative;
alter table public.coin_wallets
  add constraint coin_wallets_nonnegative
    check (earned_coins >= 0 and paid_coins >= 0);

alter table public.coin_transactions
  add column if not exists reference_type text,
  add column if not exists reference_id uuid;
alter table public.coin_transactions
  drop constraint if exists coin_transactions_amount_nonzero,
  drop constraint if exists coin_transactions_coin_type_valid;
alter table public.coin_transactions
  add constraint coin_transactions_amount_nonzero check (amount <> 0),
  add constraint coin_transactions_coin_type_valid check (coin_type in ('earned', 'paid'));

alter table public.marketplace_items
  drop constraint if exists marketplace_items_price_positive,
  drop constraint if exists marketplace_items_stock_nonnegative;
alter table public.marketplace_items
  add constraint marketplace_items_price_positive check (price_coins > 0),
  add constraint marketplace_items_stock_nonnegative check (stock_count >= 0);

alter table public.marketplace_exchanges
  drop constraint if exists marketplace_exchanges_spent_positive,
  drop constraint if exists marketplace_exchanges_status_valid;
alter table public.marketplace_exchanges
  add constraint marketplace_exchanges_spent_positive check (spent_coins > 0),
  add constraint marketplace_exchanges_status_valid
    check (status in ('completed', 'cancelled', 'refunded'));

create unique index if not exists idx_coin_transactions_reference_once
  on public.coin_transactions (user_id, type, reference_id, coin_type)
  where reference_id is not null;
create index if not exists idx_participations_user_applied_at
  on public.participations (user_id, applied_at desc);
create index if not exists idx_reviews_project_created_at
  on public.reviews (project_id, created_at desc);
create index if not exists idx_reviews_user_created_at
  on public.reviews (user_id, created_at desc);
create index if not exists idx_marketplace_exchanges_item_id
  on public.marketplace_exchanges (item_id);

create or replace function public.apply_to_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_participation public.participations%rowtype;
  v_variant text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project not found' using errcode = 'P0002';
  end if;
  if v_project.creator_id = v_user_id then
    raise exception 'creators cannot participate in their own project' using errcode = '22023';
  end if;
  if v_project.status <> 'recruiting' then
    raise exception 'project is not recruiting' using errcode = '22023';
  end if;
  if v_project.start_date is not null and current_date < v_project.start_date then
    raise exception 'project has not started' using errcode = '22023';
  end if;
  if v_project.end_date is not null and current_date > v_project.end_date then
    raise exception 'project recruitment has ended' using errcode = '22023';
  end if;
  if v_project.current_count >= v_project.target_count then
    raise exception 'project capacity reached' using errcode = '22023';
  end if;

  v_variant := case
    when v_project.is_ab_test then
      case when substr(md5(v_user_id::text || p_project_id::text), 1, 1) < '8' then 'A' else 'B' end
    else null
  end;

  insert into public.participations (project_id, user_id, assigned_variant, status)
  values (p_project_id, v_user_id, v_variant, 'applied')
  returning * into v_participation;

  update public.projects
  set current_count = current_count + 1
  where id = p_project_id;

  return jsonb_build_object(
    'id', v_participation.id,
    'project_id', v_participation.project_id,
    'user_id', v_participation.user_id,
    'assigned_variant', v_participation.assigned_variant,
    'status', v_participation.status,
    'applied_at', v_participation.applied_at,
    'project_current_count', v_project.current_count + 1
  );
exception
  when unique_violation then
    raise exception 'already participating in this project' using errcode = '23505';
end;
$$;

create or replace function public.submit_project_review(
  p_project_id uuid,
  p_rating numeric,
  p_reuse_intention boolean default true,
  p_answers jsonb default '{}'::jsonb,
  p_quiz_answers jsonb default '{}'::jsonb,
  p_is_quiz_passed boolean default true,
  p_screenshot_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_participation_id uuid;
  v_participation_status text;
  v_reward integer;
  v_project_title text;
  v_review_id uuid;
  v_completed_count integer;
  v_has_passed_gating boolean;
  v_earned_coins integer;
  v_paid_coins integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5' using errcode = '22023';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) not in ('object', 'array') then
    raise exception 'answers must be a JSON object or array' using errcode = '22023';
  end if;
  if p_quiz_answers is null or jsonb_typeof(p_quiz_answers) not in ('object', 'array') then
    raise exception 'quiz answers must be a JSON object or array' using errcode = '22023';
  end if;
  if p_screenshot_url is not null and (
    char_length(p_screenshot_url) > 2048
    or p_screenshot_url !~* '^https?://[^[:space:]]+$'
  ) then
    raise exception 'screenshot URL is invalid' using errcode = '22023';
  end if;

  select participation.id, participation.status, project.reward_coin, project.title
  into v_participation_id, v_participation_status, v_reward, v_project_title
  from public.participations as participation
  join public.projects as project on project.id = participation.project_id
  where participation.project_id = p_project_id
    and participation.user_id = v_user_id
  for update of participation;

  if not found then
    raise exception 'active participation not found' using errcode = 'P0002';
  end if;
  if v_participation_status not in ('applied', 'in_progress') then
    raise exception 'review was already submitted for this participation' using errcode = '23505';
  end if;

  insert into public.reviews (
    project_id,
    participation_id,
    user_id,
    rating,
    reuse_intention,
    answers,
    quiz_answers,
    is_quiz_passed,
    screenshot_url,
    status
  ) values (
    p_project_id,
    v_participation_id,
    v_user_id,
    p_rating,
    coalesce(p_reuse_intention, true),
    p_answers,
    p_quiz_answers,
    coalesce(p_is_quiz_passed, true),
    p_screenshot_url,
    'submitted'
  )
  returning id into v_review_id;

  update public.participations
  set status = 'submitted', completed_at = now()
  where id = v_participation_id;

  insert into public.coin_wallets (user_id, earned_coins, paid_coins)
  values (v_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select earned_coins, paid_coins
  into v_earned_coins, v_paid_coins
  from public.coin_wallets
  where user_id = v_user_id
  for update;

  if v_reward > 0 then
    insert into public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) values (
      v_user_id,
      v_reward,
      'earned',
      'reward_earned',
      '[리뷰 리워드] ' || v_project_title,
      'review',
      v_review_id
    );

    update public.coin_wallets
    set earned_coins = earned_coins + v_reward, updated_at = now()
    where user_id = v_user_id
    returning earned_coins, paid_coins into v_earned_coins, v_paid_coins;
  end if;

  update public.users
  set
    completed_test_count = completed_test_count + 1,
    has_passed_gating = has_passed_gating or (completed_test_count + 1 >= 3),
    updated_at = now()
  where id = v_user_id
  returning completed_test_count, has_passed_gating
  into v_completed_count, v_has_passed_gating;

  return jsonb_build_object(
    'review_id', v_review_id,
    'participation_id', v_participation_id,
    'project_id', p_project_id,
    'reward_amount', v_reward,
    'wallet_earned_coins', v_earned_coins,
    'wallet_paid_coins', v_paid_coins,
    'wallet_total', v_earned_coins + v_paid_coins,
    'completed_test_count', v_completed_count,
    'has_passed_gating', v_has_passed_gating
  );
end;
$$;

create or replace function public.exchange_marketplace_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.marketplace_items%rowtype;
  v_earned_coins integer;
  v_paid_coins integer;
  v_spent_earned integer;
  v_spent_paid integer;
  v_exchange_id uuid;
  v_voucher_code text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
  into v_item
  from public.marketplace_items
  where id = p_item_id
  for update;

  if not found or not v_item.is_active then
    raise exception 'marketplace item is unavailable' using errcode = 'P0002';
  end if;
  if v_item.stock_count <= 0 then
    raise exception 'marketplace item is out of stock' using errcode = '22023';
  end if;

  select earned_coins, paid_coins
  into v_earned_coins, v_paid_coins
  from public.coin_wallets
  where user_id = v_user_id
  for update;

  if not found or v_earned_coins + v_paid_coins < v_item.price_coins then
    raise exception 'insufficient coin balance' using errcode = '22023';
  end if;

  v_spent_earned := least(v_earned_coins, v_item.price_coins);
  v_spent_paid := v_item.price_coins - v_spent_earned;
  v_voucher_code := 'DON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.marketplace_exchanges (
    user_id, item_id, spent_coins, voucher_code, status
  ) values (
    v_user_id, v_item.id, v_item.price_coins, v_voucher_code, 'completed'
  )
  returning id into v_exchange_id;

  update public.marketplace_items
  set stock_count = stock_count - 1
  where id = v_item.id;

  update public.coin_wallets
  set
    earned_coins = earned_coins - v_spent_earned,
    paid_coins = paid_coins - v_spent_paid,
    updated_at = now()
  where user_id = v_user_id
  returning earned_coins, paid_coins into v_earned_coins, v_paid_coins;

  if v_spent_earned > 0 then
    insert into public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) values (
      v_user_id,
      -v_spent_earned,
      'earned',
      'shop_purchase',
      '[상점 교환] ' || v_item.name,
      'marketplace_exchange',
      v_exchange_id
    );
  end if;

  if v_spent_paid > 0 then
    insert into public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) values (
      v_user_id,
      -v_spent_paid,
      'paid',
      'shop_purchase',
      '[상점 교환] ' || v_item.name,
      'marketplace_exchange',
      v_exchange_id
    );
  end if;

  return jsonb_build_object(
    'exchange_id', v_exchange_id,
    'item_id', v_item.id,
    'item_name', v_item.name,
    'spent_coins', v_item.price_coins,
    'voucher_code', v_voucher_code,
    'wallet_earned_coins', v_earned_coins,
    'wallet_paid_coins', v_paid_coins,
    'wallet_total', v_earned_coins + v_paid_coins,
    'remaining_stock', v_item.stock_count - 1,
    'status', 'completed'
  );
end;
$$;

-- Browser clients may read owner-scoped rows, but all state-changing steps go
-- through the server-validated transaction functions above.
drop policy if exists "Users apply as themselves" on public.participations;
drop policy if exists "Testers insert own reviews" on public.reviews;

revoke all privileges on table public.participations from authenticated;
grant select on table public.participations to authenticated;

revoke all privileges on table public.reviews from authenticated;
grant select (
  id, project_id, user_id, rating, reuse_intention, answers,
  creator_reply, creator_replied_at, status, created_at
) on table public.reviews to authenticated;
grant update (creator_reply, creator_replied_at, status)
  on table public.reviews to authenticated;

revoke update (has_passed_gating) on table public.users from authenticated;

revoke all on function public.apply_to_project(uuid) from public, anon, authenticated;
revoke all on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text)
  from public, anon, authenticated;
revoke all on function public.exchange_marketplace_item(text) from public, anon, authenticated;
grant execute on function public.apply_to_project(uuid) to authenticated;
grant execute on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text)
  to authenticated;
grant execute on function public.exchange_marketplace_item(text) to authenticated;

comment on function public.apply_to_project(uuid) is
  'Atomically creates an owner-bound participation and increments the locked project counter.';
comment on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text) is
  'Atomically stores one review, completes participation, grants the server-priced reward, and updates gating progress.';
comment on function public.exchange_marketplace_item(text) is
  'Atomically validates server-side price and stock, deducts the locked wallet, and records the exchange ledger.';
