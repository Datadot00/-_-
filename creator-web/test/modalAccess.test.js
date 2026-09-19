import { readAppSource } from './support/readAppHtml.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

const html = readAppSource();
const functionNames = [
  'openTestParticipateModal', 'closeTestParticipateModal', 'proceedTestParticipateModal',
  'openPledgeModal', 'closePledgeModal', 'proceedPledgeModal',
  'getCompletedTestCount', 'isDatabaseProjectId', 'escapeHtml'
];
// 원본 선언 순서를 유지해야 중복 함수가 있을 때도 실제 브라우저와 같은 함수가 실행된다.
const declarations = [...html.matchAll(new RegExp(
  `^    (?:async )?function (${functionNames.join('|')})\\([^\\n]*\\) \\{[\\s\\S]*?^    \\}`,
  'gm'
))];
for (const name of functionNames) {
  assert.ok(declarations.some(match => match[1] === name), `${name} 선언을 찾을 수 없음`);
}
const pledgeEntry = html.match(/^    window\.openPledgeModalLocal = function \(\) \{[\s\S]*?^    \};/m);
assert.ok(pledgeEntry, '서약 모달 진입점을 찾을 수 없음');
const source = [...declarations.map(match => match[0]), pledgeEntry[0]].join('\n');
const projectId = '11111111-1111-4111-8111-111111111111';

test('참여·서약 모달 함수가 중복 선언되지 않는다', () => {
  for (const name of ['openTestParticipateModal', 'closePledgeModal']) {
    assert.equal(declarations.filter(match => match[1] === name).length, 1, name);
  }
});

function setup({ backend = true, signedIn = false, cachedLogin = false, completed = 0 } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set(['hidden']);
      elements.set(id, {
        classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
        style: {}, textContent: '', innerHTML: ''
      });
    }
    return elements.get(id);
  };
  const alerts = [];
  const routes = [];
  const fetched = [];
  const context = {
    document: { getElementById: element },
    alert: message => alerts.push(message),
    navigateTo: route => routes.push(route),
    isUserLoggedIn: cachedLogin,
    currentPostId: 'moneylog', currentParticipatingPostId: null,
    userParticipatedTests: {}, isGatingBypassActive: false,
    userHasPassedGating: false, completedTestCountFromDB: completed
  };
  context.window = context;
  if (backend) {
    context.donDwaeDataService = {
      supabase: { auth: { getSession: async () => ({ data: { session: signedIn ? { user: { id: 'tester' } } : null } }) } },
      fetchProjectById: async id => {
        fetched.push(id);
        return { service_name: '회귀 테스트 프로젝트', category: 'survey', reward_coin: 100, test_guide: ['<첫 미션>'] };
      }
    };
  }
  runInNewContext(source, context);
  const hidden = id => element(id).classList.contains('hidden');
  // 현재 진입 함수는 getSession().then()을 반환하지 않으므로 내부 콜백까지 기다린다.
  const open = async name => {
    await context[name](projectId);
    await new Promise(resolve => setImmediate(resolve));
  };
  return { context, element, hidden, alerts, routes, fetched, open };
}

for (const [label, openName, closeName, modalId] of [
  ['참여', 'openTestParticipateModal', 'closeTestParticipateModal', 'test-participate-modal'],
  ['서약', 'openPledgeModal', 'closePledgeModal', 'pledge-modal']
]) {
  test(`${label}: 세션이 없으면 로그인 표시가 남아 있어도 차단한다`, async () => {
    const app = setup({ cachedLogin: true });
    await app.open(openName);
    assert.equal(app.hidden(modalId), true);
    assert.deepEqual(app.routes, ['login']);
    assert.equal(app.alerts.length, 1);
    assert.match(app.alerts[0], /로그인/);
    assert.deepEqual(app.fetched, []);
  });

  test(`${label}: 유효한 세션으로 열고 닫은 뒤 다시 열 수 있다`, async () => {
    const app = setup({ signedIn: true });
    await app.open(openName);
    assert.equal(app.hidden(modalId), false);
    app.context[closeName]();
    assert.equal(app.hidden(modalId), true);
    await app.open(openName);
    assert.equal(app.hidden(modalId), false);
    assert.deepEqual(app.alerts, []);
    assert.deepEqual(app.routes, []);
  });

  test(`${label}: SDK가 없는 경우에도 로그인 상태에 따라 진입한다`, async () => {
    const anonymous = setup({ backend: false });
    await anonymous.open(openName);
    assert.equal(anonymous.hidden(modalId), true);
    assert.deepEqual(anonymous.routes, ['login']);
    const member = setup({ backend: false, cachedLogin: true });
    await member.open(openName);
    assert.equal(member.hidden(modalId), false);
    assert.deepEqual(member.alerts, []);
  });
}

test('참여: 프로젝트 정보를 표시하고 다시 열면 초기 단계로 복원한다', async () => {
  const app = setup({ signedIn: true });
  await app.open('openTestParticipateModal');
  assert.deepEqual(app.fetched, [projectId]);
  assert.equal(app.context.currentParticipatingPostId, projectId);
  assert.equal(app.element('part-modal-title').textContent, '회귀 테스트 프로젝트');
  assert.match(app.element('part-modal-reward').textContent, /100/);
  assert.match(app.element('part-modal-checklist').innerHTML, /&lt;첫 미션&gt;/);
  app.element('participate-view-initial').classList.add('hidden');
  app.element('participate-view-external-done').classList.remove('hidden');
  app.context.closeTestParticipateModal();
  await app.open('openTestParticipateModal');
  assert.equal(app.hidden('participate-view-initial'), false);
  assert.equal(app.hidden('participate-view-external-done'), true);
});

test('참여: 등록된 대상 태그를 모달에 표시한다', {
  todo: '중복 제거 전부터 유효한 함수에 대상 태그 렌더링이 없었음. 기능 수정 단계에서 복구할 것.'
}, async () => {
  const app = setup({ signedIn: true });
  app.context.donDwaeDataService.fetchProjectById = async () => ({
    service_name: '대상 태그 테스트', target_persona_tags: ['1인 창업자'], tech_tags: ['웹']
  });
  await app.open('openTestParticipateModal');
  assert.equal(app.hidden('part-modal-target-box'), false, '대상 태그가 있으면 안내 영역을 표시해야 함');
  assert.match(app.element('part-modal-target-text').innerHTML, /1인 창업자/);
});

test('서약: 참여 횟수가 바뀌면 재진입 시 등록 자격 안내도 바뀐다', async () => {
  const app = setup({ signedIn: true, completed: 2 });
  await app.open('openPledgeModal');
  assert.equal(app.hidden('pledge-view-blocked'), false);
  assert.equal(app.hidden('pledge-view-allowed'), true);
  assert.equal(app.element('pledge-test-count-badge').textContent, '2 / 3 회');
  app.context.closePledgeModal();
  app.context.completedTestCountFromDB = 3;
  await app.open('openPledgeModal');
  assert.equal(app.hidden('pledge-view-blocked'), true);
  assert.equal(app.hidden('pledge-view-allowed'), false);
  assert.equal(app.element('pledge-user-completed-count').textContent, '3');
});
