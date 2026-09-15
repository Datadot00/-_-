import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearLocalSession,
  signInWithEmail,
  signUpWithEmail
} from '../src/authService.js';
import { routeAuthenticatedAccount } from '../src/accountRouting.js';
import { completeMyOnboarding } from '../src/onboardingService.js';
import { recordMyCurrentTermConsents } from '../src/termsService.js';

function createFullFlowClient() {
  const account = {
    id: 'flow-user-1',
    email: 'flow-user@example.com',
    password: 'safe-password',
    created: false,
    emailConfirmed: false,
    termsAccepted: false,
    onboardingVersion: 0,
    onboardingCompletedAt: null,
    profile: {
      nickname: '',
      bio: '',
      interests: [],
      snsLinks: []
    }
  };
  let session = null;
  const calls = [];

  function user() {
    return { id: account.id, email: account.email };
  }

  function activeSession() {
    return { access_token: 'integration-access-token', user: user() };
  }

  function rawAccountState() {
    const nextStep = !account.emailConfirmed
      ? 'verify_email'
      : !account.termsAccepted
        ? 'terms_review'
        : account.onboardingVersion < 1
          ? 'onboarding'
          : 'ready';

    return {
      user_id: account.id,
      email: account.email,
      email_confirmed: account.emailConfirmed,
      next_step: nextStep,
      onboarding: {
        required: account.onboardingVersion < 1,
        completed_version: account.onboardingVersion,
        completed_at: account.onboardingCompletedAt
      },
      terms: {
        requires_consent: !account.termsAccepted,
        active_required_count: 2,
        missing_required_count: account.termsAccepted ? 0 : 2
      },
      profile: {
        nickname: account.profile.nickname,
        bio: account.profile.bio,
        interests: account.profile.interests,
        sns_links: account.profile.snsLinks
      }
    };
  }

  const client = {
    auth: {
      async signUp(payload) {
        calls.push({ operation: 'signUp', payload });
        account.created = true;
        account.email = payload.email;
        account.password = payload.password;
        return { data: { user: user(), session: null }, error: null };
      },
      async signInWithPassword(payload) {
        calls.push({ operation: 'signInWithPassword', payload });
        if (!account.emailConfirmed) {
          return {
            data: { user: null, session: null },
            error: Object.assign(new Error('Email not confirmed'), {
              code: 'email_not_confirmed'
            })
          };
        }
        if (payload.email !== account.email || payload.password !== account.password) {
          return {
            data: { user: null, session: null },
            error: Object.assign(new Error('Invalid login credentials'), {
              code: 'invalid_credentials'
            })
          };
        }
        session = activeSession();
        return { data: { user: user(), session }, error: null };
      },
      async signOut(options) {
        calls.push({ operation: 'signOut', options });
        session = null;
        return { error: null };
      }
    },
    async rpc(name, payload) {
      calls.push({ operation: `rpc:${name}`, payload });
      if (!session) {
        return {
          data: null,
          error: Object.assign(new Error('authentication required'), { code: '42501' })
        };
      }

      if (name === 'get_my_account_state') {
        return { data: rawAccountState(), error: null };
      }
      if (name === 'record_my_current_term_consents') {
        if (!Array.isArray(payload.p_accepted_document_ids)
          || payload.p_accepted_document_ids.length < 2) {
          return {
            data: null,
            error: Object.assign(new Error('all required terms must be accepted'), {
              code: '22023'
            })
          };
        }
        account.termsAccepted = true;
        return {
          data: {
            requires_consent: false,
            documents: [
              { id: 'terms-1', is_required: true, is_accepted: true },
              { id: 'privacy-1', is_required: true, is_accepted: true }
            ]
          },
          error: null
        };
      }
      if (name === 'complete_my_onboarding') {
        if (!account.termsAccepted) {
          return {
            data: null,
            error: Object.assign(
              new Error('required terms must be accepted before onboarding'),
              { code: '42501' }
            )
          };
        }
        account.profile = {
          nickname: payload.p_nickname,
          bio: payload.p_bio,
          interests: payload.p_interests,
          snsLinks: payload.p_sns_links
        };
        account.onboardingVersion = 1;
        account.onboardingCompletedAt = '2026-09-14T12:00:00.000Z';
        return { data: rawAccountState(), error: null };
      }

      return {
        data: null,
        error: Object.assign(new Error('function not found'), { code: 'PGRST202' })
      };
    }
  };

  function confirmEmailLink() {
    if (!account.created) throw new Error('account must exist before confirmation');
    calls.push({ operation: 'confirmEmailLink' });
    account.emailConfirmed = true;
    session = activeSession();
    return { user: user(), session };
  }

  return { account, calls, client, confirmEmailLink, getSession: () => session };
}

async function readRoute(client) {
  let selectedRoute = '';
  let selectedState = null;
  const record = route => state => {
    selectedRoute = route;
    selectedState = state;
  };

  await routeAuthenticatedAccount(client, {
    verify_email: record('verify_email'),
    onboarding: record('onboarding'),
    terms_review: record('terms_review'),
    ready: record('ready'),
    legacy: record('legacy')
  }, { allowMissingMigration: false });

  return { route: selectedRoute, state: selectedState };
}

test('회원가입부터 확인 링크·약관·온보딩·로그아웃·재로그인까지 하나의 계정 상태로 이어진다', async () => {
  const { account, calls, client, confirmEmailLink, getSession } = createFullFlowClient();

  const signup = await signUpWithEmail(
    client,
    account.email,
    account.password,
    'http://127.0.0.1:3001/?auth=signup'
  );
  assert.equal(signup.session, null, '이메일 확인 전에는 세션을 열지 않는다');

  await assert.rejects(
    signInWithEmail(client, account.email, account.password),
    error => error.code === 'email_not_confirmed'
  );

  const verified = confirmEmailLink();
  assert.equal(verified.user.id, account.id);
  assert.ok(getSession(), '확인 링크 복귀 후 세션이 생성되어야 한다');

  const beforeTerms = await readRoute(client);
  assert.equal(beforeTerms.route, 'terms_review');
  assert.equal(beforeTerms.state.terms.requiresConsent, true);
  assert.equal(beforeTerms.state.onboarding.required, true);

  const acceptedTerms = await recordMyCurrentTermConsents(client, [
    'terms-1',
    'privacy-1'
  ]);
  assert.equal(acceptedTerms.requiresConsent, false);

  const beforeOnboarding = await readRoute(client);
  assert.equal(beforeOnboarding.route, 'onboarding');
  assert.equal(beforeOnboarding.state.onboarding.required, true);

  const completed = await completeMyOnboarding(client, {
    nickname: '통합테스터',
    bio: '전체 가입 흐름 테스트 계정',
    gender: 'male',
    ageRange: '30s',
    devices: ['android'],
    interests: ['생산성/업무도구', 'AI/개발도구'],
    snsLinks: ['https://example.com/flow']
  });
  assert.equal(completed.nextStep, 'ready');
  assert.equal(completed.profile.nickname, '통합테스터');

  const afterOnboarding = await readRoute(client);
  assert.equal(afterOnboarding.route, 'ready');

  await clearLocalSession(client);
  assert.equal(getSession(), null);

  const relogin = await signInWithEmail(client, account.email, account.password);
  assert.equal(relogin.user.id, account.id);

  const afterRelogin = await readRoute(client);
  assert.equal(afterRelogin.route, 'ready');
  assert.equal(afterRelogin.state.onboarding.completedVersion, 1);
  assert.equal(afterRelogin.state.profile.nickname, '통합테스터');
  assert.deepEqual(afterRelogin.state.profile.interests, [
    '생산성/업무도구',
    'AI/개발도구'
  ]);

  assert.deepEqual(
    calls.map(call => call.operation),
    [
      'signUp',
      'signInWithPassword',
      'confirmEmailLink',
      'rpc:get_my_account_state',
      'rpc:record_my_current_term_consents',
      'rpc:get_my_account_state',
      'rpc:complete_my_onboarding',
      'rpc:get_my_account_state',
      'signOut',
      'signInWithPassword',
      'rpc:get_my_account_state'
    ]
  );
});
