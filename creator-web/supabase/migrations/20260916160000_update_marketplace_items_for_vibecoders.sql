-- 돼코상점 아이템 개편: 기프티콘(스타벅스, CU 등) 제외 및 바이브코더 초보자를 위한 정보성 디지털 자산으로 전환
--
-- 1. 프롬프트 템플릿 (입문용 AI 프롬프트 패키지, PRD 자동완성 프롬프트)
-- 2. 노션 템플릿 (1인 창업 & MVP 프로젝트 관리, 초기 서비스 검증 & 유저 인터뷰)
-- 3. 툴 비교/세팅 가이드 (v0 vs Cursor vs Windsurf 완벽 비교 & 초보자 세팅 가이드)
-- 4. 부업 리서치 자료 (바이브코더 부업 리서치 자료집 - 이모티콘·펀딩·프리랜서)

INSERT INTO public.marketplace_items (id, name, category, price_coins, stock_count, icon, is_active)
VALUES
  ('p1', '바이브코더 입문용 AI 프롬프트 템플릿 패키지', '프롬프트 템플릿', 1500, 999, '⚡', true),
  ('p2', '1인 창업 & MVP 프로젝트 관리 노션 템플릿', '노션 템플릿', 1200, 999, '📑', true),
  ('p3', 'v0 vs Cursor vs Windsurf 완벽 비교 & 초보자 세팅 가이드', '툴 비교/세팅 가이드', 1800, 999, '🛠️', true),
  ('p4', '바이브코더 부업 리서치 자료집 (이모티콘·펀딩·프리랜서)', '부업 리서치 자료', 2000, 999, '📈', true),
  ('p5', 'UI/UX 기획서 및 PRD 자동완성 프롬프트', '프롬프트 템플릿', 1600, 999, '⚡', true),
  ('p6', '초기 서비스 검증 & 유저 인터뷰 노션 템플릿', '노션 템플릿', 1400, 999, '📑', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  price_coins = EXCLUDED.price_coins,
  stock_count = EXCLUDED.stock_count,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;
