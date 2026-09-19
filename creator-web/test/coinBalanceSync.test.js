import { readAppSource } from './support/readAppHtml.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readAppSource();

test('프로토타입 잔액 1,250이 화면에 남아 있지 않다', () => {
  // 지갑 기본값에서 흘러나온 숫자를 마크업에 다시 적어두면
  // 로그인한 계정과 무관하게 같은 값이 보인다.
  assert.doesNotMatch(html, /1,250/);
  assert.doesNotMatch(html, />\s*1250\s*</);
});

test('내 보유 돼지코인 뱃지는 모두 동기화 대상이다', () => {
  // updateAllCoinDisplays 가 갱신하는 대상은 data-sidebar-coin 속성이거나
  // elIds 목록에 있는 id 다. 둘 중 무엇도 없으면 값이 영원히 고정된다.
  const syncedIds = html
    .slice(html.indexOf('const elIds = ['), html.indexOf('];', html.indexOf('const elIds = [')))
    .match(/'([a-z0-9-]+)'/g)
    .map(s => s.replace(/'/g, ''));

  const badges = html.match(/내 보유 돼지코인[\s\S]{0,400}?<\/div>/g) || [];
  assert.ok(badges.length >= 4, `뱃지를 찾지 못했다 (${badges.length})`);

  badges.forEach((badge, i) => {
    const idMatch = badge.match(/id="([a-z0-9-]+)"/);
    const hasHook = /data-sidebar-coin/.test(badge)
      || (idMatch && syncedIds.includes(idMatch[1]));
    assert.ok(hasHook, `${i + 1}번째 뱃지가 동기화 대상이 아니다`);
  });
});

test('updateAllCoinDisplays가 사이드바와 지갑 표시를 모두 갱신한다', () => {
  const fn = html.slice(
    html.indexOf('function updateAllCoinDisplays()'),
    html.indexOf('function updateAllCoinDisplays()') + 1600
  );
  assert.match(fn, /querySelectorAll\('\[data-sidebar-coin\]'\)/);
  assert.match(fn, /querySelectorAll\('\[data-wallet-balance\]'\)/);
});

test('코인 표시의 초기값은 실제 숫자가 아닌 자리표시자다', () => {
  // 동기화 전에 그럴듯한 숫자가 보이면 사용자가 잘못된 잔액을 믿는다.
  const ids = [
    'user-coin-badge',
    'post-user-coin-badge',
    'market-header-coin',
    'market-user-coin-display',
    'exchange-user-coin',
    'step3-user-coin-balance'
  ];
  ids.forEach(id => {
    const m = html.match(new RegExp(`id="${id}"[^>]*>([^<]*)<`));
    assert.ok(m, `${id} 표시를 찾지 못했다`);
    assert.doesNotMatch(m[1], /\d/, `${id} 초기값에 숫자가 남아 있다: ${m[1].trim()}`);
  });
});

test('잔액은 지갑 조회 결과로만 설정된다', () => {
  assert.match(html, /window\.setUserCoinBalance = function \(amount\)/);
  assert.match(html, /updateAllCoinDisplays\(\);\s*\n\s*\};/);
});
