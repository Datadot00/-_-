-- 테스트 3회 게이팅 완료 초반 가입 보너스: 500 코인 지급
--
-- 게이팅을 처음 통과하는 순간 한 번만 지급한다. 지급은 원장
-- (coin_transactions) 에 남기고 지갑은 원장에 맞춰 올린다. 잔액만 올리면
-- 나중에 정산할 때 근거가 없다.
--
-- 리뷰 리워드와 구분되도록 'welcome_bonus' 타입을 새로 허용한다. 같은
-- 'reward_earned' 로 묶으면 리뷰 보상 합계가 부풀어 보인다.

alter table public.coin_transactions
  drop constraint if exists coin_transactions_type_valid;

alter table public.coin_transactions
  add constraint coin_transactions_type_valid
  check (type = any (array[
    'reward_earned',
    'project_funding',
    'shop_purchase',
    'refund',
    'welcome_bonus'
  ]));

alter table public.coin_transactions
  drop constraint if exists coin_transactions_direction_valid;

alter table public.coin_transactions
  add constraint coin_transactions_direction_valid
  check (
    (type = any (array['reward_earned', 'refund', 'welcome_bonus']) and amount > 0)
    or (type = any (array['project_funding', 'shop_purchase']) and amount < 0)
  );

create or replace function public.submit_project_review(
  p_project_id uuid,
  p_rating numeric,
  p_reuse_intention boolean default true,
  p_answers jsonb default '{}'::jsonb,
  p_quiz_answers jsonb default '{}'::jsonb,
  p_is_quiz_passed boolean default true,
  p_screenshot_url text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_welcome_bonus constant integer := 500;
  v_user_id uuid := auth.uid();
  v_participation_id uuid;
  v_participation_status text;
  v_reward integer;
  v_project_title text;
  v_review_id uuid;
  v_completed_count integer;
  v_has_passed_gating boolean;
  v_was_passed_gating boolean;
  v_earned_coins integer;
  v_paid_coins integer;
  v_bonus_granted integer := 0;
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

  -- 통과 여부를 갱신 전에 읽어둔다. 이번 리뷰로 처음 넘어섰는지 판단하는
  -- 기준이 된다. has_passed_gating 은 한 번 켜지면 꺼지지 않는다.
  select has_passed_gating
  into v_was_passed_gating
  from public.users
  where id = v_user_id
  for update;

  update public.users
  set
    completed_test_count = completed_test_count + 1,
    has_passed_gating = has_passed_gating or (completed_test_count + 1 >= 3),
    updated_at = now()
  where id = v_user_id
  returning completed_test_count, has_passed_gating
  into v_completed_count, v_has_passed_gating;

  -- 환영 이벤트는 한 사람당 한 번이다. 통과 시점 판정에 더해 원장도 확인해
  -- has_passed_gating 이 수동으로 초기화돼도 중복 지급되지 않게 한다.
  if not coalesce(v_was_passed_gating, false)
    and v_has_passed_gating
    and not exists (
      select 1
      from public.coin_transactions
      where user_id = v_user_id and type = 'welcome_bonus'
    )
  then
    insert into public.coin_transactions (
      user_id, amount, coin_type, type, description, reference_type, reference_id
    ) values (
      v_user_id,
      v_welcome_bonus,
      'earned',
      'welcome_bonus',
      '[가입 보너스] 테스트 3회 게이팅 완료 보너스',
      'review',
      v_review_id
    );

    update public.coin_wallets
    set earned_coins = earned_coins + v_welcome_bonus, updated_at = now()
    where user_id = v_user_id
    returning earned_coins, paid_coins into v_earned_coins, v_paid_coins;

    v_bonus_granted := v_welcome_bonus;
  end if;

  return jsonb_build_object(
    'review_id', v_review_id,
    'participation_id', v_participation_id,
    'project_id', p_project_id,
    'reward_amount', v_reward,
    'welcome_bonus_amount', v_bonus_granted,
    'wallet_earned_coins', v_earned_coins,
    'wallet_paid_coins', v_paid_coins,
    'wallet_total', v_earned_coins + v_paid_coins,
    'completed_test_count', v_completed_count,
    'has_passed_gating', v_has_passed_gating
  );
end;
$function$;

revoke all on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text) from anon;
grant execute on function public.submit_project_review(uuid, numeric, boolean, jsonb, jsonb, boolean, text) to authenticated;
