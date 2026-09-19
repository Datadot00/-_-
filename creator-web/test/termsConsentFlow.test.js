import { readAppSource } from './support/readAppHtml.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readAppSource();
const authSource = readFileSync(new URL('../src/features/auth/auth.js', import.meta.url), 'utf8');
const gateSource = readFileSync(new URL('../src/features/auth/termsGate.js', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../supabase/migrations/20260914200000_prepare_terms_gate.sql', import.meta.url),
  'utf8'
);

test('the three supplied legal documents are stored as unpublished drafts', () => {
  assert.match(migration, /'terms_of_service'[\s\S]*'draft-2026-09-14'/i);
  assert.match(migration, /'privacy_policy'[\s\S]*'draft-2026-09-14'/i);
  assert.match(migration, /'marketing_consent'[\s\S]*'draft-2026-09-14'/i);

  const seedColumns = migration.match(
    /INSERT INTO public\.terms_documents \(([\s\S]*?)\)\s*VALUES/i
  )?.[1] || '';
  assert.ok(seedColumns);
  assert.doesNotMatch(seedColumns, /published_at|effective_at/i);
});

test('server RPCs derive the active terms and write consent for auth.uid only', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_my_terms_requirement_status\(\)/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.record_my_current_term_consents/i);
    assert.match(sql, /v_user_id UUID := auth\.uid\(\)/i);
    assert.match(sql, /effective_at <= NOW\(\)/i);
    assert.match(sql, /all required terms must be accepted/i);
    assert.match(sql, /'terms_gate'/i);
    assert.doesNotMatch(sql, /record_my_current_term_consents\([\s\S]{0,100}p_user_id/i);
  }
});

test('all successful authentication paths pass through the common account router', () => {
  assert.match(authSource, /import \{ routeAuthenticatedAccount \} from '.\/accountRouting\.js'/);
  assert.match(authSource, /routeAuthenticatedAccount\(supabase, \{/);
  assert.match(authSource, /verify_email:/);
  assert.match(authSource, /onboarding:/);
  assert.match(authSource, /terms_review:/);
  assert.match(authSource, /ready:/);
  assert.match(authSource, /legacy:/);
  assert.match(authSource, /showTermsConsentGateIfRequired/);
  assert.doesNotMatch(authSource, /continueAfterTermsCheck/);
  assert.ok((authSource.match(/await routeAfterAuthentication/g) || []).length >= 6);
});

test('the modal separates required and optional consent and allows logout', () => {
  assert.match(html, /id="terms-consent-modal"/);
  assert.match(html, /필수 약관에 동의해야 서비스를 계속 이용할 수 있어요/);
  assert.match(html, /id="btn-terms-consent-decline"/);
  assert.match(gateSource, /documentRecord\.isRequired \? '필수' : '선택'/);
  assert.match(gateSource, /textContent = documentRecord\.content/);
  assert.match(gateSource, /dondwae:terms-declined/);
});
