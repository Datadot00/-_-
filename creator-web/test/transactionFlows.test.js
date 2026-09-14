import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  COIN_TRANSACTION_COLUMNS,
  MARKETPLACE_ITEM_COLUMNS,
  prepareReviewRpcPayload,
  sanitizeUserProfileUpdates
} from '../src/dataService.js';

test('프로젝트 등록 헤더는 불필요한 로그인 및 회원가입 버튼을 노출하지 않는다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const createViewStart = html.indexOf('id="view-create"');
  const createViewEnd = html.indexOf('id="view-post"', createViewStart);
  const createView = html.slice(createViewStart, createViewEnd);

  assert.ok(createViewStart >= 0 && createViewEnd > createViewStart);
  assert.doesNotMatch(createView, />\s*Login\s*</);
  assert.doesNotMatch(createView, />\s*Sign Up\s*</);
});

test('리뷰 RPC payload는 사용자와 리워드 값을 받지 않고 서버 입력만 구성한다', () => {
  const payload = prepareReviewRpcPayload({
    projectId: '11111111-1111-1111-1111-111111111111',
    rating: 4,
    reuseIntention: false,
    answers: { review_text: '좋았습니다.' },
    quizAnswers: { quiz_1: 'A' },
    rewardAmount: 999999,
    userId: '22222222-2222-2222-2222-222222222222'
  });

  assert.deepEqual(payload, {
    p_project_id: '11111111-1111-1111-1111-111111111111',
    p_rating: 4,
    p_reuse_intention: false,
    p_answers: { review_text: '좋았습니다.' },
    p_quiz_answers: { quiz_1: 'A' },
    p_is_quiz_passed: true,
    p_screenshot_url: null
  });
  assert.equal('rewardAmount' in payload, false);
  assert.equal('userId' in payload, false);
});

test('리뷰 payload는 잘못된 프로젝트와 별점을 거부한다', () => {
  assert.throws(() => prepareReviewRpcPayload({ projectId: 'not-uuid', rating: 5 }), /프로젝트 ID/);
  assert.throws(
    () => prepareReviewRpcPayload({ projectId: '11111111-1111-1111-1111-111111111111', rating: 6 }),
    /별점/
  );
});

test('제작자에게 궁금한 점 문항은 선택 사항이며 빈 내용으로도 리뷰를 제출할 수 있다', () => {
  const payload = prepareReviewRpcPayload({
    projectId: '11111111-1111-1111-1111-111111111111',
    rating: 5,
    answers: { review_text: '' }
  });
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.deepEqual(payload.p_answers, { review_text: '' });
  assert.match(html, /제작자에게 궁금한 점 <span[^>]*>\(선택\)<\/span>/);
  assert.doesNotMatch(html, /if\s*\(!reviewText\)/);
  assert.doesNotMatch(html, /제작자에게 궁금한 점 <span class="text-red-500">\*<\/span>/);
  // 옛 워딩이 되살아나지 않는다.
  assert.doesNotMatch(html, /사용 후기 및 버그\/개선점 서술/);
  assert.doesNotMatch(html, /별도의 서술형 후기는 작성하지 않았습니다/);
});

test('클라이언트 프로필 수정으로 등록 자격을 조작할 수 없다', () => {
  assert.deepEqual(sanitizeUserProfileUpdates({ nickname: '테스터', has_passed_gating: true }), { nickname: '테스터' });
});

test('코인 원장은 원인 참조를 포함하고 상점 컬럼은 서버 가격을 사용한다', () => {
  assert.equal(COIN_TRANSACTION_COLUMNS.includes('reference_type'), true);
  assert.equal(COIN_TRANSACTION_COLUMNS.includes('reference_id'), true);
  assert.equal(MARKETPLACE_ITEM_COLUMNS.includes('price_coins'), true);
  assert.equal(MARKETPLACE_ITEM_COLUMNS.split(',').includes('price_coin'), false);
});

test('데이터 서비스 쓰기는 트랜잭션 RPC만 호출한다', () => {
  const source = readFileSync(new URL('../src/dataService.js', import.meta.url), 'utf8');
  assert.match(source, /rpc\('apply_to_project'/);
  assert.match(source, /rpc\('submit_project_review'/);
  assert.match(source, /rpc\('exchange_marketplace_item'/);
  assert.doesNotMatch(source, /from\('coin_transactions'\)\s*\.insert/);
  assert.doesNotMatch(source, /from\('marketplace_exchanges'\)\s*\.insert/);
});

test('미션 참여와 서비스 공개 URL 구경 동선을 분리한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const publicPreviewFlow = html.match(/function openPublicServiceUrl\(\)[\s\S]*?\n    \}/)?.[0] || '';
  const participationFlow = html.match(/async function confirmParticipationAndProceed\(\)[\s\S]*?\n    \}/)?.[0] || '';

  assert.match(html, /id="btn-participate-test" onclick="startMissionParticipation\(\)"/);
  assert.match(html, /function startMissionParticipation\(\)[\s\S]*openTestParticipateModal/);
  assert.match(html, /id="post-mission-card-btn" onclick="openPublicServiceUrl\(\)"/);
  assert.match(html, /서비스 공개 URL/);
  assert.match(html, /서비스 구경용 · 참여 등록 안 됨/);
  assert.match(html, /function getProjectPublicUrl\(projectId = currentPostId\)/);
  assert.match(html, /function getProjectMissionUrl\(projectId = currentPostId\)/);
  assert.doesNotMatch(publicPreviewFlow, /ensureDatabaseParticipation/);
  assert.match(participationFlow, /ensureDatabaseParticipation\(pId\)/);
  assert.match(participationFlow, /const missionUrl = getProjectMissionUrl\(pId\)/);
  assert.match(participationFlow, /pendingMissionWindow\.location\.replace\(missionUrl\)/);
});

test('참여 후 미작성 리뷰는 내 프로젝트와 상세 화면에서 다시 이어 쓸 수 있다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const feedbackRenderer = html.match(/function renderFeedbackFormByTestType\(testType, container, dbProj = null\)[\s\S]*?\n    \}/)?.[0] || '';

  assert.match(html, /내 프로젝트 &gt; 참여 프로젝트 관리/);
  assert.match(html, /function resumeProjectReview\(projectId\)[\s\S]*openFeedbackWriteModal\(projectId\)/);
  assert.match(html, /onclick="deferParticipationReview\(\)"[\s\S]{0,200}나중에 작성하기/);
  assert.match(html, /onclick="deferFeedbackReview\(\)"[\s\S]{0,200}나중에 작성하기/);
  assert.match(html, /리뷰 작성하러 가기/);
  assert.match(html, /리뷰 작성 필요/);
  assert.match(html, /리뷰 대기 \$\{pendingCount\}/);
  assert.match(html, /function sortParticipatedProjectsByReviewState\(projects = \[\]\)/);
  assert.match(html, /Number\(isParticipationCompleted\(first\)\) - Number\(isParticipationCompleted\(second\)\)/);
  assert.match(html, /id="myproj-participated-review-tabs"/);
  assert.match(html, /id="myproj-review-tab-pending"[\s\S]{0,400}리뷰 작성 대기/);
  assert.match(html, /id="myproj-review-tab-completed"[\s\S]{0,400}완료 프로젝트/);
  assert.match(html, /function switchParticipatedReviewTab\(tabKey\)/);
  assert.match(html, /currentParticipatedReviewTab === 'pending'[\s\S]{0,100}!isParticipationCompleted\(project\)/);
  assert.match(html, /currentParticipatedReviewTab === 'pending'[\s\S]{0,180}isParticipationCompleted\(project\)/);
  assert.match(html, /setDetailParticipationCta\(participationWasCompleted \? 'completed' : 'review-needed', pId, rewardVal\)/);
  assert.match(html, /checkUserParticipation\(test\.id, activeUserId\)/);
  assert.match(html, /participation_status:\s*'submitted'/);
  assert.match(feedbackRenderer, /const isQuizVerification = currentFeedbackVerificationMethod === 'quiz'/);
  assert.match(feedbackRenderer, /const isScreenshotVerification = currentFeedbackVerificationMethod === 'screenshot'/);
  assert.ok(
    feedbackRenderer.indexOf('const isQuizVerification') < feedbackRenderer.indexOf('const quizzesList = isQuizVerification'),
    '검증 방식 변수는 리뷰 모달 템플릿에서 사용하기 전에 선언되어야 합니다.'
  );
  assert.match(html, /let currentFeedbackVerificationMethod = 'none'/);
  assert.match(html, /function handleFeedbackScreenshotSelected\(input\)/);
  assert.match(html, /screenshotUrl: currentFeedbackVerificationMethod === 'screenshot' \? feedbackScreenshotDataUrl : null/);
});

test("'이전으로'는 홈이 아니라 직전 화면으로 돌아간다", () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 상세 페이지는 피드 외에 내 프로젝트·알림에서도 들어오므로 항상 홈으로 보내면 안 된다.
  const backButton = html.match(/<button onclick="navigate[^"]*"[\s\S]{0,400}?← 이전으로/)?.[0] || '';
  assert.notEqual(backButton, '', '이전으로 버튼을 찾지 못했습니다.');
  assert.match(backButton, /onclick="navigateBack\('explore'\)"/);
  assert.doesNotMatch(backButton, /onclick="navigateTo\(/);
  assert.doesNotMatch(html, /메인 피드로 돌아가기/);

  // 화면 이력 스택이 있어야 직전 화면을 알 수 있다.
  assert.match(html, /const VIEW_HISTORY_LIMIT = 20;/);
  assert.match(html, /const viewHistory = \[\];/);
  assert.match(html, /function navigateTo\(viewKey, \{ preserveProjectEdit = false, isBack = false \} = \{\}\)/);
  assert.match(html, /if \(!isBack && currentViewKey && currentViewKey !== viewKey\) \{[\s\S]{0,160}viewHistory\.push\(currentViewKey\)/);
  assert.match(html, /viewHistory\.length > VIEW_HISTORY_LIMIT\) viewHistory\.shift\(\)/);
  // currentViewKey는 선언만 되고 갱신되지 않던 값이었다. 이제 이동마다 갱신된다.
  assert.match(html, /currentViewKey = viewKey;/);

  // 되돌아갈 이력이 없으면 폴백 화면으로 보낸다.
  const navigateBack = html.match(/function navigateBack\(fallbackViewKey = 'explore'\)[\s\S]*?\n    \}/)?.[0] || '';
  assert.notEqual(navigateBack, '');
  assert.match(navigateBack, /navigateTo\(previousViewKey, \{ isBack: true \}\)/);
  assert.match(navigateBack, /navigateTo\(fallbackViewKey, \{ isBack: true \}\)/);
});

test('쓰지 않는 전체화면 A/B 투표 뷰와 가짜 제출 경로는 제거되어 있다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 화면·전용 함수·상태값이 모두 사라져야 한다.
  assert.doesNotMatch(html, /view-abtest/);
  assert.doesNotMatch(html, /renderFullPageInternalTestScreen|openAbTest|submitAbVote/);
  assert.doesNotMatch(html, /selectAbOption|resetAbSelection|updateAbCharCount/);
  assert.doesNotMatch(html, /currentAbMode|selectedAbOption|currentBlindVariant/);

  // 화면 레지스트리와 개발용 전환 패널에서도 빠져야 한다.
  assert.doesNotMatch(html, /'abtest': \{ title:/);
  assert.doesNotMatch(html, /data-view-btn="abtest"/);

  // 알림으로 들어오던 SaaS 경로는 실제 상세 페이지로 간다.
  assert.match(html, /openPostDetail\('saas'\);/);

  // 리워드가 실제로 적립되는 경로는 리뷰 RPC 하나만 남는다.
  assert.match(html, /submitProjectReview\(\{/);
});

test('상세 우측 참여 패널은 스크롤을 따라오는 sticky로 고정된다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  const panel = html.match(/<div id="post-sidebar-panel"[\s\S]{0,400}?>/)?.[0] || '';
  assert.notEqual(panel, '', '우측 패널 컨테이너를 찾지 못했습니다.');

  // 데스크톱에서만 고정하고, 모바일 1단 레이아웃에서는 그대로 흐르게 둔다.
  assert.match(panel, /lg:sticky/);
  assert.doesNotMatch(panel, /(^|\s)sticky/);
  // grid 항목 기본값 stretch면 sticky가 움직일 여지가 없으므로 self-start가 필요하다.
  assert.match(panel, /lg:self-start/);
  // sticky 상단 헤더(h-20)를 피하는 오프셋
  assert.match(panel, /lg:top-24/);
  // 패널이 화면보다 길어도 아래쪽이 잘리지 않도록 내부 스크롤을 허용한다.
  assert.match(panel, /lg:max-h-\[calc\(100vh-7rem\)\]/);
  assert.match(panel, /lg:overflow-y-auto/);

  // sticky는 스크롤 조상이 생기면 깨지므로, 패널과 페이지 그리드 사이에 overflow 컨테이너가 없어야 한다.
  const gridOpen = html.indexOf('<div class="grid grid-cols-1 lg:grid-cols-3 gap-7">');
  assert.notEqual(gridOpen, -1);
  const between = html.slice(gridOpen, html.indexOf('<div id="post-sidebar-panel"'));
  const leftColumn = between.match(/<div class="lg:col-span-2 space-y-6">/)?.[0] || '';
  assert.notEqual(leftColumn, '', '좌측 컬럼 구조가 바뀌었습니다.');
});

test('테스트 미션 탭은 URL을 노출하지 않고 구경하기 버튼으로만 외부로 나간다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // URL 표시 줄과 그 앵커는 완전히 제거되어야 한다.
  assert.doesNotMatch(html, /post-mission-url-row/);
  assert.doesNotMatch(html, /post-external-url-link/);
  assert.doesNotMatch(html, /post-external-url-text/);

  // 미션 탭 마크업 안에는 어떤 주소도 남지 않는다.
  const missionTab = html.slice(html.indexOf('id="tab-content-mission"'), html.indexOf('id="tab-content-reviews"'));
  assert.doesNotMatch(missionTab, /https?:\/\//);
  assert.doesNotMatch(missionTab, /try-money-pig/);

  // 카드는 공통 헬퍼가 채우고, 외부 이동은 버튼 클릭 한 경로만 남는다.
  assert.match(html, /function setMissionPreviewCard\(publicUrl, \{ projectId = currentPostId, serviceName = '' \} = \{\}\)/);
  assert.match(html, /setMissionPreviewCard\(getProjectPublicUrl\(test\.id\), \{[\s\S]{0,120}serviceName: test\.service_name \|\| test\.title/);
  assert.match(html, /setMissionPreviewCard\(getProjectPublicUrl\(postId\), \{ projectId: postId \}\)/);
  assert.match(html, /missionCardBtn\.onclick = hasPublicUrl \? \(\) => openPublicServiceUrl\(projectId\) : null/);

  // URL이 제목처럼 크게 보이던 자리에는 서비스명이 대신 들어간다.
  assert.match(html, /<span class="text-xs font-bold text-neutral-500">서비스명:<\/span>/);
  assert.match(html, /id="post-mission-service-name" class="text-sm font-extrabold text-\[#2F6517\]"/);
  assert.match(html, /function resolveMissionServiceName\(projectId = currentPostId, explicitName = ''\)/);
  assert.match(html, /missionServiceName\.textContent = displayName/);
  assert.match(html, /missionServiceRow\.classList\.toggle\('hidden', !displayName\)/);
  // 서비스명 줄은 링크가 아니어야 한다.
  assert.doesNotMatch(html, /id="post-mission-service-name"[^>]*href=/);

  // 검증 항목 체크리스트도 주소 대신 버튼을 안내한다.
  assert.match(html, /위 \[서비스 구경하기\] 버튼으로 서비스에 접속해 주요 기능을 검증해 주세요\./);
  assert.doesNotMatch(html, /서비스 주소\(<a href=/);

  // 옛 버튼 문구가 되살아나지 않는다.
  assert.doesNotMatch(html, /외부 접속 및 참여하기/);
  assert.doesNotMatch(html, /스토어에서 구경하기|스토어 구경하기|스토어 구경용/);
  assert.match(html, /missionCardBtnText\.textContent = hasPublicUrl[\s\S]{0,80}'↗ 서비스 구경하기'/);

  // 미션 탭에서 외부로 나가는 조작은 구경하기 버튼 하나뿐이다.
  assert.equal((missionTab.match(/<button/g) || []).length, 3, '미션 탭 버튼은 구경하기 1개 + 계정 복사 2개여야 합니다.');
  assert.equal((missionTab.match(/openPublicServiceUrl/g) || []).length, 1);

  // 구경하기는 보조 동작이므로 primary 초록은 사이드바 참여 CTA에만 남긴다.
  const missionBtn = missionTab.match(/<button[^>]*id="post-mission-card-btn"[\s\S]*?>/)?.[0] || '';
  assert.notEqual(missionBtn, '');
  assert.doesNotMatch(missionBtn, /bg-\[#2F6517\] hover:bg-\[#25500F\]/);
  assert.match(missionBtn, /bg-white border-2 border-\[#2F6517\] text-\[#2F6517\]/);
  assert.equal((missionTab.match(/bg-\[#2F6517\] hover:bg-\[#25500F\]/g) || []).length, 0);
});

test('상세 CTA는 최초 미션 참여하기에서 리뷰 완료 후 서비스 구경하기로 전환된다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 최초 1회는 "미션 참여하기"가 활성화된 상태로 노출된다.
  assert.match(html, /<span id="btn-participate-test-text">미션 참여하기<\/span>/);
  assert.match(html, /ctaBtn\.onclick = startMissionParticipation;[\s\S]*ctaText\.textContent = '미션 참여하기'/);
  assert.doesNotMatch(html, /ctaText\.textContent = '참여하기'/);
  assert.doesNotMatch(html, /ctaBtnText\.textContent = '참여하기'/);

  // 리뷰까지 마치면 공개 URL을 여는 "서비스 구경하기"로 바뀐다.
  assert.match(html, /if \(state === 'completed'\)[\s\S]*const publicUrl = getProjectPublicUrl\(projectId\)/);
  assert.match(html, /ctaBtn\.onclick = \(\) => openPublicServiceUrl\(projectId\)/);
  assert.match(html, /ctaText\.textContent = '서비스 구경하기'/);
  assert.doesNotMatch(html, /스토어에서 구경하기|스토어 구경하기/);
  // 공개 URL이 없으면 둘러볼 곳이 없으므로 완료 상태 그대로 비활성화한다.
  assert.match(html, /ctaText\.textContent = '참여완료 · 리뷰 제출 완료'/);

  // 리뷰 저장이 끝나는 즉시 상세 CTA가 갱신되어야 한다.
  assert.match(html, /updatePendingReviewBadge\(\);[\s\S]{0,160}setDetailParticipationCta\('completed', projectId, reward\)/);
  // 안내 문구도 CTA 상태 한 곳에서 함께 관리한다.
  assert.match(html, /function setDetailParticipationNotice\(state\)/);
  assert.match(html, /setDetailParticipationNotice\(state\);/);
});

test('결과 및 피드백 리포트도 검증 문항 질문·답변을 모두 노출한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 리포트 카드도 상세 리뷰 탭과 같은 해석·렌더 헬퍼를 쓴다.
  assert.match(html, /const parsedAnswers = parseReviewAnswers\(r\.answers\);/);
  assert.match(html, /📋 검증 문항 응답/);
  assert.match(html, /\$\{renderReviewAnswerItems\(parsedAnswers\.items\)\}/);
  assert.match(html, /const reportSummaryHtml = renderReviewAnswerSummary\(reviews\);/);
  assert.match(html, /fbContainer\.innerHTML = reportSummaryHtml \+ reviews\.map/);

  // 값이 문자열이면 아무거나 집어오던 폴백은 문항 답변과 중복되므로 없어야 한다.
  assert.doesNotMatch(html, /Object\.values\(answers\)\.find/);

  // 프로젝트를 특정하지 않고 들어오면 더미 헤더 대신 실제 프로젝트나 빈 상태를 보여준다.
  assert.match(html, /async function openLatestFeedbackReport\(\)/);
  assert.match(html, /const target = registered\.find\(project => isDatabaseProjectId\(project\?\.id\)\);/);
  assert.match(html, /아직 등록한 테스트가 없습니다/);
  assert.match(html, /function handleToastClick\(\)[\s\S]{0,120}openLatestFeedbackReport\(\)/);
});

test('리뷰 탭은 서술형 한 덩어리 대신 문항별 답변과 응답 분포를 보여준다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 저장: 문항별로 질문과 함께 구조화해 담는다.
  assert.match(html, /data-feedback-question="\$\{escapeHtml\(String\(titleText\)\)\}"/);
  assert.match(html, /data-feedback-kind="essay"/);
  assert.match(html, /data-feedback-kind="\$\{isMultiChoice \? 'multiple' : 'single'\}"/);
  // 선택지 값은 인덱스가 아니라 실제 문구여야 집계가 읽힌다.
  assert.match(html, /value="\$\{escapeHtml\(String\(cText\)\)\}"/);
  assert.doesNotMatch(html, /value="opt\$\{cIdx \+ 1\}"/);
  assert.match(html, /question_answers: questionAnswers/);
  // 총평 textarea 는 문항 답변과 섞이지 않는다.
  assert.match(html, /\.filter\(field => !field\.hasAttribute\('data-feedback-question'\)\)/);

  // 표시: 해석·집계·렌더가 분리되어 있다.
  assert.match(html, /function parseReviewAnswers\(rawAnswers\)/);
  assert.match(html, /function buildReviewAnswerSummary\(reviews\)/);
  assert.match(html, /function renderReviewAnswerSummary\(reviews\)/);
  assert.match(html, /function renderReviewAnswerItems\(items\)/);
  assert.match(html, /검증 문항 응답 분포/);
  assert.match(html, /const answerSummaryHtml = renderReviewAnswerSummary\(reviews\);/);
  assert.match(html, /renderReviewAnswerItems\(parsedAnswers\.items\)/);

  // 값이 무엇이든 문자열이면 긁어 붙이던 폴백은 중복 노출을 만들므로 없어야 한다.
  assert.doesNotMatch(html, /Object\.values\(r\.answers\)\.filter/);
});

test('내부 미션 화면은 데모 문구 대신 등록된 프로젝트 문항과 시안을 렌더링한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 참여 모달에만 있던 하드코딩 데모 투표 마크업은 사라져야 한다.
  assert.doesNotMatch(html, /Option A 선택하기/);
  assert.doesNotMatch(html, /350P 투표 즉시 적립/);

  // 내부 미션 화면은 실제 프로젝트 데이터로 구성된다.
  assert.match(html, /renderInternalMissionFlow\(project, rewardVal\)/);
  assert.match(html, /function parseProjectQuestions\(project\)/);
  assert.match(html, /function getInternalVoteOptions\(project\)[\s\S]*ab_url_a[\s\S]*ab_url_b/);
  assert.match(html, /function renderInternalQuestionCard\(question, index\)/);
  assert.match(html, /project\?\.category === 'vote' \|\| project\?\.mainCategory === 'vote'/);

  // 투표 미션은 시안을 고르기 전에는 제출할 수 없고, 응답은 리뷰 payload로 이어진다.
  assert.match(html, /if \(dynamicContent\?\.querySelector\(.#opt-card-A.\) && !selectedInternalVoteOption\)/);
  assert.match(html, /function collectInternalMissionAnswers\(\)/);
  assert.match(html, /internalMissionAnswers\?\.projectId === String\(projectId\) \? internalMissionAnswers\.data : \{\}/);
});

test('5단계 마이그레이션은 직접 쓰기를 차단하고 원자적 함수를 선언한다', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20260910122642_stage_5_transactional_participation_review_shop.sql', import.meta.url),
    'utf8'
  );
  assert.match(sql, /create or replace function public\.apply_to_project/i);
  assert.match(sql, /create or replace function public\.submit_project_review/i);
  assert.match(sql, /create or replace function public\.exchange_marketplace_item/i);
  assert.match(sql, /revoke all privileges on table public\.participations from authenticated/i);
  assert.match(sql, /revoke update \(has_passed_gating\)/i);
  assert.match(sql, /for update/i);
});

test('리뷰 작성 시 필수 검증 퀴즈를 입력하지 않거나 오답일 경우 제출 및 코인 지급이 차단된다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  // 1. 퀴즈 검증 상태 변수와 렌더링에 필수 표기(*) 및 데이터 속성이 포함되어 있어야 함
  assert.match(html, /let currentFeedbackProjectQuizzes = \[\];/);
  assert.match(html, /data-quiz-expected=/);
  assert.match(html, /정답 확인 \(필수\)/);

  // 2. submitDetailedFeedback에서 퀴즈 답변 미입력 시 PART-004 에러와 함께 조기 반환(return)되어야 함
  assert.match(html, /const isQuizVerificationActive = currentFeedbackVerificationMethod === 'quiz'/);
  assert.match(html, /if \(!val\) \{[\s\S]*?showGenericToast\(`\[PART-004\][\s\S]*?return;/);

  // 3. 정답이 지정된 경우 정답 불일치 시 PART-004 에러와 함께 조기 반환되어 코인 지급 함수 호출이 차단되어야 함
  assert.match(html, /if \(normalizeQuizText\(val\) !== normalizeQuizText\(expected\)\) \{[\s\S]*?showGenericToast\('\[PART-004\][\s\S]*?return;/);
  assert.match(html, /input\.classList\.add\('border-red-500', 'ring-2', 'ring-red-200'\)/);

  // 4. 모든 검증을 통과한 경우에만 submitProjectReview를 호출
  assert.match(html, /const result = await window\.donDwaeDataService\.submitProjectReview/);
});

