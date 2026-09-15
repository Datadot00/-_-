import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

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

test('약관 본문 변경은 수정이 아니라 새 버전 발행으로만 한다', () => {
  const migrationDir = new URL('../supabase/migrations/', import.meta.url);
  const files = readdirSync(migrationDir).filter(file => file.endsWith('.sql'));

  // 동의 이력이 있는 문서의 본문을 고치면 protect_consented_terms_document 가 막는다.
  // 동의 기록이 "이 문장에 동의했다"를 증명해야 하므로 수정 대신 새 버전을 발행한다.
  files.forEach(file => {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    const updatesContent = /UPDATE\s+public\.terms_documents[\s\S]*?SET[\s\S]{0,200}?\bcontent\s*=/i;
    assert.doesNotMatch(sql, updatesContent, `${file} 이 약관 본문을 직접 수정한다`);
  });

  const republish = readFileSync(
    new URL('20260915180000_publish_privacy_policy_v2.sql', migrationDir),
    'utf8'
  );
  assert.match(republish, /INSERT INTO public\.terms_documents/i);
  assert.match(republish, /'draft-2026-09-15'/);
  // 이전 버전은 지우지 않고 회수만 한다. 지우면 동의 이력이 가리킬 대상이 사라진다.
  assert.match(republish, /SET retired_at = NOW\(\)/i);
  assert.doesNotMatch(republish, /DELETE FROM public\.terms_documents/i);
  // 새 수집 항목이 실제로 표에 들어가 있어야 한다.
  assert.match(republish, /관심사, 성별, 연령대/);
  assert.match(republish, /직업군, 주 사용기기/);
});
