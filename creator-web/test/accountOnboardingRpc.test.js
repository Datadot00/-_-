import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../supabase/migrations/20260915090000_require_terms_before_onboarding.sql',
    import.meta.url
  ),
  'utf8'
);
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');

test('get_my_account_state returns one server-derived routing decision', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_my_account_state\(\)/i);
    assert.match(sql, /v_user_id UUID := auth\.uid\(\)/i);
    assert.match(sql, /email_confirmed_at IS NOT NULL/i);
    assert.match(sql, /WHEN NOT v_email_confirmed THEN 'verify_email'/i);
    assert.match(sql, /WHEN v_missing_required_terms_count > 0 THEN 'terms_review'/i);
    assert.match(sql, /WHEN v_onboarding_completed_version < 1 THEN 'onboarding'/i);
    assert.match(sql, /ELSE 'ready'/i);
    assert.match(sql, /'active_required_count'/i);
    assert.match(sql, /'missing_required_count'/i);

    assert.ok(
      sql.indexOf("WHEN v_missing_required_terms_count > 0 THEN 'terms_review'")
      < sql.indexOf("WHEN v_onboarding_completed_version < 1 THEN 'onboarding'")
    );
  }
});

test('complete_my_onboarding enforces the agreed profile contract', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.complete_my_onboarding\(/i);
    assert.match(sql, /nickname must contain 1 to 20 characters/i);
    assert.match(sql, /bio must contain at most 50 characters/i);
    assert.match(sql, /interests must contain 1 to 5 values/i);
    assert.match(sql, /interests contain blank, duplicate, or oversized values/i);
    assert.match(sql, /SNS links must be an array with at most 5 values/i);
    assert.match(sql, /SNS links contain invalid or duplicate URLs/i);
    assert.match(sql, /email confirmation required/i);
  }
});

test('onboarding completion requires prior terms consent and only updates profile state', () => {
  for (const sql of [migration, schema]) {
    const functionSql = sql.slice(
      sql.indexOf('CREATE OR REPLACE FUNCTION public.complete_my_onboarding'),
      sql.indexOf(
        'COMMENT ON FUNCTION public.complete_my_onboarding',
        sql.indexOf('CREATE OR REPLACE FUNCTION public.complete_my_onboarding')
      )
    );

    assert.ok(functionSql);
    assert.match(functionSql, /v_user_id UUID := auth\.uid\(\)/i);
    assert.doesNotMatch(functionSql, /p_user_id|p_email|p_onboarding_completed/i);
    assert.match(functionSql, /required terms must be accepted before onboarding/i);
    assert.doesNotMatch(functionSql, /PERFORM public\.record_my_current_term_consents/i);
    assert.match(functionSql, /onboarding_completed_version\s*=\s*GREATEST/i);
    assert.match(functionSql, /onboarding_completed_at\s*=\s*CASE/i);
    assert.match(functionSql, /RETURN public\.get_my_account_state\(\)/i);
  }
});

test('current development terms are activated together before the new route is used', () => {
  assert.match(migration, /UPDATE public\.terms_documents/i);
  assert.match(migration, /published_at\s*=\s*COALESCE\(published_at, NOW\(\)\)/i);
  assert.match(migration, /effective_at\s*=\s*COALESCE\(effective_at, NOW\(\)\)/i);
  assert.match(migration, /version\s*=\s*'draft-2026-09-14'/i);
});

test('account state and onboarding writes are exposed only as authenticated RPCs', () => {
  for (const sql of [migration, schema]) {
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.get_my_account_state\(\)[\s\S]*FROM PUBLIC, anon, authenticated/i
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.get_my_account_state\(\)[\s\S]*TO authenticated/i
    );
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.complete_my_onboarding\([\s\S]*?\)[\s\S]*?FROM PUBLIC, anon, authenticated/i
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.complete_my_onboarding\([\s\S]*?\)[\s\S]*?TO authenticated/i
    );
  }
});
