import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ONBOARDING_LIMITS,
  prepareOnboardingPayload
} from '../src/onboardingService.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const gateSource = readFileSync(new URL('../src/onboardingGate.js', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8');

test('온보딩 입력은 RPC 계약과 같은 규칙으로 정규화된다', () => {
  const payload = prepareOnboardingPayload({
    nickname: '  돈돼테스터  ',
    bio: '  안녕하세요  ',
    interests: [' 핀테크/금융 ', 'AI/개발도구'],
    snsLinks: ['  https://example.com  ', '', '   ']
  });

  assert.equal(payload.p_nickname, '돈돼테스터');
  assert.equal(payload.p_bio, '안녕하세요');
  assert.deepEqual(payload.p_interests, ['핀테크/금융', 'AI/개발도구']);
  // 빈 링크 칸은 등록하지 않은 것으로 보고 버린다.
  assert.deepEqual(payload.p_sns_links, ['https://example.com']);
  assert.equal('p_accepted_document_ids' in payload, false);
});

test('닉네임과 관심분야는 필수이며 한도를 넘길 수 없다', () => {
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '   ', interests: ['핀테크/금융'] }),
    /닉네임은 1자 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: 'ㄱ'.repeat(ONBOARDING_LIMITS.nicknameMax + 1),
      interests: ['핀테크/금융']
    }),
    /닉네임은 1자 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', interests: [] }),
    /관심분야는 1개 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      interests: ['a', 'b', 'c', 'd', 'e', 'f']
    }),
    /관심분야는 1개 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', interests: ['핀테크', '핀테크'] }),
    /중복/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      bio: 'ㄱ'.repeat(ONBOARDING_LIMITS.bioMax + 1),
      interests: ['핀테크/금융']
    }),
    /한 줄 소개는/
  );
});

test('SNS 링크는 HTTP(S) 주소만 최대 5개까지 허용한다', () => {
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      interests: ['핀테크/금융'],
      snsLinks: ['javascript:alert(1)']
    }),
    /http:\/\/ 또는 https:\/\//
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      interests: ['핀테크/금융'],
      snsLinks: Array.from(
        { length: ONBOARDING_LIMITS.snsLinksMax + 1 },
        (_, index) => `https://example.com/${index}`
      )
    }),
    /최대 5개/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      interests: ['핀테크/금융'],
      snsLinks: ['https://example.com', 'HTTPS://EXAMPLE.COM']
    }),
    /중복/
  );
});

test('온보딩 화면은 기존 프로필 수정 폼을 그대로 재사용한다', () => {
  // 새 화면을 만들지 않고 프로필 모달의 입력 요소를 그대로 쓴다.
  assert.match(gateSource, /getElementById\('edit-profile-modal'\)/);
  assert.match(gateSource, /getElementById\('profile-edit-nickname'\)/);
  assert.match(gateSource, /getElementById\('profile-edit-bio'\)/);
  assert.match(gateSource, /#interest-chips-box \[data-interest\]/);
  assert.match(gateSource, /\[data-profile-sns-link\]/);

  // 모드 전환에 필요한 식별자가 마크업에 있어야 한다.
  ['profile-modal-title', 'profile-modal-subtitle', 'btn-profile-modal-dismiss',
    'btn-profile-modal-cancel', 'btn-complete-onboarding', 'onboarding-notice',
    'onboarding-error'].forEach(elementId => {
    assert.match(html, new RegExp(`id="${elementId}"`), `${elementId} 누락`);
  });

  // 온보딩 전용 버튼과 안내는 평소에 숨어 있어야 한다.
  assert.match(html, /id="btn-complete-onboarding"\s*\n?\s*class="hidden/);
  assert.match(html, /id="onboarding-notice"\s*\n?\s*class="hidden/);
});

test('온보딩은 건너뛸 수 없고 완료 후 남은 단계로 이어진다', () => {
  // 닫기/취소/일반 저장 경로는 온보딩 모드에서 감춘다.
  assert.match(gateSource, /dismiss\?\.classList\.toggle\('hidden', isOnboarding\)/);
  assert.match(gateSource, /cancel\?\.classList\.toggle\('hidden', isOnboarding\)/);
  assert.match(gateSource, /save\?\.classList\.toggle\('hidden', isOnboarding\)/);

  // 이미 온보딩을 마친 계정에서는 열리지 않는다.
  assert.match(gateSource, /if \(!state\?\.onboarding\?\.required\) return false;/);

  // 완료되면 갱신된 계정 상태로 다음 단계를 다시 태운다.
  assert.match(authSource, /showOnboardingGateIfRequired\(supabase, state, \{/);
  assert.match(authSource, /onCompleted: \(\) => routeAfterAuthentication\(onReady\)/);

  // 로그아웃과 이메일 재인증 시 게이트를 닫는다.
  assert.match(authSource, /closeTermsConsentGate\(\);\s*\n\s*closeOnboardingGate\(\);/);
});
