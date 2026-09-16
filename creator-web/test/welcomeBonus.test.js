import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260916140000_welcome_bonus_on_gating_pass.sql', import.meta.url),
  'utf8'
);
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('환영 보너스는 원장에 별도 타입으로 남는다', () => {
  // 리뷰 리워드와 같은 타입으로 묶으면 리뷰 보상 합계가 부풀어 보인다.
  assert.match(migration, /'welcome_bonus'/);
  assert.match(migration, /coin_transactions_type_valid[\s\S]*?welcome_bonus/);
  assert.match(migration, /coin_transactions_direction_valid[\s\S]*?welcome_bonus'\]\) and amount > 0/);
});

test('지급액은 500 코인이다', () => {
  assert.match(migration, /v_welcome_bonus constant integer := 500;/);
});

test('게이팅을 처음 통과한 순간에만 지급한다', () => {
  // 갱신 전 값을 읽어두지 않으면 3회 이후 모든 리뷰마다 지급된다.
  assert.match(migration, /select has_passed_gating\s*\n\s*into v_was_passed_gating/);
  assert.match(migration, /if not coalesce\(v_was_passed_gating, false\)\s*\n\s*and v_has_passed_gating/);
});

test('원장을 확인해 중복 지급을 막는다', () => {
  assert.match(
    migration,
    /not exists \(\s*\n\s*select 1\s*\n\s*from public\.coin_transactions\s*\n\s*where user_id = v_user_id and type = 'welcome_bonus'/
  );
});

test('지갑 증가는 원장 기록과 같은 트랜잭션에서 일어난다', () => {
  const block = migration.slice(
    migration.indexOf("if not coalesce(v_was_passed_gating, false)"),
    migration.indexOf('v_bonus_granted := v_welcome_bonus;')
  );
  assert.match(block, /insert into public\.coin_transactions/);
  assert.match(block, /update public\.coin_wallets\s*\n\s*set earned_coins = earned_coins \+ v_welcome_bonus/);
});

test('RPC가 지급 여부를 반환하고 화면이 안내한다', () => {
  assert.match(migration, /'welcome_bonus_amount', v_bonus_granted/);
  assert.match(html, /const welcomeBonus = Number\(result\.welcome_bonus_amount \|\| 0\);/);
  assert.match(html, /if \(welcomeBonus > 0\)/);
  assert.match(html, /환영 이벤트!/);
  // 500코인 지급 인지를 위한 전용 축하 모달 및 알림 함수를 선언한다
  assert.match(html, /id="welcome-bonus-modal"/);
  assert.match(html, /openWelcomeBonusModal\(welcomeBonus\)/);
  assert.match(html, /function openWelcomeBonusModal\(/);
  assert.match(html, /function closeWelcomeBonusModal\(/);
});

test('익명 사용자는 리뷰 제출 RPC를 실행할 수 없다', () => {
  assert.match(migration, /revoke all on function public\.submit_project_review[\s\S]*?from anon;/);
  assert.match(migration, /grant execute on function public\.submit_project_review[\s\S]*?to authenticated;/);
});
