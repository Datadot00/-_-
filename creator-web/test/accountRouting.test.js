import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCOUNT_NEXT_STEPS,
  fetchMyAccountState,
  isAccountStateMigrationMissing,
  normalizeAccountState,
  routeAuthenticatedAccount
} from '../src/accountRouting.js';

function createRpcClient({ data = null, error = null } = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, parameters) {
      calls.push({ name, parameters });
      return { data, error };
    }
  };
}

const rawState = {
  user_id: 'user-1',
  email: 'member@example.com',
  email_confirmed: true,
  next_step: 'onboarding',
  onboarding: {
    required: true,
    completed_version: 0,
    completed_at: null
  },
  terms: {
    requires_consent: false,
    active_required_count: 2,
    missing_required_count: 0
  },
  profile: {
    nickname: '테스터',
    bio: '',
    interests: ['IT'],
    sns_links: ['https://example.com']
  }
};

test('account state is normalized into one frontend routing contract', () => {
  const state = normalizeAccountState(rawState);

  assert.deepEqual(ACCOUNT_NEXT_STEPS, [
    'verify_email',
    'terms_review',
    'onboarding',
    'ready'
  ]);
  assert.equal(state.nextStep, 'onboarding');
  assert.equal(state.userId, 'user-1');
  assert.equal(state.emailConfirmed, true);
  assert.equal(state.onboarding.completedVersion, 0);
  assert.equal(state.terms.activeRequiredCount, 2);
  assert.deepEqual(state.profile.interests, ['IT']);
});

test('the account state RPC is the only server decision requested by the router', async () => {
  const client = createRpcClient({ data: { ...rawState, next_step: 'ready' } });
  const state = await fetchMyAccountState(client);

  assert.equal(state.nextStep, 'ready');
  assert.deepEqual(client.calls, [{ name: 'get_my_account_state', parameters: undefined }]);
});

test('exactly one matching handler receives the normalized account state', async () => {
  for (const nextStep of ACCOUNT_NEXT_STEPS) {
    const client = createRpcClient({ data: { ...rawState, next_step: nextStep } });
    const calls = [];
    const handlers = Object.fromEntries(
      ACCOUNT_NEXT_STEPS.map(route => [route, state => calls.push([route, state.nextStep])])
    );
    handlers.legacy = () => calls.push(['legacy']);

    const state = await routeAuthenticatedAccount(client, handlers);

    assert.equal(state.nextStep, nextStep);
    assert.deepEqual(calls, [[nextStep, nextStep]]);
  }
});

test('unknown server decisions fail closed instead of opening the service', async () => {
  const client = createRpcClient({ data: { ...rawState, next_step: 'explore' } });

  await assert.rejects(
    routeAuthenticatedAccount(client, { explore() {} }),
    error => error.code === 'account_state_invalid'
  );
});

test('a missing migration may use legacy routing only when explicitly allowed', async () => {
  const rpcError = {
    code: 'PGRST202',
    message: 'Could not find the function public.get_my_account_state in the schema cache'
  };
  assert.equal(isAccountStateMigrationMissing(rpcError), true);

  const client = createRpcClient({ error: rpcError });
  let legacyState = null;
  await routeAuthenticatedAccount(
    client,
    { legacy: state => { legacyState = state; } },
    { allowMissingMigration: true }
  );
  assert.equal(legacyState.configured, false);
  assert.equal(legacyState.nextStep, 'legacy');

  await assert.rejects(
    fetchMyAccountState(client, { allowMissingMigration: false }),
    error => error === rpcError
  );
});

test('a missing handler fails before an account can continue', async () => {
  const client = createRpcClient({ data: rawState });

  await assert.rejects(
    routeAuthenticatedAccount(client, { ready() {} }),
    error => error.code === 'account_route_handler_missing'
  );
});
