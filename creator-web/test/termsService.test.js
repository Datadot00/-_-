import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchMyTermsRequirement,
  isTermsGateMigrationMissing,
  normalizeTermsRequirement,
  recordMyCurrentTermConsents
} from '../src/features/auth/termsService.js';

test('normalizes the current terms requirement returned by the server', () => {
  assert.deepEqual(normalizeTermsRequirement({
    requires_consent: true,
    documents: [{
      id: 'terms-v1',
      document_type: 'terms_of_service',
      version: '1.0',
      title: '서비스 이용약관',
      content: '본문',
      is_required: true,
      is_accepted: false
    }]
  }), {
    configured: true,
    requiresConsent: true,
    documents: [{
      id: 'terms-v1',
      documentType: 'terms_of_service',
      version: '1.0',
      title: '서비스 이용약관',
      content: '본문',
      isRequired: true,
      isAccepted: false
    }]
  });
});

test('keeps login usable while the new terms RPC migration is pending', async () => {
  const missingRpc = {
    code: 'PGRST202',
    message: 'Could not find the function public.get_my_terms_requirement_status'
  };
  assert.equal(isTermsGateMigrationMissing(missingRpc), true);

  const status = await fetchMyTermsRequirement({
    rpc: async () => ({ data: null, error: missingRpc })
  }, {
    allowMissingMigration: true
  });
  assert.deepEqual(status, {
    configured: false,
    requiresConsent: false,
    documents: []
  });
});

test('blocks production flow when the terms RPC migration is missing', async () => {
  const missingRpc = {
    code: 'PGRST202',
    message: 'Could not find the function public.get_my_terms_requirement_status'
  };

  await assert.rejects(
    fetchMyTermsRequirement({
      rpc: async () => ({ data: null, error: missingRpc })
    }, {
      allowMissingMigration: false
    }),
    error => error === missingRpc
  );
});

test('records unique accepted document ids only through the consent RPC', async () => {
  const calls = [];
  const status = await recordMyCurrentTermConsents({
    rpc: async (name, payload) => {
      calls.push({ name, payload });
      return {
        data: { requires_consent: false, documents: [] },
        error: null
      };
    }
  }, [' doc-a ', 'doc-a', '', null, 'doc-b']);

  assert.equal(status.requiresConsent, false);
  assert.deepEqual(calls, [{
    name: 'record_my_current_term_consents',
    payload: { p_accepted_document_ids: ['doc-a', 'doc-b'] }
  }]);
});

test('does not hide a server result that still requires mandatory consent', async () => {
  await assert.rejects(
    recordMyCurrentTermConsents({
      rpc: async () => ({
        data: { requires_consent: true, documents: [] },
        error: null
      })
    }, []),
    error => error.code === 'required_terms_missing'
  );
});
