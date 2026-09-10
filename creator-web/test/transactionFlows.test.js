import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  COIN_TRANSACTION_COLUMNS,
  MARKETPLACE_ITEM_COLUMNS,
  prepareReviewRpcPayload,
  sanitizeUserProfileUpdates
} from '../src/dataService.js';

test('리뷰 RPC payload는 사용자와 리워드 값을 받지 않고 서버 입력만 구성한다', () => {
  const payload = prepareReviewRpcPayload({
    projectId: '11111111-1111-1111-1111-111111111111',
    rating: 4,
    reuseIntention: false,
    answers: { review_text: '좋았습니다.' },
    quizAnswers: { quiz_1: 'A' },
    rewardAmount: 999999,
    userId: '22222222-2222-2222-2222-222222222222'
  });

  assert.deepEqual(payload, {
    p_project_id: '11111111-1111-1111-1111-111111111111',
    p_rating: 4,
    p_reuse_intention: false,
    p_answers: { review_text: '좋았습니다.' },
    p_quiz_answers: { quiz_1: 'A' },
    p_is_quiz_passed: true,
    p_screenshot_url: null
  });
  assert.equal('rewardAmount' in payload, false);
  assert.equal('userId' in payload, false);
});

test('리뷰 payload는 잘못된 프로젝트와 별점을 거부한다', () => {
  assert.throws(() => prepareReviewRpcPayload({ projectId: 'not-uuid', rating: 5 }), /프로젝트 ID/);
  assert.throws(
    () => prepareReviewRpcPayload({ projectId: '11111111-1111-1111-1111-111111111111', rating: 6 }),
    /별점/
  );
});

test('클라이언트 프로필 수정으로 등록 자격을 조작할 수 없다', () => {
  assert.deepEqual(sanitizeUserProfileUpdates({ nickname: '테스터', has_passed_gating: true }), { nickname: '테스터' });
});

test('코인 원장은 원인 참조를 포함하고 상점 컬럼은 서버 가격을 사용한다', () => {
  assert.equal(COIN_TRANSACTION_COLUMNS.includes('reference_type'), true);
  assert.equal(COIN_TRANSACTION_COLUMNS.includes('reference_id'), true);
  assert.equal(MARKETPLACE_ITEM_COLUMNS.includes('price_coins'), true);
  assert.equal(MARKETPLACE_ITEM_COLUMNS.split(',').includes('price_coin'), false);
});

test('데이터 서비스 쓰기는 트랜잭션 RPC만 호출한다', () => {
  const source = readFileSync(new URL('../src/dataService.js', import.meta.url), 'utf8');
  assert.match(source, /rpc\('apply_to_project'/);
  assert.match(source, /rpc\('submit_project_review'/);
  assert.match(source, /rpc\('exchange_marketplace_item'/);
  assert.doesNotMatch(source, /from\('coin_transactions'\)\s*\.insert/);
  assert.doesNotMatch(source, /from\('marketplace_exchanges'\)\s*\.insert/);
});

test('5단계 마이그레이션은 직접 쓰기를 차단하고 원자적 함수를 선언한다', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20260910122642_stage_5_transactional_participation_review_shop.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /create or replace function public\.apply_to_project/i);
  assert.match(sql, /create or replace function public\.submit_project_review/i);
  assert.match(sql, /create or replace function public\.exchange_marketplace_item/i);
  assert.match(sql, /revoke all privileges on table public\.participations from authenticated/i);
  assert.match(sql, /revoke update \(has_passed_gating\)/i);
  assert.match(sql, /for update/i);
});
