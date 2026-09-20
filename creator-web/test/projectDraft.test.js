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

test('STEP 01 내부 섹션 순서가 1.대분류 → 2.검증항목 → 3.성실참여 → 4.로그인 → 5.가이드 순서로 배치된다', () => {
  const s1Idx = html.indexOf('id="form-section-1"');
  const s2Idx = html.indexOf('id="form-section-2"');
  const s1Html = html.slice(s1Idx, s2Idx);

  const idxCategory = s1Html.indexOf('1. 테스트 대분류 선택');
  const idxQuestions = s1Html.indexOf('2. 검증항목 작성');
  const idxHonesty = s1Html.indexOf('3. 성실 참여 검증 방식');
  const idxLogin = s1Html.indexOf('4. 로그인 필요 여부 및 개인정보 명시');
  const idxGuide = s1Html.indexOf('5. 테스트 진행 방법(가이드) 필수');

  assert.ok(idxCategory > 0, '1. 대분류 선택 섹션 존재');
  assert.ok(idxQuestions > idxCategory, '2. 검증항목 작성이 대분류 뒤에 위치');
  assert.ok(idxHonesty > idxQuestions, '3. 성실 참여 검증 방식이 검증항목 뒤에 위치');
  assert.ok(idxLogin > idxHonesty, '4. 로그인 필요 여부가 성실참여 검증 뒤에 위치');
  assert.ok(idxGuide > idxLogin, '5. 테스트 진행 방법(가이드)이 로그인 뒤에 위치');

  // 검증항목 섹션 wrapper ID 확인
  assert.match(s1Html, /id="section-questions-container"/);
});

test('STEP 02에 동적 제어용 요소 ID가 선언되어 있다', () => {
  const s2Idx = html.indexOf('id="form-section-2"');
  const s3Idx = html.indexOf('id="form-section-3"');
  const s2Html = html.slice(s2Idx, s3Idx);

  assert.match(s2Html, /id="label-test-title"/);
  assert.match(s2Html, /id="field-service-name-box"/);
  assert.match(s2Html, /id="field-service-desc-box"/);
  assert.match(s2Html, /id="label-test-notice"/);
});

test('유형에 따라 검증항목 및 STEP 02 서비스명/소개 필드가 동적으로 제어된다', () => {
  // actions.js 내 handleMainCategoryChange 로직 검증
  assert.match(html, /questionsSection\.style\.display = \(cat === 'vote'\) \? 'none' : 'flex'/);
  assert.match(html, /fieldServiceNameBox\.style\.display = 'none'/);
  assert.match(html, /fieldServiceDescBox\.style\.display = 'none'/);
  assert.match(html, /labelTestTitle\.innerHTML = '투표 제목/);
  assert.match(html, /labelTestTitle\.innerHTML = '설문 제목/);
  assert.match(html, /labelTestTitle\.innerHTML = '테스트 제목/);
});
test('투표 서브폼에서 질문 입력 칸이 이미지 등록 칸보다 위에 배치된다', () => {
  const voteSubIdx = html.indexOf('id="sub-form-vote"');
  assert.ok(voteSubIdx > 0, 'sub-form-vote가 존재해야 함');

  const voteHtml = html.slice(voteSubIdx, html.indexOf('id="section-questions-container"'));
  const qIdx = voteHtml.indexOf('id="vote-questions-list"');
  const imgIdx = voteHtml.indexOf('id="vote-image-input-container"');

  assert.ok(qIdx > 0, '질문 리스트가 존재해야 함');
  assert.ok(imgIdx > 0, '이미지 등록 컨테이너가 존재해야 함');
  assert.ok(qIdx < imgIdx, '질문 입력 칸이 이미지 등록 칸보다 위에 위치해야 함');
});

test('투표 선택 시 검증항목이 숨겨지며 섹션 번호가 2.성실참여, 3.로그인, 4.가이드로 동적 변경된다', () => {
  assert.match(html, /id="label-section-verification"/);
  assert.match(html, /id="label-section-login"/);
  assert.match(html, /id="label-section-guide"/);

  // actions.js 내 동적 변경 로직 검증
  assert.match(html, /labelVerification\.innerHTML = '2\. 성실 참여 검증 방식/);
  assert.match(html, /labelLogin\.innerHTML = '3\. 로그인 필요 여부 및 개인정보 명시/);
  assert.match(html, /labelGuide\.innerHTML = '4\. 테스트 진행 방법 \(가이드\)/);
  assert.match(html, /labelVerification\.innerHTML = '3\. 성실 참여 검증 방식/);
  assert.match(html, /labelLogin\.innerHTML = '4\. 로그인 필요 여부 및 개인정보 명시/);
  assert.match(html, /labelGuide\.innerHTML = '5\. 테스트 진행 방법 \(가이드\)/);
});
