import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeHarness } from './support/runtimeHarness.js';
import { readAppSource } from './support/readAppHtml.js';
import { runtimeFiles } from '../src/app/runtime-manifest.js';
import { readFileSync } from 'node:fs';

test('합친 일반 스크립트가 초기화되고 화면 복원과 데이터 조회가 한 번 실행된다', () => {
  const app = createRuntimeHarness({ stored: { dondwae_current_view: 'explore' } });
  const explore = app.addElement('view-explore');
  let syncCount = 0;
  app.context.initSupabaseLiveDB = () => { syncCount++; };
  app.ready();
  assert.equal(syncCount, 1);
  assert.equal(explore.classList.contains('hidden'), false);
  assert.equal(app.events.get('document:click').length, 1);
  assert.equal(app.events.get('document:keydown').length, 1);
  assert.equal(app.events.get('window:keydown').length, 1);
  app.context.navigateTo('post');
  app.context.navigateBack();
  assert.equal(app.evaluate('currentViewKey'), 'explore');
});

test('화면과 동적 HTML의 인라인 버튼 함수가 모두 전역에 연결된다', () => {
  const app = createRuntimeHarness();
  const source = readAppSource();
  const names = new Set();
  for (const match of source.matchAll(/\bon(?:click|change|input|submit|error|load|keydown|keyup|blur|focus)="([^"]*)"/g)) {
    for (const call of match[1].matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (!['if', 'for', 'switch', 'catch'].includes(call[1])) names.add(call[1]);
    }
  }
  assert.ok(names.size >= 90, '정적·동적 버튼 검사 범위가 축소되지 않아야 함');
  // 로그아웃은 기존 인증 ES 모듈이 초기화할 때 연결한다.
  const auth = readFileSync(new URL('../src/features/auth/auth.js', import.meta.url), 'utf8');
  assert.match(auth, /window\.handleUserLogout = handleSignOut;/);
  assert.match(auth, /async function handleSignOut\(/);
  const missing = [...names].filter(name => name !== 'handleUserLogout' && app.evaluate(`typeof ${name}`) !== 'function');
  assert.deepEqual(missing, []);
});

test('전체 스크립트에서도 비로그인 참여는 로그인으로 이동하고 RPC를 호출하지 않는다', async () => {
  const app = createRuntimeHarness();
  let called = 0;
  app.context.donDwaeDataService = {
    supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
    fetchProjectById: async () => { called++; }
  };
  await app.context.openTestParticipateModal('11111111-1111-4111-8111-111111111111');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(called, 0);
  assert.equal(app.evaluate('currentViewKey'), 'login');
  assert.equal(app.trace.filter(item => item[0] === 'alert').length, 1);
});

test('외부 미션은 참여 저장 성공 후 이동하며 실패하면 예약 창을 닫는다', async () => {
  for (const fails of [false, true]) {
    const app = createRuntimeHarness();
    const order = [];
    const projectId = '11111111-1111-4111-8111-111111111111';
    app.context.currentDetailProject = { id: projectId, category: 'product', service_url: 'https://example.com', reward_coin: 10 };
    app.evaluate(`currentParticipatingPostId = '${projectId}'`);
    app.addElement('participate-view-initial');
    const completed = app.addElement('participate-view-external-done');
    app.context.open = () => {
      order.push('reserve');
      return { closed: false, opener: {}, close: () => order.push('close'), location: { replace: () => order.push('navigate') } };
    };
    app.context.console = { ...console, error() {} };
    app.context.donDwaeDataService = {
      supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'tester' } } } }) } },
      checkUserParticipation: async () => null,
      applyParticipation: async () => { order.push('save'); if (fails) throw new Error('save failed'); return { status: 'applied' }; }
    };
    await app.context.confirmParticipationAndProceed();
    assert.deepEqual(order, fails ? ['reserve', 'save', 'close'] : ['reserve', 'save', 'navigate']);
    assert.equal(completed.classList.contains('hidden'), fails);
  }
});

test('초기화는 조립 목록 마지막이며 소스 파일을 중복 실행하지 않는다', () => {
  assert.equal(new Set(runtimeFiles).size, runtimeFiles.length);
  assert.equal(runtimeFiles.at(-1), 'src/app/bootstrap.js');
  assert.equal(runtimeFiles.some(file => file.endsWith('/legacy.js')), false);
});
