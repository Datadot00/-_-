import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntimeHarness } from './support/runtimeHarness.js';
import { readAppSource } from './support/readAppHtml.js';

const projectId = '11111111-1111-4111-8111-111111111111';

test('내부 미션 초안은 새 실행에서도 복원되고 다른 계정에는 노출되지 않는다', () => {
  const stored = {};
  const first = createRuntimeHarness({ stored });
  first.context.currentAuthUserId = 'tester-a';
  const draft = { selected_option: 'B', vote_reason: '입력한 이유', question_answers: { 질문: ['답변1', '답변2'] } };
  assert.equal(first.context.saveInternalMissionDraft(projectId, draft), true);
  const restored = createRuntimeHarness({ stored });
  restored.context.currentAuthUserId = 'tester-a';
  assert.deepEqual(JSON.parse(JSON.stringify(restored.context.readInternalMissionDraft(projectId))), draft);
  restored.context.currentAuthUserId = 'tester-b';
  assert.equal(restored.context.readInternalMissionDraft(projectId), null);
  restored.context.currentAuthUserId = 'tester-a';
  restored.context.clearInternalMissionDraft(projectId);
  assert.equal(restored.context.readInternalMissionDraft(projectId), null);
});

for (const flow of ['review', 'exchange']) {
  test(`${flow}: 화면 왕복 후 한 번 실행하면 저장도 한 번이며 처리 중 버튼을 잠근다`, async () => {
    const app = createRuntimeHarness();
    app.ready();
    for (let i = 0; i < 3; i++) {
      app.context.navigateTo('explore');
      app.context.navigateTo('post');
      app.context.navigateBack();
    }
    assert.equal(app.events.get('document:click').length, 1);
    let finish;
    let calls = 0;
    const pending = new Promise(resolve => { finish = resolve; });
    const persist = () => { calls++; return pending; };
    const button = app.addElement(flow === 'review' ? 'btn-submit-feedback' : 'btn-exchange-action');
    const notices = [];
    app.context.showGenericToast = message => notices.push(message);
    app.context.console = { ...console, error: (...args) => assert.fail(args.join(' ')) };
    app.context.donDwaeDataService = {
      supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
      submitProjectReview: persist,
      exchangeMarketplaceItem: persist
    };
    const updates = [];
    app.context.setUserCoinBalance = amount => updates.push(amount);
    let execute;
    if (flow === 'review') {
      app.evaluate(`currentParticipatingPostId = '${projectId}'; currentPostId = '${projectId}';`);
      app.context.myProjectCollections = { registered: [], participated: [{ id: projectId }] };
      for (const name of ['refreshFeedPersonalState', 'updatePendingReviewBadge', 'setDetailParticipationCta',
        'updatePledgeModalUI', 'renderSubmittedFeedback', 'closeFeedbackWriteModal', 'closeTestParticipateModal']) {
        app.context[name] = () => {};
      }
      execute = app.context.submitFeedbackForm();
    } else {
      app.evaluate("selectedMarketProduct = { id: 'item', name: '검증 상품', price: 1200 }; userCoinBalance = 1500;");
      app.context.selectMarketProduct = () => {};
      execute = app.context.executeExchange();
    }
    assert.equal(button.disabled, true);
    assert.equal(calls, 1);
    finish({ wallet_total: flow === 'review' ? 570 : 300, reward_amount: 70,
      completed_test_count: 4, has_passed_gating: true, review_id: 'review', item_name: '검증 상품' });
    await execute;
    assert.equal(calls, 1);
    assert.deepEqual(updates, [flow === 'review' ? 570 : 300]);
    assert.equal(notices.length, 1);
    assert.equal(button.disabled, false);
    if (flow === 'review') {
      assert.equal(app.context.myProjectCollections.participated[0].participation_status, 'submitted');
      assert.equal(app.context.inMemoryReviews[projectId].length, 1);
    }
  });
}

test('저장 버튼은 각각 하나이며 인라인 제출 경로가 한 번만 연결된다', () => {
  const source = readAppSource();
  for (const [id, handler] of [
    ['btn-submit-feedback', 'submitFeedbackForm'],
    ['btn-exchange-action', 'executeExchange'],
    ['btn-confirm-participation', 'confirmParticipationAndProceed']
  ]) {
    const tags = [...source.matchAll(new RegExp(`<button\\b[^>]*id="${id}"[^>]*>`, 'g'))];
    assert.equal(tags.length, 1, id);
    assert.match(tags[0][0], new RegExp(`onclick="${handler}\\(\\)"`));
  }
});
