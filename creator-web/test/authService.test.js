import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearExistingLocalSession,
  clearLocalSession,
  getAuthErrorMessage,
  signInWithEmail,
  signUpWithEmail
} from '../src/authService.js';

test('로그인 오류를 회원가입으로 우회하지 않는다', async () => {
  const invalidCredentials = Object.assign(new Error('Invalid login credentials'), {
    code: 'invalid_credentials'
  });
  let signupCalls = 0;
  const client = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: invalidCredentials }),
      signUp: async () => {
        signupCalls += 1;
        return { data: null, error: null };
      }
    }
  };

  await assert.rejects(
    signInWithEmail(client, 'wrong@example.com', 'wrong-password'),
    (error) => error.code === 'invalid_credentials'
  );
  assert.equal(signupCalls, 0);
});

test('활성 세션이 있는 사용자만 로그인 성공으로 반환한다', async () => {
  const user = { id: 'user-a', email: 'user-a@example.com' };
  const session = { access_token: 'test-token', user };
  const client = {
    auth: {
      signInWithPassword: async (credentials) => {
        assert.deepEqual(credentials, {
          email: 'user-a@example.com',
          password: 'correct-password'
        });
        return { data: { user, session }, error: null };
      }
    }
  };

  const result = await signInWithEmail(client, 'user-a@example.com', 'correct-password');
  assert.equal(result.user.id, 'user-a');
  assert.equal(result.session.user.id, 'user-a');
});

test('세션 없이 사용자만 반환되면 로그인 성공으로 처리하지 않는다', async () => {
  const client = {
    auth: {
      signInWithPassword: async () => ({
        data: { user: { id: 'user-a', email: 'user-a@example.com' }, session: null },
        error: null
      })
    }
  };

  await assert.rejects(
    signInWithEmail(client, 'user-a@example.com', 'correct-password'),
    (error) => error.code === 'session_missing'
  );
});

test('회원가입은 명시적인 회원가입 요청에서만 호출한다', async () => {
  const calls = [];
  const user = { id: 'new-user', email: 'new-user@example.com' };
  const client = {
    auth: {
      signUp: async (payload) => {
        calls.push(payload);
        return { data: { user, session: null }, error: null };
      }
    }
  };

  const result = await signUpWithEmail(
    client,
    'new-user@example.com',
    'new-password',
    'http://localhost:3000/?auth=signup'
  );

  assert.equal(result.user.id, 'new-user');
  assert.equal(result.session, null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.emailRedirectTo, 'http://localhost:3000/?auth=signup');
});

test('이전 브라우저 세션은 로컬 범위로 제거한다', async () => {
  let receivedOptions = null;
  const client = {
    auth: {
      signOut: async (options) => {
        receivedOptions = options;
        return { error: null };
      }
    }
  };

  await clearLocalSession(client);
  assert.deepEqual(receivedOptions, { scope: 'local' });
});

test('새 로그인 전에 남아 있는 사용자 세션을 제거한다', async () => {
  const calls = [];
  const client = {
    auth: {
      getSession: async () => {
        calls.push('getSession');
        return {
          data: { session: { user: { id: 'previous-user' } } },
          error: null
        };
      },
      signOut: async (options) => {
        calls.push(`signOut:${options.scope}`);
        return { error: null };
      }
    }
  };

  const sessionCleared = await clearExistingLocalSession(client);
  assert.equal(sessionCleared, true);
  assert.deepEqual(calls, ['getSession', 'signOut:local']);
});

test('이전 세션이 없으면 불필요한 로그아웃을 하지 않는다', async () => {
  let signOutCalls = 0;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => {
        signOutCalls += 1;
        return { error: null };
      }
    }
  };

  const sessionCleared = await clearExistingLocalSession(client);
  assert.equal(sessionCleared, false);
  assert.equal(signOutCalls, 0);
});

test('Supabase 오류 코드를 사용자용 메시지로 변환한다', () => {
  assert.equal(
    getAuthErrorMessage({ code: 'invalid_credentials' }),
    '이메일 또는 비밀번호가 올바르지 않습니다.'
  );
  assert.equal(
    getAuthErrorMessage({ code: 'email_not_confirmed' }),
    '이메일 인증을 먼저 완료해 주세요.'
  );
});
