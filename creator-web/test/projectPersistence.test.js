import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizeHttpUrl,
  prepareProjectLoginConfiguration,
  prepareProjectPayload,
  PROJECT_PUBLIC_COLUMNS
} from '../src/dataService.js';

test('normalizes a schemeless service URL to HTTPS', () => {
  assert.equal(normalizeHttpUrl('  example.com/path  '), 'https://example.com/path');
});

test('keeps HTTPS URLs and converts empty optional URLs to null', () => {
  assert.equal(normalizeHttpUrl('https://example.com/test?q=1'), 'https://example.com/test?q=1');
  assert.equal(normalizeHttpUrl('   '), null);
});

test('rejects unsafe URL schemes and embedded credentials', () => {
  assert.throws(() => normalizeHttpUrl('javascript:alert(1)'), /http:\/\/ 또는 https:\/\//);
  assert.throws(() => normalizeHttpUrl('https://user:password@example.com'), /올바른 URL/);
});

test('requires a URL when requested', () => {
  assert.throws(() => normalizeHttpUrl('', { required: true }), /서비스 URL/);
});

test('prepares a safe project insert payload and normalizes every URL field', () => {
  const payload = prepareProjectPayload({
    creator_id: 'creator-id',
    title: '  테스트 프로젝트  ',
    service_name: '  테스트 서비스  ',
    service_desc: '  설명  ',
    service_url: 'example.com',
    ab_url_a: '',
    app_playstore_url: 'https://play.google.com/store/apps/details?id=test',
    current_count: 999,
    created_at: '2000-01-01'
  });

  assert.equal(payload.title, '테스트 프로젝트');
  assert.equal(payload.service_name, '테스트 서비스');
  assert.equal(payload.service_url, 'https://example.com/');
  assert.equal(payload.ab_url_a, null);
  assert.equal(payload.current_count, undefined);
  assert.equal(payload.created_at, undefined);
});

test('project edits cannot change ownership, counters, or the immutable service URL', () => {
  const payload = prepareProjectPayload({
    title: '수정된 제목',
    creator_id: 'other-user',
    current_count: 200,
    service_url: 'https://changed.example.com'
  }, { forUpdate: true });

  assert.deepEqual(payload, { title: '수정된 제목' });
});

test('로그인 불필요 설정은 관련 필드를 항상 null로 정규화한다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: false,
    testAccountId: 'leftover-user',
    testAccountPassword: 'leftover-password',
    privacyItems: '이메일'
  }), {
    login_required: false,
    test_account_id: null,
    test_account_pw: null,
    privacy_items: null
  });
});

test('신규 로그인 필수 프로젝트는 계정 ID, 비밀번호, 개인정보 항목을 모두 요구한다', () => {
  assert.throws(() => prepareProjectLoginConfiguration({
    loginRequired: true,
    privacyItems: '이메일'
  }), /계정 ID와 비밀번호를 모두 입력/);
});

test('기존 로그인 필수 프로젝트 수정은 빈 계정 필드를 생략해 저장값을 보존한다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: true,
    privacyItems: '이메일',
    preserveExistingCredentials: true
  }), {
    login_required: true,
    privacy_items: '이메일'
  });
});

test('기존 계정을 변경할 때 ID와 비밀번호 중 하나만 입력할 수 없다', () => {
  assert.throws(() => prepareProjectLoginConfiguration({
    loginRequired: true,
    testAccountId: 'new-user',
    privacyItems: '이메일',
    preserveExistingCredentials: true
  }), /ID와 비밀번호를 모두 입력/);
});

test('public project reads include the persisted external survey URL', () => {
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('external_survey_url'), true);
});

test('does not restore an unscoped project cache across login accounts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html.includes("localStorage.getItem('don_dwae_my_created_test')"), false);
  assert.equal(html.includes("localStorage.setItem('don_dwae_my_created_test'"), false);
});

test('프로젝트 수정 ID를 세션에 유지하고 ID 기준으로 update 경로를 선택한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /PROJECT_EDIT_SESSION_KEY = 'dondwae_editing_project_id'/);
  assert.match(html, /const editingProjectId = getActiveProjectEditId\(\)/);
  assert.match(html, /const wasEditing = Boolean\(editingProjectId\)/);
  assert.match(html, /navigateTo\('create', \{ preserveProjectEdit: true \}\)/);
  assert.match(html, /updateProjectRecord\(editingProjectId, dbPayload\)/);
});

test('does not persist the current page URL when no thumbnail was selected', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html.includes("thumbImg.src = '';"), false);
  assert.equal(html.includes("previewImg.src = '';"), false);
  assert.match(html, /thumbnailPreview\.getAttribute\('src'\)/);
  assert.match(html, /onerror="handleBrokenProjectThumbnail\(this\)"/);
});

test('vote projects use the visible image or URL input mode without a removed subtype variable', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /currentVoteSubOption/);
  assert.match(html, /testCategoryName = inputMode === 'image' \? '투표 \(이미지형\)' : '투표 \(URL형\)'/);
  assert.match(html, /is_ab_test: \['product', 'prototype'\]\.includes\(currentMainCategory\) && isProductAbMode/);
});

test('creator report opens with the current project instead of the static feedback sample', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const creatorActions = html.match(/<div id="creator-only-actions"[\s\S]*?<\/div>\s*<hr/)?.[0] || '';

  assert.match(creatorActions, /onclick="openFeedbackReport\(currentPostId\)"/);
  assert.doesNotMatch(creatorActions, /onclick="navigateTo\('feedback'\)"/);
  assert.match(html, /id="feedback-average-rating"/);
  assert.match(html, /answers\.review_text/);
  assert.match(html, /if \(!project\) throw new Error\('프로젝트를 찾을 수 없습니다\.'\)/);
});
