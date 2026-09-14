import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8');
const authServiceSource = readFileSync(new URL('../src/authService.js', import.meta.url), 'utf8');
const emailTemplate = readFileSync(
  new URL('../supabase/email-templates/confirmation.html', import.meta.url),
  'utf8'
);

test('회원가입 확인 화면은 붙여넣기 가능한 6자리 OTP 입력을 제공한다', () => {
  assert.match(html, /id="auth-confirmation-panel"[^>]*novalidate/);
  assert.match(html, /id="auth-otp-input"/);
  assert.match(html, /inputmode="numeric"/);
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /pattern="\[0-9\]\{6\}"/);
  assert.match(html, /maxlength="6"/);
  assert.match(html, /id="btn-auth-otp-submit"/);
});

test('OTP 검증 성공은 기존 로그인과 같은 공통 계정 라우터로 이어진다', () => {
  assert.match(authSource, /handleSignupOtpVerification/);
  assert.match(authSource, /verifySignupEmailOtp\(/);
  assert.match(authSource, /await routeAfterAuthentication\(/);
  assert.match(authSource, /dondwae:onboarding-required/);
  assert.match(authSource, /replace\(\/\\D\/g, ''\)\.slice\(0, 6\)/);
});

test('Supabase 회원가입 OTP는 email verification type과 활성 세션을 요구한다', () => {
  const otpFunction = authServiceSource.slice(
    authServiceSource.indexOf('export async function verifySignupEmailOtp'),
    authServiceSource.indexOf('export async function requestPasswordReset')
  );

  assert.match(otpFunction, /client\.auth\.verifyOtp\(\{/);
  assert.match(otpFunction, /type: 'email'/);
  assert.match(otpFunction, /return requireAuthenticatedSession\(data\)/);
});

test('회원가입 메일 템플릿은 링크 대신 Supabase 6자리 토큰을 노출한다', () => {
  assert.match(emailTemplate, /\{\{\s*\.Token\s*\}\}/);
  assert.doesNotMatch(emailTemplate, /\.ConfirmationURL/);
  assert.doesNotMatch(emailTemplate, /\.TokenHash/);
});
