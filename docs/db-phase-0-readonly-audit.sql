-- 돈돼 DB 0단계 읽기 전용 감사
-- 행 원문이나 개인정보를 반환하지 않고 구조와 집계만 확인한다.
-- Supabase SQL Editor의 관리자 세션 또는 동등한 읽기 전용 관리자 세션에서 실행한다.

-- 1. 공개 스키마 테이블과 RLS 상태
select
  schemaname,
  tablename,
  rowsecurity
from pg_catalog.pg_tables
where schemaname = 'public'
order by tablename;

-- 2. 컬럼 계약
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 3. RLS 정책
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. anon/authenticated 테이블 권한
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 5. anon/authenticated 컬럼 권한
select
  grantee,
  table_name,
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

-- 6. 인덱스
select
  tablename,
  indexname,
  indexdef
from pg_catalog.pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 7. 공개 스키마 함수의 보안 속성
select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- 8. 트리거
select
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation,
  action_timing
from information_schema.triggers
where event_object_schema in ('auth', 'public')
order by event_object_schema, event_object_table, trigger_name;

-- 9. Auth 사용자, 서비스 프로필, 지갑의 개수와 누락
select
  (select count(*) from auth.users) as auth_user_count,
  (select count(*) from public.users) as profile_count,
  (select count(*) from public.coin_wallets) as wallet_count,
  (
    select count(*)
    from auth.users au
    left join public.users u on u.id = au.id
    where u.id is null
  ) as auth_users_missing_profile,
  (
    select count(*)
    from public.users u
    left join public.coin_wallets w on w.user_id = u.id
    where w.user_id is null
  ) as profiles_missing_wallet;

-- 10. 서비스 테이블 행 수
select
  (select count(*) from public.projects) as projects,
  (select count(*) from public.participations) as participations,
  (select count(*) from public.reviews) as reviews,
  (select count(*) from public.coin_transactions) as coin_transactions,
  (select count(*) from public.marketplace_items) as marketplace_items,
  (select count(*) from public.marketplace_exchanges) as marketplace_exchanges,
  (select count(*) from public.scraps) as scraps,
  (select count(*) from public.notifications) as notifications;

-- 11. 프로젝트 URL과 민감 테스트 계정 필드 현황(값은 반환하지 않음)
select
  count(*) as project_count,
  count(*) filter (
    where service_url is null or btrim(service_url) = ''
  ) as missing_service_url,
  count(*) filter (
    where service_url is not null
      and btrim(service_url) <> ''
      and service_url !~* '^https?://'
  ) as non_http_service_url,
  count(*) filter (
    where nullif(btrim(test_account_id), '') is not null
  ) as projects_with_test_account_id,
  count(*) filter (
    where nullif(btrim(test_account_pw), '') is not null
  ) as projects_with_test_account_password
from public.projects;

-- 12. 참여자 수 캐시와 실제 참여 행의 불일치
select count(*) as projects_with_participation_count_mismatch
from (
  select
    p.id,
    p.current_count,
    count(pt.id) as actual_count
  from public.projects p
  left join public.participations pt on pt.project_id = p.id
  group by p.id, p.current_count
  having p.current_count <> count(pt.id)
) mismatches;

-- 13. 사용자·프로젝트별 중복 리뷰
select count(*) as duplicate_project_user_review_groups
from (
  select project_id, user_id
  from public.reviews
  group by project_id, user_id
  having count(*) > 1
) duplicates;

-- 14. 참여와 연결되지 않은 리뷰
select count(*) as reviews_without_participation
from public.reviews r
left join public.participations p on p.id = r.participation_id
where r.participation_id is null or p.id is null;

-- 15. 지갑 캐시와 코인 거래 원장 합계의 불일치
select count(*) as wallets_not_matching_ledger
from public.coin_wallets w
left join (
  select
    user_id,
    coalesce(sum(amount) filter (where coin_type = 'earned'), 0) as earned_total,
    coalesce(sum(amount) filter (where coin_type = 'paid'), 0) as paid_total
  from public.coin_transactions
  group by user_id
) ledger on ledger.user_id = w.user_id
where w.earned_coins <> coalesce(ledger.earned_total, 0)
   or w.paid_coins <> coalesce(ledger.paid_total, 0);

-- 16. 테이블 크기와 스캔 통계. 인덱스 추가 전 기준값으로 사용한다.
select
  relname as table_name,
  n_live_tup as estimated_rows,
  seq_scan,
  idx_scan,
  pg_catalog.pg_size_pretty(
    pg_catalog.pg_total_relation_size(relid)
  ) as total_size
from pg_catalog.pg_stat_user_tables
where schemaname = 'public'
order by pg_catalog.pg_total_relation_size(relid) desc;

