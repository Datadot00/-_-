import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  NOTIFICATION_COLUMNS,
  PARTICIPATION_COLUMNS,
  PROJECT_CARD_COLUMNS,
  PROJECT_PUBLIC_LEGACY_COLUMNS,
  PROJECT_PUBLIC_COLUMNS,
  sanitizeProjectSearchQuery
} from '../src/dataService.js';

const service = readFileSync(new URL('../src/dataService.js', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../supabase/migrations/20260910130451_stage_7_query_and_index_optimization.sql', import.meta.url),
  'utf8'
);
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('프로젝트 검색어는 와일드카드를 제거하고 길이를 제한한다', () => {
  assert.equal(sanitizeProjectSearchQuery('  머니%__  로그  '), '머니 로그');
  assert.equal(sanitizeProjectSearchQuery('가'.repeat(150)).length, 100);
  assert.equal(sanitizeProjectSearchQuery(null), '');
});

test('피드 카드 조회는 카드 썸네일만 포함하고 상세 JSON과 민감 필드를 가져오지 않는다', () => {
  const cardColumns = PROJECT_CARD_COLUMNS.split(',');
  assert.equal(cardColumns.includes('questions'), false);
  assert.equal(cardColumns.includes('quizzes'), false);
  assert.equal(cardColumns.includes('service_desc'), false);
  assert.equal(cardColumns.includes('thumbnail_url'), true);
  assert.equal(cardColumns.includes('test_account_pw'), false);
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('questions'), true);
  assert.match(html, /data-thumbnail-variant="card"[^>]*loading="lazy"[^>]*class="w-full h-full object-cover"/);
});

test('검색·정렬 쿼리는 생성 검색 컬럼과 선택적 페이지 범위를 사용한다', () => {
  assert.match(service, /\.ilike\('search_text'/);
  assert.doesNotMatch(service, /query\.or\(`title\.ilike/);
  assert.match(service, /if \(hasPagination\)[\s\S]*query = query\.range/);
  assert.match(service, /\.order\('id', \{ ascending: false \}\)/);
});

test('참여와 알림 조회는 SELECT 별표 대신 명시 컬럼을 사용한다', () => {
  assert.equal(PARTICIPATION_COLUMNS.split(',').includes('completed_at'), true);
  assert.equal(NOTIFICATION_COLUMNS.split(',').includes('target_url'), true);
  assert.doesNotMatch(service, /from\('notifications'\)[\s\S]{0,80}\.select\('\*'\)/);
  assert.doesNotMatch(service, /from\('participations'\)[\s\S]{0,80}\.select\(`\s*\*/);
});

test('점진적 프로젝트 컬럼 마이그레이션 전에도 기존 프로젝트 목록 조회를 유지한다', () => {
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('verification_method'), true);
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('target_persona_tags'), true);
  assert.equal(PROJECT_PUBLIC_LEGACY_COLUMNS.split(',').includes('verification_method'), false);
  assert.equal(PROJECT_PUBLIC_LEGACY_COLUMNS.split(',').includes('target_persona_tags'), false);
  assert.match(service, /runProjectQueryWithColumnFallback\(fetchParticipated\)/);
  assert.match(service, /runProjectQueryWithColumnFallback\(fetchScraps\)/);
});

test('탐색 썸네일은 내 프로젝트와 참여완료 상태를 개인별로 구분한다', () => {
  assert.match(service, /participation_status:\s*participation\.status/);
  assert.match(service, /participation_completed_at:\s*participation\.completed_at/);
  assert.match(html, /data-feed-personal-status/);
  assert.match(html, /내 프로젝트/);
  assert.match(html, /참여완료/);
  assert.match(html, /refreshFeedPersonalState\(projectId\)/);
});

test('전체 프로젝트 홈 피드는 A/B 테스트 칩과 카드를 노출하지 않는다', () => {
  assert.doesNotMatch(html, /onclick="filterFeed\('abtest'/);
  assert.doesNotMatch(html, /data-category="abtest"/);
  assert.match(service, /\.eq\('is_ab_test', false\)/);
  assert.match(service, /\.neq\('category', 'abtest'\)/);
  assert.doesNotMatch(html, /\$\{isAb \? 'A\/B테스트'/);
});

test('7단계 마이그레이션은 검색 및 FK·최신순 경로를 인덱싱한다', () => {
  assert.match(migration, /create extension if not exists pg_trgm/i);
  assert.match(migration, /search_text text[\s\S]*generated always/i);
  assert.match(migration, /idx_projects_search_text_trgm/i);
  assert.match(migration, /idx_notifications_user_created_at/i);
  assert.match(migration, /idx_scraps_project_id/i);
  assert.match(migration, /idx_scraps_user_created_at/i);
  assert.match(migration, /idx_reviews_participation_identity/i);
});

test('기준 스키마는 테이블 생성 후 조회 인덱스를 선언한다', () => {
  assert.match(schema, /search_text TEXT GENERATED ALWAYS/i);
  assert.ok(schema.indexOf('CREATE TABLE IF NOT EXISTS public.notifications') < schema.indexOf('idx_notifications_user_created_at'));
  assert.ok(schema.indexOf('CREATE TABLE IF NOT EXISTS public.scraps') < schema.indexOf('idx_scraps_project_id'));
});
