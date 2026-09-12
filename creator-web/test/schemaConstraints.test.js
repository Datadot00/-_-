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
  assert.match(page, /category: currentMainCategory \|\| 'product'/);
  assert.match(page, /platform: currentMainCategory === 'survey' \? 'none'/);
  assert.match(schema, /CONSTRAINT projects_login_configuration_valid/i);
  assert.match(page, /dataService\.prepareProjectLoginConfiguration\(\{/);
  assert.match(page, /preserveExistingCredentials: wasEditing && editingOriginalLoginRequired === true/);
});

test('플랫폼 none 허용 및 로그인 필수 시 계정 정보 선택사항 제약조건을 검증한다', () => {
  const latestMigration = readFileSync(
    new URL('../supabase/migrations/20260911170000_allow_platform_none_and_optional_test_credentials.sql', import.meta.url),
    'utf8'
  );
  assert.match(latestMigration, /platform in \('web', 'app', 'none'\)/i);
  assert.match(latestMigration, /\(test_account_id is null and test_account_pw is null\)/i);
  assert.match(schema, /platform IN \('web', 'app', 'none'\)/i);
  assert.match(schema, /\(test_account_id IS NULL AND test_account_pw IS NULL\)/i);
});

test('프로젝트 참여 검증은 미선택 또는 퀴즈·스크린샷 중 하나만 허용한다', () => {
  const optionalVerificationMigration = readFileSync(
    new URL('../supabase/migrations/20260912100000_make_project_verification_optional.sql', import.meta.url),
    'utf8'
  );

  assert.match(optionalVerificationMigration, /SET DEFAULT 'none'/i);
  assert.match(optionalVerificationMigration, /verification_method IN \('none', 'quiz', 'screenshot'\)/i);
  assert.match(optionalVerificationMigration, /sanitize_optional_review_verification/i);
  assert.match(schema, /verification_method TEXT NOT NULL DEFAULT 'none'/i);
  assert.match(schema, /verification_method IN \('none', 'quiz', 'screenshot'\)/i);
});

test('개발 환경 태그와 권장 참여 대상 태그는 DB에서도 분리한다', () => {
  const tagMigration = readFileSync(
    new URL('../supabase/migrations/20260912110000_separate_project_tech_and_persona_tags.sql', import.meta.url),
    'utf8'
  );

  assert.match(tagMigration, /ADD COLUMN IF NOT EXISTS target_persona_tags TEXT\[\]/i);
  assert.match(tagMigration, /GRANT SELECT \(target_persona_tags\)/i);
  assert.match(schema, /tech_tags TEXT\[\][\s\S]{0,80}target_persona_tags TEXT\[\]/i);
  assert.match(schema, /CARDINALITY\(target_persona_tags\) <= 20/i);
});

