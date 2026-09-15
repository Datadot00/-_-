import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8');
const emailTemplate = readFileSync(
  new URL('../supabase/email-templates/confirmation.html', import.meta.url),
  'utf8'
);

test('회원가입 확인 화면은 번호 입력 없이 이메일 확인 링크를 안내한다', () => {
  assert.match(html, /id="auth-confirmation-panel"/);
  assert.match(html, /메일의 회원가입 확인 버튼을 눌러 주세요/);
  assert.match(html, /id="btn-auth-resend"/);
  assert.match(html, /id="btn-auth-confirmation-complete"/);
  assert.match(html, />\s*인증 완료했어요\s*</);
  assert.doesNotMatch(html, /id="auth-otp-input"/);
  assert.doesNotMatch(html, /id="btn-auth-otp-submit"/);
});

test('가입 탭의 완료 버튼은 인증된 세션을 확인하고 공통 계정 라우터로 이어진다', () => {
  assert.match(authSource, /async function handleEmailConfirmationComplete\(\)/);
  assert.match(authSource, /pendingSignupCredentials = \{ email, password \}/);
  assert.match(authSource, /resumeEmailConfirmation\(supabase, email, pendingPassword\)/);
  assert.match(authSource, /await continueConfirmedSignup\(user/);

  const markerWriter = authSource.slice(
    authSource.indexOf('function rememberPendingEmailConfirmation'),
    authSource.indexOf('function readPendingEmailConfirmation')
  );
  assert.doesNotMatch(markerWriter, /password/i, '비밀번호를 브라우저 저장소에 기록하면 안 된다');
});

test('확인 링크 탭은 원래 가입 탭을 우선하고 현재 탭 계속하기를 예외로 제공한다', () => {
  assert.match(html, /id="btn-auth-continue-current-tab"/);
  assert.match(authSource, /pendingConfirmation\.sourceTabId !== currentAuthTabId/);
  assert.match(authSource, /showEmailConfirmedHandoffPanel/);
  assert.match(authSource, /가입하던 탭으로 돌아가 주세요/);
  assert.match(authSource, /async function handleContinueCurrentTab\(\)/);
});

test('Supabase 확인 링크 콜백은 공통 계정 라우터로 이어진다', () => {
  assert.match(authSource, /callback\.hasCallback/);
  assert.match(authSource, /hashParameters\.has\('access_token'\)/);
  assert.match(authSource, /url\.searchParams\.has\('code'\)/);
  assert.match(authSource, /await routeAfterAuthentication\(/);
  assert.match(authSource, /dondwae:onboarding-required/);
  assert.doesNotMatch(authSource, /handleSignupOtpVerification/);
  assert.doesNotMatch(authSource, /verifySignupEmailOtp/);
});

test('회원가입은 Supabase 확인 후 돌아올 앱 주소를 전달한다', () => {
  assert.match(authSource, /getAuthRedirectUrl\('signup'\)/);
  assert.match(authSource, /signUpWithEmail\(supabase, email, password, redirectTo\)/);
});

test('회원가입 메일 템플릿은 Supabase 기본 확인 링크를 노출한다', () => {
  assert.match(emailTemplate, /\{\{\s*\.ConfirmationURL\s*\}\}/);
  assert.doesNotMatch(emailTemplate, /\{\{\s*\.Token\s*\}\}/);
  assert.doesNotMatch(emailTemplate, /\.TokenHash/);
});
