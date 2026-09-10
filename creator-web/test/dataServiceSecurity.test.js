import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROJECT_PUBLIC_COLUMNS,
  REVIEW_VISIBLE_COLUMNS,
  USER_PUBLIC_COLUMNS,
  sanitizeUserProfileUpdates
} from '../src/dataService.js';

test('공개 사용자 조회 컬럼에서 개인정보를 제외한다', () => {
  const columns = new Set(USER_PUBLIC_COLUMNS.split(','));

  assert.equal(columns.has('nickname'), true);
  assert.equal(columns.has('avatar_url'), true);
  assert.equal(columns.has('email'), false);
  assert.equal(columns.has('phone'), false);
  assert.equal(columns.has('sns_links'), false);
});

test('공개 프로젝트 조회 컬럼에서 테스트 계정을 제외한다', () => {
  const columns = new Set(PROJECT_PUBLIC_COLUMNS.split(','));

  assert.equal(columns.has('title'), true);
  assert.equal(columns.has('service_url'), true);
  assert.equal(columns.has('test_account_id'), false);
  assert.equal(columns.has('test_account_pw'), false);
});

test('공개 리뷰 조회 컬럼에서 비공개 증빙과 퀴즈 응답을 제외한다', () => {
  const columns = new Set(REVIEW_VISIBLE_COLUMNS.split(','));

  assert.equal(columns.has('answers'), true);
  assert.equal(columns.has('screenshot_url'), false);
  assert.equal(columns.has('quiz_answers'), false);
  assert.equal(columns.has('participation_id'), false);
});

test('프로필 업데이트에서 허용되지 않은 시스템 및 개인정보 컬럼을 제거한다', () => {
  const result = sanitizeUserProfileUpdates({
    nickname: '새 닉네임',
    bio: '소개',
    email: 'attacker@example.com',
    phone: '010-0000-0000',
    level: 999,
    rank_badge: '관리자',
    completed_test_count: 999,
    has_passed_gating: true
  });

  assert.deepEqual(result, {
    nickname: '새 닉네임',
    bio: '소개'
  });
});
