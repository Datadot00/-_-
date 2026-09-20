import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppSource } from './support/readAppHtml.js';
import * as dataService from '../src/shared/data/dataService.js';

const html = readAppSource();

test('테스트 등록 Step Indicator가 1. 과제 설정, 2. 기본 정보 순서로 배치된다', () => {
  assert.match(html, /id="step-label-1"[^>]*>1\.\s*테스트 과제 설정/);
  assert.match(html, /id="step-label-2"[^>]*>2\.\s*기본정보/);
  assert.match(html, /id="step-label-3"[^>]*>3\.\s*타겟 및 리워드 설정/);
});

test('form-section-1이 테스트 과제 설정이고 form-section-2가 기본 정보 입력이다', () => {
  const s1Idx = html.indexOf('id="form-section-1"');
  const s2Idx = html.indexOf('id="form-section-2"');
  const s3Idx = html.indexOf('id="form-section-3"');

  assert.ok(s1Idx > 0 && s2Idx > s1Idx && s3Idx > s2Idx, '섹션 순서는 s1 < s2 < s3 여야 함');

  const s1Html = html.slice(s1Idx, s2Idx);
  const s2Html = html.slice(s2Idx, s3Idx);

  // s1에는 테스트 대분류 및 접속 매체/URL/가이드/검증 문항이 위치
  assert.match(s1Html, /테스트 과제 설정/);
  assert.match(s1Html, /card-main-product/);
  assert.match(s1Html, /input-product-web-url/);
  assert.match(s1Html, /input-test-guide/);
  assert.match(s1Html, /questions-list/);

  // s2에는 기본 정보(썸네일, 제목, 서비스명, 설명, 유의사항)가 위치
  assert.match(s2Html, /기본 정보 입력/);
  assert.match(s2Html, /input-test-title/);
  assert.match(s2Html, /input-service-name/);
  assert.match(s2Html, /input-service-desc/);
  assert.match(s2Html, /input-test-notice/);
});

test('상단 헤더와 스텝 하단에 임시저장 버튼 및 상태 뱃지가 배치된다', () => {
  assert.match(html, /id="project-draft-status-badge"/);
  assert.match(html, /id="btn-save-project-draft-top"/);
  assert.match(html, /id="project-draft-banner"/);
  assert.match(html, /handleRestoreDraftClick\(\)/);
  assert.match(html, /handleDiscardDraftClick\(\)/);
  assert.match(html, /handleSaveDraftClick\(\)/);
});

test('dataService에 프로젝트 임시저장 관련 함수가 정의되어 있다', () => {
  assert.equal(typeof dataService.fetchProjectDraft, 'function');
  assert.equal(typeof dataService.saveProjectDraft, 'function');
  assert.equal(typeof dataService.deleteProjectDraft, 'function');
});

test('게시 완료 시 임시저장 데이터가 자동 정리된다', () => {
  assert.match(html, /clearProjectCreationDraft/);
});
