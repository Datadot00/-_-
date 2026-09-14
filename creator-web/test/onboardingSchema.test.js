import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260914192000_add_user_onboarding_state.sql', import.meta.url),
  'utf8'
);
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');

test('existing users remain active and new users start with pending onboarding', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS onboarding_completed_version SMALLINT/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ/i);
  assert.match(migration, /onboarding_completed_version = 1[\s\S]*onboarding_completed_at = COALESCE/i);
  assert.match(migration, /ALTER COLUMN onboarding_completed_version SET DEFAULT 0/i);
  assert.match(migration, /ALTER COLUMN onboarding_completed_version SET NOT NULL/i);
});

test('onboarding version and completion time must remain consistent', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /users_onboarding_state_consistent/i);
    assert.match(sql, /onboarding_completed_version = 0[\s\S]*onboarding_completed_at IS NULL/i);
    assert.match(sql, /onboarding_completed_version > 0[\s\S]*onboarding_completed_at IS NOT NULL/i);
  }
});

test('onboarding state is not exposed by the public profile grant', () => {
  const publicGrant = schema.match(
    /GRANT SELECT \([\s\S]*?\) ON TABLE public\.users TO anon, authenticated;/i
  )?.[0] || '';

  assert.ok(publicGrant, 'Expected a public.users column-level SELECT grant');
  assert.doesNotMatch(publicGrant, /onboarding_completed_/i);
});
