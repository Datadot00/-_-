import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('로그인 중 스피너와 접근성 상태를 표시한다', () => {
  assert.match(html, /id="btn-auth-submit"[\s\S]*?aria-busy="false"/);
  assert.match(html, /id="btn-auth-submit-spinner"/);
  assert.match(html, /id="auth-loading-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(authSource, /submitButtonSpinner\?\.classList\.toggle\('hidden', !showLoginProgress\)/);
  assert.match(authSource, /loadingStatus\?\.classList\.toggle\('hidden', !showLoginProgress\)/);
});

test('로그인 성공은 비필수 데이터 전체 로딩을 기다리지 않고 화면을 전환한다', () => {
  const loginFlow = authSource.slice(
    authSource.indexOf('async function handleEmailLogin()'),
    authSource.indexOf('function showEmailSentPanel')
  );

  assert.doesNotMatch(loginFlow, /await refreshAuthenticatedData\(\)/);
  assert.match(
    loginFlow,
    /await routeAfterAuthentication\([\s\S]*?navigateTo\('explore'\);[\s\S]*?refreshAuthenticatedDataInBackground\(\)/
  );
});

test('초기 데이터는 단일 진입점에서 병렬로 조회한다', () => {
  assert.doesNotMatch(mainSource, /addEventListener\('DOMContentLoaded'/);
  assert.match(
    html,
    /Promise\.all\(\[[\s\S]*?fetchUserProfile\(userId\)[\s\S]*?fetchUserNotifications\(userId\)[\s\S]*?\]\)/
  );
  assert.match(html, /Promise\.all\(\[\s*liveProjectsPromise,\s*marketItemsPromise\s*\]\)/);
});
