import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ONBOARDING_LIMITS,
  prepareOnboardingPayload
} from '../src/onboardingService.js';
import { installWizardDom } from './support/stubDom.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const wizardSource = readFileSync(new URL('../src/onboardingWizard.js', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/auth.js', import.meta.url), 'utf8');

// 닉네임 외 필수 항목을 매번 적지 않도록 모아 둔다. 개별 규칙은 아래 전용 테스트에서 본다.
const REQUIRED = Object.freeze({
  gender: 'female',
  ageRange: '20s',
  interests: ['핀테크/금융']
});

// ── 입력 검증 계약 ─────────────────────────────────────────────────────────
test('온보딩 입력은 RPC 계약과 같은 규칙으로 정규화된다', () => {
  const payload = prepareOnboardingPayload({
    nickname: '  돈돼테스터  ',
    bio: '  안녕하세요  ',
    gender: 'female',
    ageRange: '20s',
    interests: [' 핀테크/금융 ', 'AI/개발도구'],
    snsLinks: ['  https://example.com  ', '', '   ']
  });

  assert.equal(payload.p_nickname, '돈돼테스터');
  assert.equal(payload.p_bio, '안녕하세요');
  assert.equal(payload.p_job_group, '');
  assert.deepEqual(payload.p_interests, ['핀테크/금융', 'AI/개발도구']);
  // 빈 링크 칸은 등록하지 않은 것으로 보고 버린다.
  assert.deepEqual(payload.p_sns_links, ['https://example.com']);
  assert.equal('p_accepted_document_ids' in payload, false);
});

test('닉네임과 관심분야는 필수이며 한도를 넘길 수 없다', () => {
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '   ', ...REQUIRED }),
    /닉네임은 1자 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: 'ㄱ'.repeat(ONBOARDING_LIMITS.nicknameMax + 1),
      ...REQUIRED
    }),
    /닉네임은 1자 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, interests: [] }),
    /관심분야는 1개 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
      interests: ['a', 'b', 'c', 'd', 'e', 'f']
    }),
    /관심분야는 1개 이상/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, interests: ['핀테크', '핀테크'] }),
    /중복/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      bio: 'ㄱ'.repeat(ONBOARDING_LIMITS.bioMax + 1),
      ...REQUIRED
    }),
    /한 줄 소개는/
  );
});

test('직업군은 선택 항목이며 한도를 넘기면 거부된다', () => {
  const chosen = prepareOnboardingPayload({
    nickname: '돈돼',
    ...REQUIRED,
    jobGroup: '  개발자  '
  });
  assert.equal(chosen.p_job_group, '개발자');

  // 고르지 않아도 온보딩은 통과해야 한다.
  const skipped = prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED });
  assert.equal(skipped.p_job_group, '');

  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
      jobGroup: 'ㄱ'.repeat(ONBOARDING_LIMITS.jobGroupMax + 1)
    }),
    /직업군은 50자 이하/
  );
});

test('성별과 연령대는 필수이며 정해진 값만 받는다', () => {
  const payload = prepareOnboardingPayload({
    nickname: '돈돼',
    ...REQUIRED,
    gender: 'male',
    ageRange: '60s_plus'
  });
  assert.equal(payload.p_gender, 'male');
  assert.equal(payload.p_age_range, '60s_plus');

  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, gender: '' }),
    /성별을 선택해 주세요/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, gender: '남자' }),
    /성별을 선택해 주세요/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, ageRange: '' }),
    /연령대를 선택해 주세요/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, ageRange: '70s' }),
    /연령대를 선택해 주세요/
  );
});

test('주 사용기기는 선택 항목이며 목록에 있는 값만 중복 없이 받는다', () => {
  const chosen = prepareOnboardingPayload({
    nickname: '돈돼',
    ...REQUIRED,
    devices: [' ios ', 'windows']
  });
  assert.deepEqual(chosen.p_devices, ['ios', 'windows']);

  // 하나도 고르지 않아도 온보딩은 통과해야 한다.
  const skipped = prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED });
  assert.deepEqual(skipped.p_devices, []);

  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, devices: ['linux'] }),
    /목록에 있는 기기만/
  );
  assert.throws(
    () => prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED, devices: ['ios', 'ios'] }),
    /중복 선택/
  );
});

test('툴·기술 태그는 모집글 태그와 같은 규칙으로 다듬어진다', () => {
  const payload = prepareOnboardingPayload({
    nickname: '돈돼',
    ...REQUIRED,
    // 제작자 모집글처럼 '#' 를 붙여 적어도 저장은 접두사 없이 한다.
    toolTags: ['#Cursor', '  Next.js  ', 'Figma']
  });
  assert.deepEqual(payload.p_tool_tags, ['Cursor', 'Next.js', 'Figma']);

  // 적지 않아도 온보딩은 통과해야 한다.
  const skipped = prepareOnboardingPayload({ nickname: '돈돼', ...REQUIRED });
  assert.deepEqual(skipped.p_tool_tags, []);

  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
      toolTags: Array.from(
        { length: ONBOARDING_LIMITS.toolTagsMax + 1 },
        (_, index) => `tool-${index}`
      )
    }),
    /최대 10개/
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
      toolTags: ['Cursor', '#cursor']
    }),
    /중복/
  );
});

test('SNS 링크는 HTTP(S) 주소만 최대 5개까지 허용한다', () => {
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
      snsLinks: ['javascript:alert(1)']
    }),
    /http:\/\/ 또는 https:\/\//
  );
  assert.throws(
    () => prepareOnboardingPayload({
      nickname: '돈돼',
      ...REQUIRED,
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
      ...REQUIRED,
      snsLinks: ['https://example.com', 'HTTPS://EXAMPLE.COM']
    }),
    /중복/
  );
});

// ── 마크업 계약 ────────────────────────────────────────────────────────────
test('온보딩은 프로필 수정 모달과 분리된 5단계 전용 모달을 쓴다', () => {
  assert.match(html, /id="onboarding-wizard-modal"/);
  ['wizard-step-counter', 'wizard-step-title', 'wizard-step-subtitle',
    'wizard-terms-document-list', 'wizard-nickname', 'wizard-interest-chips-box',
    'wizard-job-group', 'wizard-tool-tag-input', 'wizard-tool-tags-container',
    'wizard-sns-links-container', 'wizard-error',
    'btn-wizard-back', 'btn-wizard-next'].forEach(elementId => {
    assert.match(html, new RegExp(`id="${elementId}"`), `${elementId} 누락`);
  });

  // 4개 단계 패널과 진행 표시가 모두 있어야 한다.
  for (let step = 1; step <= 5; step += 1) {
    assert.match(html, new RegExp(`data-wizard-step-panel="${step}"`), `step ${step} 패널 누락`);
    assert.match(html, new RegExp(`data-wizard-step-indicator="${step}"`), `step ${step} 표시 누락`);
  }

  // 프로필 수정 모달에서는 온보딩 전용 요소를 걷어냈다.
  assert.doesNotMatch(html, /id="onboarding-notice"/);
  assert.doesNotMatch(html, /id="btn-complete-onboarding"/);
  assert.doesNotMatch(html, /id="onboarding-error"/);
  // 수정 모달의 닫기·저장 경로는 그대로 남아 있어야 한다.
  assert.match(html, /id="btn-save-profile"/);
  assert.match(html, /id="btn-profile-modal-cancel"/);
});

test('가입 직후 계정은 약관까지 위저드 한 곳에서 처리한다', () => {
  // 약관 단계가 위저드 안에 있으므로 약관 서비스도 위저드가 직접 호출한다.
  assert.match(wizardSource, /recordMyCurrentTermConsents/);
  assert.match(wizardSource, /fetchMyTermsRequirement/);

  // 온보딩이 남은 계정은 단독 약관 모달 대신 위저드로 보낸다.
  assert.match(authSource, /state\.onboarding\.required\s*\n?\s*\? openOnboardingWizardFlow/);
  assert.match(authSource, /onboarding: \(state\) => openOnboardingWizardFlow\(state, onReady\)/);
  // 완료되면 갱신된 계정 상태로 다음 단계를 다시 태운다.
  assert.match(authSource, /onCompleted: \(\) => routeAfterAuthentication\(onReady\)/);
  // 로그아웃과 이메일 재인증 시 위저드를 닫는다.
  assert.match(authSource, /closeTermsConsentGate\(\);\s*\n\s*closeOnboardingWizard\(\);/);
});

// ── 단계 진행 ──────────────────────────────────────────────────────────────
function createFakeClient(handlers = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name, params) => {
      calls.push({ name, params });
      const handler = handlers[name];
      if (!handler) return { data: null, error: { code: 'PGRST202', message: `no handler: ${name}` } };
      return typeof handler === 'function' ? handler(params, calls) : handler;
    }
  };
}

function termsStatus({ requiresConsent, acceptedIds = [] }) {
  return {
    requires_consent: requiresConsent,
    documents: [
      {
        id: 'doc-tos',
        document_type: 'terms_of_service',
        version: 'v1',
        title: '이용약관',
        content: '본문',
        is_required: true,
        is_accepted: acceptedIds.includes('doc-tos')
      },
      {
        id: 'doc-marketing',
        document_type: 'marketing_consent',
        version: 'v1',
        title: '마케팅 수신 동의',
        content: '본문',
        is_required: false,
        is_accepted: acceptedIds.includes('doc-marketing')
      }
    ]
  };
}

function completedAccountState(nickname = '돈돼테스터') {
  return {
    user_id: '11111111-1111-1111-1111-111111111111',
    email: 'tester@dondwae.io',
    email_confirmed: true,
    next_step: 'ready',
    onboarding: { required: false, completed_version: 1, completed_at: '2026-09-15T00:00:00Z' },
    terms: { requires_consent: false, active_required_count: 2, missing_required_count: 0 },
    profile: { nickname, bio: '', interests: ['핀테크/금융'], sns_links: [] }
  };
}

const pendingAccountState = {
  email: 'tester@dondwae.io',
  onboarding: { required: true },
  profile: { nickname: '', bio: '', interests: [], snsLinks: [] }
};

async function importWizard() {
  // 모듈 상태(현재 단계 등)를 테스트마다 초기화하려고 새 인스턴스를 받는다.
  return import(`../src/onboardingWizard.js?t=${Math.random()}`);
}

test('약관이 남은 계정은 1단계부터 시작하고 필수 동의 전에는 진행할 수 없다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: true }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();

  const opened = await showOnboardingWizard(client, pendingAccountState, {});

  assert.equal(opened, true);
  assert.equal(dom.el('onboarding-wizard-modal').hidden, false);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 1 / 5');
  assert.equal(dom.el('wizard-step-1').hidden, false);
  assert.equal(dom.el('wizard-step-2').hidden, true);
  // 필수 약관이 체크되기 전에는 다음으로 넘어갈 수 없다.
  assert.equal(dom.el('btn-wizard-next').disabled, true);
  // 1단계에서는 되돌아갈 곳이 없다.
  assert.equal(dom.el('btn-wizard-back').disabled, true);
});

test('필수 약관에 동의하면 동의를 기록하고 2단계로 넘어간다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: true }), error: null },
    record_my_current_term_consents: {
      data: termsStatus({ requiresConsent: false, acceptedIds: ['doc-tos'] }),
      error: null
    }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  const list = dom.el('wizard-terms-document-list');
  const requiredCheckbox = list.querySelectorAll('[data-wizard-terms-checkbox]')
    .find(checkbox => checkbox.dataset.required === 'true');
  requiredCheckbox.checked = true;
  list.dispatch('change', { target: requiredCheckbox });

  assert.equal(dom.el('btn-wizard-next').disabled, false);

  dom.el('btn-wizard-next').click();
  await new Promise(resolve => setImmediate(resolve));

  const consentCall = client.calls.find(call => call.name === 'record_my_current_term_consents');
  assert.ok(consentCall, '약관 동의가 기록되어야 한다');
  assert.deepEqual(consentCall.params.p_accepted_document_ids, ['doc-tos']);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 2 / 5');
  assert.equal(dom.el('wizard-step-2').hidden, false);
});

test('이미 약관에 동의한 계정은 1단계를 건너뛰고 2단계에서 시작한다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();

  await showOnboardingWizard(client, pendingAccountState, {});

  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 2 / 5');
  assert.equal(dom.el('wizard-step-1').hidden, true);
  // 되돌아갈 약관 단계가 없으므로 이전 버튼은 막아 둔다.
  assert.equal(dom.el('btn-wizard-back').disabled, true);
  assert.equal(
    client.calls.some(call => call.name === 'record_my_current_term_consents'),
    false,
    '이미 동의한 계정에 동의 기록을 다시 쓰면 안 된다'
  );
});

test('닉네임이 비어 있으면 2단계에서 막히고, 입력하면 3단계로 넘어간다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  dom.el('btn-wizard-next').click();
  assert.equal(dom.el('wizard-error').hidden, false);
  assert.match(dom.el('wizard-error').textContent, /닉네임은 1자 이상/);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 2 / 5');

  dom.el('wizard-nickname').value = '돈돼테스터';
  dom.el('btn-wizard-next').click();

  assert.equal(dom.el('wizard-error').hidden, true);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 3 / 5');
  assert.equal(dom.el('wizard-step-3').hidden, false);
});

test('성별과 연령대를 고르지 않으면 3단계에서 막힌다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  dom.el('wizard-nickname').value = '돈돼테스터';
  dom.el('btn-wizard-next').click();
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 3 / 5');

  dom.el('btn-wizard-next').click();
  assert.match(dom.el('wizard-error').textContent, /성별을 선택해 주세요/);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 3 / 5');

  const genderBox = dom.el('wizard-gender-box');
  const male = genderBox.querySelectorAll('[data-wizard-gender]')[0];
  genderBox.dispatch('click', { target: male });
  assert.equal(male.getAttribute('aria-checked'), 'true');

  // 성별만 고르고 넘어가려 하면 이번엔 연령대에서 막힌다.
  dom.el('btn-wizard-next').click();
  assert.match(dom.el('wizard-error').textContent, /연령대를 선택해 주세요/);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 3 / 5');

  const ageBox = dom.el('wizard-age-range-box');
  const twenties = ageBox.querySelectorAll('[data-wizard-age-range]')[1];
  ageBox.dispatch('click', { target: twenties });

  // 주 사용기기는 선택 항목이라 비워 둔 채로도 넘어갈 수 있어야 한다.
  dom.el('btn-wizard-next').click();
  assert.equal(dom.el('wizard-error').hidden, true);
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 4 / 5');
});

test('성별과 연령대는 하나만 선택되고, 기기는 여러 개 고를 수 있다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  const genderBox = dom.el('wizard-gender-box');
  const [male, female] = genderBox.querySelectorAll('[data-wizard-gender]');
  genderBox.dispatch('click', { target: male });
  genderBox.dispatch('click', { target: female });

  // 뒤에 고른 값만 남아야 한다.
  assert.equal(male.getAttribute('aria-checked'), 'false');
  assert.equal(female.getAttribute('aria-checked'), 'true');

  const deviceBox = dom.el('wizard-device-box');
  const devices = deviceBox.querySelectorAll('[data-wizard-device]');
  deviceBox.dispatch('click', { target: devices[0] });
  deviceBox.dispatch('click', { target: devices[3] });

  assert.equal(devices[0].getAttribute('aria-pressed'), 'true');
  assert.equal(devices[3].getAttribute('aria-pressed'), 'true');
  assert.equal(dom.el('wizard-device-count').textContent, '2개 선택');

  // 다시 누르면 해제된다.
  deviceBox.dispatch('click', { target: devices[0] });
  assert.equal(devices[0].getAttribute('aria-pressed'), 'false');
  assert.equal(dom.el('wizard-device-count').textContent, '1개 선택');
});

test('관심분야를 고르지 않으면 4단계에서 막히고, 고르면 저장 후 완료 화면으로 간다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null },
    complete_my_onboarding: { data: completedAccountState('돈돼테스터'), error: null }
  });
  const { showOnboardingWizard } = await importWizard();

  let continuedWith = 'not-called';
  await showOnboardingWizard(client, pendingAccountState, {
    onCompleted: state => { continuedWith = state; }
  });

  dom.el('wizard-nickname').value = '돈돼테스터';
  dom.el('wizard-job-group').value = '개발자';
  dom.el('btn-wizard-next').click();

  const genderBox = dom.el('wizard-gender-box');
  genderBox.dispatch('click', {
    target: genderBox.querySelectorAll('[data-wizard-gender]')[1]
  });
  const ageBox = dom.el('wizard-age-range-box');
  ageBox.dispatch('click', {
    target: ageBox.querySelectorAll('[data-wizard-age-range]')[1]
  });
  const deviceBox = dom.el('wizard-device-box');
  deviceBox.dispatch('click', {
    target: deviceBox.querySelectorAll('[data-wizard-device]')[0]
  });
  dom.el('btn-wizard-next').click();

  dom.el('btn-wizard-next').click();
  assert.match(dom.el('wizard-error').textContent, /관심분야는 1개 이상/);
  assert.equal(
    client.calls.some(call => call.name === 'complete_my_onboarding'),
    false,
    '검증 실패 상태로 RPC를 호출하면 안 된다'
  );

  dom.el('wizard-tool-tag-input').value = '#Cursor';
  dom.el('btn-wizard-add-tool-tag').click();

  const chipsBox = dom.el('wizard-interest-chips-box');
  const chip = chipsBox.querySelectorAll('[data-wizard-interest]')[0];
  chipsBox.dispatch('click', { target: chip });
  assert.equal(chip.getAttribute('aria-pressed'), 'true');

  dom.el('btn-wizard-next').click();
  await new Promise(resolve => setImmediate(resolve));

  const completeCall = client.calls.find(call => call.name === 'complete_my_onboarding');
  assert.ok(completeCall, '온보딩 완료 RPC가 호출되어야 한다');
  assert.equal(completeCall.params.p_nickname, '돈돼테스터');
  assert.equal(completeCall.params.p_job_group, '개발자');
  assert.equal(completeCall.params.p_gender, 'female');
  assert.equal(completeCall.params.p_age_range, '20s');
  assert.deepEqual(completeCall.params.p_devices, ['ios']);
  assert.deepEqual(completeCall.params.p_tool_tags, ['Cursor']);
  assert.deepEqual(completeCall.params.p_interests, [chip.dataset.wizardInterest]);

  // 저장이 끝나야 축하 화면이 뜨고, 그 전에는 흐름을 이어가지 않는다.
  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 5 / 5');
  assert.equal(dom.el('wizard-step-5').hidden, false);
  assert.equal(dom.el('wizard-complete-nickname').textContent, '돈돼테스터');
  assert.equal(continuedWith, 'not-called');

  // 마지막 버튼을 눌러야 모달이 닫히고 다음 단계로 이어진다.
  dom.el('btn-wizard-next').click();
  await new Promise(resolve => setImmediate(resolve));

  assert.notEqual(continuedWith, 'not-called');
  assert.equal(continuedWith.nextStep, 'ready');
  assert.equal(dom.el('onboarding-wizard-modal').hidden, true);
});

test('툴 태그는 입력칸·추천 칩 어느 쪽으로 넣어도 같은 목록에 쌓인다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  // 쉼표로 여러 개를 한 번에, '#' 는 떼고 저장한다.
  dom.el('wizard-tool-tag-input').value = '#Cursor, Next.js';
  dom.el('btn-wizard-add-tool-tag').click();

  const container = dom.el('wizard-tool-tags-container');
  assert.deepEqual(
    container.querySelectorAll('[data-wizard-tool-tag]').map(chip => chip.dataset.wizardToolTag),
    ['Cursor', 'Next.js']
  );
  assert.equal(dom.el('wizard-tool-tag-input').value, '', '추가 후 입력칸은 비워야 한다');
  assert.equal(dom.el('wizard-tool-tag-count').textContent, '2/10개');

  // 추천 칩도 같은 목록에 더해지고, 이미 있는 태그는 무시된다.
  const suggestions = dom.el('wizard-tool-tag-suggestions');
  suggestions.dispatch('click', {
    target: suggestions.querySelectorAll('[data-wizard-tool-suggestion]')[1]
  });
  suggestions.dispatch('click', {
    target: suggestions.querySelectorAll('[data-wizard-tool-suggestion]')[0]
  });
  assert.deepEqual(
    container.querySelectorAll('[data-wizard-tool-tag]').map(chip => chip.dataset.wizardToolTag),
    ['Cursor', 'Next.js', 'Figma']
  );

  // 삭제 버튼으로 하나 빼면 개수도 줄어든다.
  const removeButton = container.querySelectorAll('[data-wizard-tool-tag-remove]')[0];
  container.dispatch('click', { target: removeButton });
  assert.deepEqual(
    container.querySelectorAll('[data-wizard-tool-tag]').map(chip => chip.dataset.wizardToolTag),
    ['Next.js', 'Figma']
  );
  assert.equal(dom.el('wizard-tool-tag-count').textContent, '2/10개');
});

test('관심분야는 상한을 넘겨 선택할 수 없다', async () => {
  const dom = installWizardDom({
    interests: Array.from({ length: ONBOARDING_LIMITS.interestsMax + 1 }, (_, i) => `분야${i}`)
  });
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: false }), error: null }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  const chipsBox = dom.el('wizard-interest-chips-box');
  const chips = chipsBox.querySelectorAll('[data-wizard-interest]');
  chips.forEach(chip => chipsBox.dispatch('click', { target: chip }));

  const selected = chips.filter(chip => chip.getAttribute('aria-pressed') === 'true');
  assert.equal(selected.length, ONBOARDING_LIMITS.interestsMax);
  assert.match(dom.el('wizard-error').textContent, /최대 5개/);
});

test('약관 저장이 실패하면 단계를 넘기지 않고 오류를 보여준다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: termsStatus({ requiresConsent: true }), error: null },
    record_my_current_term_consents: { data: null, error: { message: 'network down' } }
  });
  const { showOnboardingWizard } = await importWizard();
  await showOnboardingWizard(client, pendingAccountState, {});

  const list = dom.el('wizard-terms-document-list');
  const requiredCheckbox = list.querySelectorAll('[data-wizard-terms-checkbox]')
    .find(checkbox => checkbox.dataset.required === 'true');
  requiredCheckbox.checked = true;
  list.dispatch('change', { target: requiredCheckbox });

  dom.el('btn-wizard-next').click();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(dom.el('wizard-step-counter').textContent, 'STEP 1 / 5');
  assert.match(dom.el('wizard-error').textContent, /약관 동의를 저장하지 못했습니다/);
});
