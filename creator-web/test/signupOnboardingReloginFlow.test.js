import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearLocalSession,
  signInWithEmail,
  signUpWithEmail,
  verifySignupEmailOtp
} from '../src/authService.js';
import { routeAuthenticatedAccount } from '../src/accountRouting.js';
import { completeMyOnboarding } from '../src/onboardingService.js';

function createFullFlowClient() {
  const account = {
    id: 'flow-user-1',
    email: 'flow-user@example.com',
    password: 'safe-password',
    expectedOtp: '482193',
    created: false,
    emailConfirmed: false,
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
        requires_consent: false,
        active_required_count: 0,
        missing_required_count: 0
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
      async verifyOtp(payload) {
        calls.push({ operation: 'verifyOtp', payload });
        if (
          !account.created
          || payload.email !== account.email
          || payload.token !== account.expectedOtp
          || payload.type !== 'email'
        ) {
          return {
            data: { user: null, session: null },
            error: Object.assign(new Error('Token has expired or is invalid'), {
              code: 'otp_expired'
            })
          };
        }
        account.emailConfirmed = true;
        session = activeSession();
        return { data: { user: user(), session }, error: null };
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
      if (name === 'complete_my_onboarding') {
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

  return { account, calls, client, getSession: () => session };
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

test('회원가입부터 OTP·온보딩·로그아웃·재로그인까지 하나의 계정 상태로 이어진다', async () => {
  const { account, calls, client, getSession } = createFullFlowClient();

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

  const verified = await verifySignupEmailOtp(client, account.email, account.expectedOtp);
  assert.equal(verified.user.id, account.id);
  assert.ok(getSession(), 'OTP 확인 후 세션이 생성되어야 한다');

  const beforeOnboarding = await readRoute(client);
  assert.equal(beforeOnboarding.route, 'onboarding');
  assert.equal(beforeOnboarding.state.onboarding.required, true);

  const completed = await completeMyOnboarding(client, {
    nickname: '통합테스터',
    bio: '전체 가입 흐름 테스트 계정',
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
      'verifyOtp',
      'rpc:get_my_account_state',
      'rpc:complete_my_onboarding',
      'rpc:get_my_account_state',
      'signOut',
      'signInWithPassword',
      'rpc:get_my_account_state'
    ]
  );
});
