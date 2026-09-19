import test from 'node:test';
import assert from 'node:assert/strict';

import { routeAuthenticatedAccount } from '../src/features/auth/accountRouting.js';
import { completeMyOnboarding } from '../src/features/auth/onboardingService.js';
import { installWizardDom } from './support/stubDom.js';

// ── 가짜 Supabase 클라이언트 ────────────────────────────────────────────────
// rpc 이름별로 응답을 주입하고, 실제로 어떤 호출이 나갔는지 기록한다.
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

function accountState({
  nextStep,
  onboardingVersion = 0,
  missingTerms = 0,
  emailConfirmed = true,
  nickname = '',
  interests = []
}) {
  return {
    user_id: '11111111-1111-1111-1111-111111111111',
    email: 'tester@dondwae.io',
    email_confirmed: emailConfirmed,
    next_step: nextStep,
    onboarding: {
      required: onboardingVersion < 1,
      completed_version: onboardingVersion,
      completed_at: onboardingVersion >= 1 ? '2026-09-14T00:00:00Z' : null
    },
    terms: {
      requires_consent: missingTerms > 0,
      active_required_count: 2,
      missing_required_count: missingTerms
    },
    profile: { nickname, bio: '', interests, sns_links: [] }
  };
}

function recordingHandlers() {
  const visited = [];
  const make = key => async state => { visited.push({ key, state }); };
  return {
    visited,
    handlers: {
      verify_email: make('verify_email'),
      onboarding: make('onboarding'),
      terms_review: make('terms_review'),
      ready: make('ready'),
      legacy: make('legacy')
    }
  };
}

// ── 1. 라우팅 분기 ─────────────────────────────────────────────────────────
test('가입 직후 이메일 미인증 계정은 인증 단계로 라우팅된다', async () => {
  const client = createFakeClient({
    get_my_account_state: {
      data: accountState({ nextStep: 'verify_email', emailConfirmed: false }),
      error: null
    }
  });
  const { visited, handlers } = recordingHandlers();

  const state = await routeAuthenticatedAccount(client, handlers);

  assert.equal(visited.length, 1);
  assert.equal(visited[0].key, 'verify_email');
  assert.equal(state.emailConfirmed, false);
  assert.equal(state.onboarding.required, true);
});

test('이메일 인증 후 필수 약관이 남으면 프로필보다 약관 단계가 먼저다', async () => {
  const client = createFakeClient({
    get_my_account_state: {
      data: accountState({ nextStep: 'terms_review', missingTerms: 1 }),
      error: null
    }
  });
  const { visited, handlers } = recordingHandlers();

  const state = await routeAuthenticatedAccount(client, handlers);

  assert.equal(visited[0].key, 'terms_review');
  assert.equal(state.emailConfirmed, true);
  assert.equal(state.onboarding.required, true);
  assert.equal(state.terms.requiresConsent, true);
});

test('필수 약관 동의를 마치고 프로필이 없으면 온보딩 단계로 라우팅된다', async () => {
  const client = createFakeClient({
    get_my_account_state: {
      data: accountState({ nextStep: 'onboarding', onboardingVersion: 0, missingTerms: 0 }),
      error: null
    }
  });
  const { visited, handlers } = recordingHandlers();

  const state = await routeAuthenticatedAccount(client, handlers);

  assert.equal(visited[0].key, 'onboarding');
  assert.equal(state.onboarding.required, true);
  assert.equal(state.terms.requiresConsent, false);
});

test('모두 마친 계정은 재로그인 시 곧바로 서비스로 들어간다', async () => {
  const client = createFakeClient({
    get_my_account_state: {
      data: accountState({
        nextStep: 'ready', onboardingVersion: 1, nickname: '돈돼테스터', interests: ['핀테크/금융']
      }),
      error: null
    }
  });
  const { visited, handlers } = recordingHandlers();

  const state = await routeAuthenticatedAccount(client, handlers);

  assert.equal(visited[0].key, 'ready');
  // 재로그인에서 온보딩을 다시 묻지 않는 것이 핵심이다.
  assert.equal(state.onboarding.required, false);
  assert.equal(state.profile.nickname, '돈돼테스터');
  assert.ok(!visited.some(entry => entry.key === 'onboarding'));
});

test('마이그레이션 전 계정은 legacy 경로로 흘러 서비스가 멈추지 않는다', async () => {
  const client = createFakeClient({
    get_my_account_state: {
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function get_my_account_state' }
    }
  });
  const { visited, handlers } = recordingHandlers();

  const state = await routeAuthenticatedAccount(client, handlers, { allowMissingMigration: true });

  assert.equal(visited[0].key, 'legacy');
  assert.equal(state.configured, false);
  assert.equal(state.onboarding.required, false);
});

// ── 2. 온보딩 제출 ─────────────────────────────────────────────────────────
test('온보딩 제출은 정규화된 프로필을 RPC로 보내고 갱신된 상태를 돌려준다', async () => {
  const client = createFakeClient({
    complete_my_onboarding: () => ({
      data: accountState({
        nextStep: 'ready', onboardingVersion: 1,
        nickname: '돈돼테스터', interests: ['핀테크/금융', 'AI/개발도구']
      }),
      error: null
    })
  });

  const state = await completeMyOnboarding(client, {
    nickname: '  돈돼테스터  ',
    bio: '  안녕하세요  ',
    gender: 'female',
    ageRange: '20s',
    devices: ['ios', 'windows'],
    interests: [' 핀테크/금융 ', 'AI/개발도구'],
    snsLinks: ['  https://portfolio.io  ', '']
  });

  assert.equal(client.calls.length, 1);
  const [{ name, params }] = client.calls;
  assert.equal(name, 'complete_my_onboarding');
  assert.equal(params.p_nickname, '돈돼테스터');
  assert.equal(params.p_bio, '안녕하세요');
  assert.deepEqual(params.p_interests, ['핀테크/금융', 'AI/개발도구']);
  assert.deepEqual(params.p_sns_links, ['https://portfolio.io']);
  assert.equal(params.p_gender, 'female');
  assert.equal(params.p_age_range, '20s');
  assert.deepEqual(params.p_devices, ['ios', 'windows']);

  // 완료 후 상태는 더 이상 온보딩을 요구하지 않아야 한다.
  assert.equal(state.nextStep, 'ready');
  assert.equal(state.onboarding.required, false);
  assert.equal(state.onboarding.completedVersion, 1);
});

test('온보딩 입력이 규칙을 어기면 RPC를 호출하지 않는다', async () => {
  const client = createFakeClient({ complete_my_onboarding: { data: null, error: null } });

  await assert.rejects(
    () => completeMyOnboarding(client, {
      nickname: '돈돼', gender: 'male', ageRange: '20s', interests: []
    }),
    /관심분야는 1개 이상/
  );
  assert.equal(client.calls.length, 0, '검증 실패 시 서버를 호출하면 안 된다');
});

// ── 3. 가입부터 재로그인까지 이어지는 전체 흐름 ────────────────────────────
test('가입 → 인증 → 약관 → 온보딩 → 재로그인 전체 흐름이 순서대로 진행된다', async () => {
  const journey = [
    accountState({ nextStep: 'verify_email', emailConfirmed: false }),
    accountState({ nextStep: 'terms_review', missingTerms: 1 }),
    accountState({ nextStep: 'onboarding' }),
    accountState({ nextStep: 'ready', onboardingVersion: 1, nickname: '돈돼테스터' })
  ];
  let step = 0;
  const client = createFakeClient({
    get_my_account_state: () => ({ data: journey[step++], error: null })
  });

  const { visited, handlers } = recordingHandlers();
  for (let i = 0; i < journey.length; i += 1) {
    await routeAuthenticatedAccount(client, handlers);
  }

  assert.deepEqual(
    visited.map(entry => entry.key),
    ['verify_email', 'terms_review', 'onboarding', 'ready']
  );

  // 마지막(재로그인) 시점에는 온보딩·약관 모두 요구하지 않는다.
  const last = visited.at(-1).state;
  assert.equal(last.onboarding.required, false);
  assert.equal(last.terms.requiresConsent, false);
});

test('알 수 없는 단계가 오면 조용히 통과시키지 않고 오류로 막는다', async () => {
  const client = createFakeClient({
    get_my_account_state: { data: accountState({ nextStep: 'something_else' }), error: null }
  });
  const { handlers } = recordingHandlers();

  await assert.rejects(
    () => routeAuthenticatedAccount(client, handlers),
    /Unsupported account next step/
  );
});

// ── 4. 온보딩 위저드가 화면에서 실제로 열리고 닫히는지 ─────────────────────
// 브라우저 없이 확인하려고 최소한의 DOM 만 흉내 낸다.
const TERMS_SETTLED = {
  requires_consent: false,
  documents: [
    {
      id: 'doc-tos',
      document_type: 'terms_of_service',
      version: 'v1',
      title: '이용약관',
      content: '본문',
      is_required: true,
      is_accepted: true
    }
  ]
};

async function importWizard() {
  // 모듈 상태(현재 단계 등)를 테스트마다 초기화하려고 새 인스턴스를 받는다.
  return import(`../src/features/auth/onboardingWizard.js?t=${Math.random()}`);
}

test('온보딩이 필요한 계정에서는 전용 위저드가 열린다', async () => {
  const dom = installWizardDom();
  const client = createFakeClient({
    get_my_terms_requirement_status: { data: TERMS_SETTLED, error: null }
  });
  const { showOnboardingWizard } = await importWizard();

  const opened = await showOnboardingWizard(client, {
    email: 'tester@dondwae.io',
    onboarding: { required: true },
    profile: { nickname: '기존닉', bio: '', interests: ['AI/개발도구'], snsLinks: [] }
  }, {});

  assert.equal(opened, true);
  assert.equal(dom.el('onboarding-wizard-modal').hidden, false);
  // 프로필 수정 모달은 건드리지 않는다.
  assert.equal(document.getElementById('edit-profile-modal'), null);
  // 기존 프로필 값이 채워져 있어야 한다.
  assert.equal(dom.el('wizard-nickname').value, '기존닉');
  const selectedChips = dom.el('wizard-interest-chips-box')
    .querySelectorAll('[data-wizard-interest]')
    .filter(chip => chip.getAttribute('aria-pressed') === 'true');
  assert.deepEqual(selectedChips.map(chip => chip.dataset.wizardInterest), ['AI/개발도구']);
});

test('재로그인(온보딩 완료 계정)에서는 위저드가 닫힌 상태로 남는다', async () => {
  const dom = installWizardDom();
  const { closeOnboardingWizard } = await importWizard();

  // 라우팅이 ready 로 떨어지면 위저드를 열지 않고 닫아 둔다.
  closeOnboardingWizard();

  assert.equal(dom.el('onboarding-wizard-modal').hidden, true, '모달이 열리면 안 된다');
});
