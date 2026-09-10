import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizeHttpUrl,
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

test('public project reads include the persisted external survey URL', () => {
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('external_survey_url'), true);
});

test('does not restore an unscoped project cache across login accounts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html.includes("localStorage.getItem('don_dwae_my_created_test')"), false);
  assert.equal(html.includes("localStorage.setItem('don_dwae_my_created_test'"), false);
});
