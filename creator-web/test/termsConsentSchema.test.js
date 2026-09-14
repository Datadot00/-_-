import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../supabase/migrations/20260914193000_add_terms_and_user_consent_history.sql',
    import.meta.url
  ),
  'utf8'
);
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');

test('terms documents are versioned and required consent types remain explicit', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.terms_documents/i);
    assert.match(sql, /UNIQUE \(document_type, version\)/i);
    assert.match(
      sql,
      /document_type IN \('terms_of_service', 'privacy_policy', 'marketing_consent'\)/i
    );
    assert.match(
      sql,
      /document_type IN \('terms_of_service', 'privacy_policy'\)[\s\S]*AND is_required/i
    );
    assert.match(
      sql,
      /document_type = 'marketing_consent'[\s\S]*AND NOT is_required/i
    );
  }
});

test('user term consent records form an append-only event history', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.user_term_consents/i);
    assert.match(sql, /event_type IN \('accepted', 'withdrawn'\)/i);
    assert.match(sql, /recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/i);
    assert.match(sql, /protect_consented_terms_document/i);
  }

  assert.doesNotMatch(
    migration,
    /GRANT\s+INSERT[\s\S]*ON TABLE public\.user_term_consents/i
  );
});

test('terms visibility and consent history are restricted by RLS', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /ALTER TABLE public\.terms_documents ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /ALTER TABLE public\.user_term_consents ENABLE ROW LEVEL SECURITY/i);
    assert.match(sql, /effective_at <= NOW\(\)/i);
    assert.match(sql, /Users view own term consent history/i);
    assert.match(sql, /auth\.uid\(\)\) = user_id/i);
  }
});
