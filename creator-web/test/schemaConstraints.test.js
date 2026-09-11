import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20260910125134_stage_6_schema_constraints_and_model.sql', import.meta.url),
  'utf8'
);
const backup = readFileSync(
  new URL('../supabase/migrations/20260910125104_stage_6_schema_constraints_backup.sql', import.meta.url),
  'utf8'
);
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');
const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('6단계는 등록 자격 정규화 전에 복구 지점을 만든다', () => {
  assert.match(backup, /private\.schema_constraints_users_backup_20260910/i);
  assert.match(backup, /user_id uuid primary key/i);
  assert.match(backup, /revoke all on table[\s\S]*from public, anon, authenticated/i);
  assert.doesNotMatch(backup, /\bemail\b/i);
});

test('사용자와 프로젝트 핵심 값은 DB 제약으로 보호한다', () => {
  assert.match(migration, /users_gating_consistent/i);
  assert.match(migration, /has_passed_gating = \(completed_test_count >= 3\)/i);
  assert.match(migration, /idx_users_email_normalized_unique/i);
  assert.match(migration, /projects_category_valid/i);
  assert.match(migration, /projects_json_shapes_valid/i);
  assert.match(migration, /projects_login_configuration_valid/i);
  assert.match(migration, /projects_destination_valid/i);
});

test('참여와 리뷰의 중복 식별자는 복합 외래 키로 일치시킨다', () => {
  assert.match(migration, /participations_completion_consistent/i);
  assert.match(migration, /unique \(id, project_id, user_id\)/i);
  assert.match(
    migration,
    /foreign key \(participation_id, project_id, user_id\)[\s\S]*references public\.participations \(id, project_id, user_id\)/i
  );
  assert.match(migration, /reviews_reply_consistent/i);
});

test('코인 원장과 교환권은 유형·방향·원인·중복을 제한한다', () => {
  assert.match(migration, /coin_transactions_type_valid/i);
  assert.match(migration, /coin_transactions_direction_valid/i);
  assert.match(migration, /coin_transactions_reference_consistent/i);
  assert.match(migration, /idx_marketplace_exchanges_voucher_unique/i);
  assert.match(migration, /marketplace_exchanges_voucher_valid/i);
});

test('기준 스키마와 등록 화면도 6단계 모델을 따른다', () => {
  assert.match(schema, /CONSTRAINT users_gating_consistent/i);
  assert.match(schema, /CONSTRAINT reviews_participation_identity_fkey/i);
  assert.match(schema, /CONSTRAINT notifications_type_valid/i);
  assert.match(page, /currentMainCategory === 'none' \? 'survey'/);
  assert.match(schema, /CONSTRAINT projects_login_configuration_valid/i);
  assert.match(page, /dataService\.prepareProjectLoginConfiguration\(\{/);
  assert.match(page, /preserveExistingCredentials: wasEditing && editingOriginalLoginRequired === true/);
});
