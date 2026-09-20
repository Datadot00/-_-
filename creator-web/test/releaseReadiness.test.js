import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const expectedMigrations = [
  '20260909171123_seed_home_projects_for_existing_user.sql',
  '20260910081655_profile_integrity_backup.sql',
  '20260910081914_profile_integrity.sql',
  '20260910084715_privacy_rls_backup.sql',
  '20260910084745_privacy_rls_hardening.sql',
  '20260910085053_consolidate_project_select_policy.sql',
  '20260910085634_restrict_review_sensitive_columns.sql',
  '20260910092555_project_url_persistence.sql',
  '20260910092915_project_url_backup_primary_key.sql',
  '20260910093110_index_projects_by_creator.sql',
  '20260910101406_my_info_db_connection.sql',
  '20260910112625_normalize_profile_sns_links.sql',
  '20260910113340_require_profile_sns_links.sql',
  '20260910122545_stage_5_transaction_flow_backup.sql',
  '20260910122642_stage_5_transactional_participation_review_shop.sql',
  '20260910125104_stage_6_schema_constraints_backup.sql',
  '20260910125134_stage_6_schema_constraints_and_model.sql',
  '20260910130451_stage_7_query_and_index_optimization.sql',
  '20260911160000_remove_legacy_seed_projects.sql',
  '20260911170000_allow_platform_none_and_optional_test_credentials.sql',
  '20260912090000_verification_method_quiz_or_screenshot.sql',
  '20260912100000_make_project_verification_optional.sql',
  '20260912110000_separate_project_tech_and_persona_tags.sql',
  '20260914090000_enforce_server_quiz_validation.sql',
  '20260914192000_add_user_onboarding_state.sql',
  '20260914193000_add_terms_and_user_consent_history.sql',
  '20260914200000_prepare_terms_gate.sql',
  '20260914203000_add_account_state_and_onboarding_rpcs.sql',
  '20260915090000_require_terms_before_onboarding.sql',
  '20260915120000_add_job_group_to_onboarding.sql',
  '20260915140000_add_demographics_to_onboarding.sql',
  '20260915160000_add_tool_tags_to_onboarding.sql',
  '20260915180000_publish_privacy_policy_v2.sql',
  '20260915200000_edit_new_profile_fields.sql',
  '20260915220000_lock_gender_and_age_range.sql',
  '20260915221000_add_vote_image_storage.sql',
  '20260916120000_drop_prototype_wallet_default.sql',
  '20260916140000_welcome_bonus_on_gating_pass.sql',
  '20260916160000_update_marketplace_items_for_vibecoders.sql',
  '20260920190000_add_project_drafts.sql'
];

test('로컬 마이그레이션 파일명은 운영 DB 버전 순서와 일치한다', () => {
  const files = readdirSync(new URL('../supabase/migrations/', import.meta.url))
    .filter(file => file.endsWith('.sql'))
    .sort();
  assert.deepEqual(files, expectedMigrations);
});

test('과거 원격 시드 이력과 팀 마이그레이션 지침을 저장한다', () => {
  const marker = readFileSync(
    new URL('../supabase/migrations/20260909171123_seed_home_projects_for_existing_user.sql', import.meta.url),
    'utf8'
  );
  const guide = readFileSync(new URL('../supabase/README.md', import.meta.url), 'utf8');
  assert.match(marker, /history marker/i);
  assert.match(marker, /Intentionally no-op/i);
  assert.match(guide, /Keep each version immutable/i);
  assert.match(guide, /database owner/i);
});

test('환경 파일 정책은 로컬 비밀 파일을 제외하고 예제만 허용한다', () => {
  // .gitignore는 저장소 루트 한 곳에서 관리한다.
  const ignore = readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(example, /VITE_SUPABASE_PUBLISHABLE_KEY=/);
  assert.doesNotMatch(example, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
  assert.doesNotMatch(example, /sb_secret_/);
});
