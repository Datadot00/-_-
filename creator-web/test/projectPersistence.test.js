import { readAppSource, readRuntimeFunction } from './support/readAppHtml.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  getVoteImageStoragePath,
  normalizeHttpUrl,
  prepareProjectLoginConfiguration,
  prepareProjectPayload,
  prepareProjectTagList,
  prepareProjectVerification,
  PROJECT_PUBLIC_COLUMNS,
  validateVoteImageFile,
  validateVoteImageFileContent,
  VOTE_IMAGE_BUCKET,
  VOTE_IMAGE_MAX_BYTES
} from '../src/shared/data/dataService.js';

test('normalizes a schemeless service URL to HTTPS', () => {
  assert.equal(normalizeHttpUrl('  example.com/path  '), 'https://example.com/path');
});

test('keeps HTTPS URLs and converts empty optional URLs to null', () => {
  assert.equal(normalizeHttpUrl('https://example.com/test?q=1'), 'https://example.com/test?q=1');
  assert.equal(normalizeHttpUrl('   '), null);
});

test('rejects unsafe URL schemes and embedded credentials', () => {
  assert.throws(() => normalizeHttpUrl('javascript:alert(1)'), /http:\/\/ 또는 https:\/\//);
  assert.throws(() => normalizeHttpUrl('https://user:password@example.com'), /올바른 URL/);
});

test('requires a URL when requested', () => {
  assert.throws(() => normalizeHttpUrl('', { required: true }), /서비스 URL/);
});

test('prepares a safe project insert payload and normalizes every URL field', () => {
  const payload = prepareProjectPayload({
    creator_id: 'creator-id',
    title: '  테스트 프로젝트  ',
    service_name: '  테스트 서비스  ',
    service_desc: '  설명  ',
    service_url: 'example.com',
    ab_url_a: '',
    app_playstore_url: 'https://play.google.com/store/apps/details?id=test',
    current_count: 999,
    created_at: '2000-01-01'
  });

  assert.equal(payload.title, '테스트 프로젝트');
  assert.equal(payload.service_name, '테스트 서비스');
  assert.equal(payload.service_url, 'https://example.com/');
  assert.equal(payload.ab_url_a, null);
  assert.equal(payload.current_count, undefined);
  assert.equal(payload.created_at, undefined);
});

test('project edits cannot change ownership, counters, or the immutable service URL', () => {
  const payload = prepareProjectPayload({
    title: '수정된 제목',
    creator_id: 'other-user',
    current_count: 200,
    service_url: 'https://changed.example.com'
  }, { forUpdate: true });

  assert.deepEqual(payload, { title: '수정된 제목' });
});

test('로그인 불필요 설정은 관련 필드를 항상 null로 정규화한다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: false,
    testAccountId: 'leftover-user',
    testAccountPassword: 'leftover-password',
    privacyItems: '이메일'
  }), {
    login_required: false,
    test_account_id: null,
    test_account_pw: null,
    privacy_items: null
  });
});

test('신규 로그인 필수 프로젝트에서 테스트 계정 ID, 비밀번호는 선택사항이며 공백일 때 null로 정규화한다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: true,
    privacyItems: '이메일'
  }), {
    login_required: true,
    privacy_items: '이메일',
    test_account_id: null,
    test_account_pw: null
  });
});

test('신규 로그인 필수 프로젝트에서 테스트 계정 ID와 비밀번호가 제공되면 정상 포함된다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: true,
    testAccountId: 'test-user',
    testAccountPassword: 'test-password',
    privacyItems: '이메일'
  }), {
    login_required: true,
    privacy_items: '이메일',
    test_account_id: 'test-user',
    test_account_pw: 'test-password'
  });
});

test('신규 등록 시에도 ID와 비밀번호 중 하나만 입력할 수 없다', () => {
  assert.throws(() => prepareProjectLoginConfiguration({
    loginRequired: true,
    testAccountId: 'new-user',
    privacyItems: '이메일'
  }), /ID와 비밀번호를 모두 입력/);
});

test('기존 로그인 필수 프로젝트 수정은 빈 계정 필드를 생략해 저장값을 보존한다', () => {
  assert.deepEqual(prepareProjectLoginConfiguration({
    loginRequired: true,
    privacyItems: '이메일',
    preserveExistingCredentials: true
  }), {
    login_required: true,
    privacy_items: '이메일'
  });
});

test('기존 계정을 변경할 때 ID와 비밀번호 중 하나만 입력할 수 없다', () => {
  assert.throws(() => prepareProjectLoginConfiguration({
    loginRequired: true,
    testAccountId: 'new-user',
    privacyItems: '이메일',
    preserveExistingCredentials: true
  }), /ID와 비밀번호를 모두 입력/);
});

test('public project reads include the persisted external survey URL', () => {
  assert.equal(PROJECT_PUBLIC_COLUMNS.split(',').includes('external_survey_url'), true);
});

test('프로젝트 검증 방식은 미선택 가능하며 선택 시 하나만 저장한다', () => {
  assert.deepEqual(prepareProjectVerification('none', [
    { question: '남아 있던 퀴즈', answer: '정답' }
  ]), {
    verification_method: 'none',
    quizzes: []
  });
  assert.deepEqual(prepareProjectVerification(undefined, []), {
    verification_method: 'none',
    quizzes: []
  });
  assert.deepEqual(prepareProjectVerification('screenshot', [
    { question: '사용하지 않을 퀴즈', answer: '정답' }
  ]), {
    verification_method: 'screenshot',
    quizzes: []
  });
  assert.throws(() => prepareProjectVerification('quiz', []), /퀴즈를 최소 1개/);
});

test('개발 환경 태그와 권장 참여 대상 태그는 정리되어 별도 필드로 저장된다', () => {
  assert.deepEqual(
    prepareProjectTagList([' #React ', 'react', 'Supabase', '', ...Array.from({ length: 12 }, (_, index) => `도구${index}`)]),
    ['React', 'Supabase', '도구0', '도구1', '도구2', '도구3', '도구4', '도구5', '도구6', '도구7']
  );

  const payload = prepareProjectPayload({
    creator_id: 'creator-id',
    title: '태그 테스트',
    service_name: '태그 서비스',
    service_desc: '태그 설명',
    tech_tags: ['React', 'Vercel'],
    target_persona_tags: ['20대 직장인', '핀테크 관심자']
  });
  assert.deepEqual(payload.tech_tags, ['React', 'Vercel']);
  assert.deepEqual(payload.target_persona_tags, ['20대 직장인', '핀테크 관심자']);
});

test('모집인원과 보상 하한을 낮추고 서비스 카테고리는 직접 선택하게 한다', () => {
  const html = readAppSource();
  const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');

  // 신규 등록은 모집 1명, 무보상 프로젝트까지 허용한다.
  assert.match(html, /<input id="input-target-count" type="number" value="0" min="1" step="1" required/);
  assert.match(html, /<input id="input-reward-coin" type="number" value="70" min="0" step="1" required/);
  assert.match(html, /targetCountInput\.value = 0;/);
  assert.match(html, /targetCountInput\.min = 1;/);
  assert.match(html, /rewardCoinInput\.min = 0;/);
  assert.doesNotMatch(html, /<input id="input-target-count"[^>]*value="30"/);
  assert.doesNotMatch(html, /if \(target < 30\) target = 30;/);
  assert.doesNotMatch(html, /if \(tCount < 30\) tCount = 30;/);
  assert.match(html, /rewardCoin: dbP\.reward_coin \?\? 500/);
  assert.match(html, /const origReward = Number\(myCreatedTest\?\.rewardCoin \?\? 0\)/);
  assert.match(schema, /target_count > 0 AND current_count >= 0/);
  assert.match(schema, /reward_coin >= 0 AND total_funded_cost >= 0/);

  // 서비스 카테고리는 아무것도 선택하지 않은 상태로 시작한다.
  const categoryBlock = html.slice(html.indexOf('서비스 카테고리 선택'), html.indexOf('name="targetAge"'));
  const categoryInputs = categoryBlock.match(/<input type="checkbox" name="targetInterest"[^>]*>/g) || [];
  assert.equal(categoryInputs.length, 10);
  assert.equal(categoryInputs.filter(input => input.includes('checked')).length, 0);

  // 워딩은 서비스 카테고리로 통일한다.
  assert.match(html, /서비스 카테고리 선택 <span/);
  assert.match(html, /서비스에 해당하는 카테고리를 선택해주세요\./);
  assert.doesNotMatch(html, /관심사 카테고리/);
});

test('모집 시작일은 오늘 이전 날짜를 고를 수 없다', () => {
  const html = readAppSource();

  // 하한은 렌더 시점에 계산해 input.min 으로 건다.
  assert.match(html, /function getTodayDateValue\(\)/);
  assert.match(html, /function applyProjectStartDateLimit\(\)/);
  assert.match(html, /startInput\.min = savedStart && savedStart < today \? savedStart : today;/);

  // 시작일을 바꾸면 종료일 하한도 따라 움직인다.
  assert.match(html, /<input id="input-start-date" type="date" required onchange="applyProjectStartDateLimit\(\)"/);
  assert.match(html, /endInput\.min = startInput\.value \|\| startInput\.min;/);

  // 기본값 설정과 수정 모드 프리필 뒤에도 하한을 다시 세운다.
  assert.match(html, /endInput\.value = formatLocalDate\(defaultEnd\);[\s\S]{0,80}applyProjectStartDateLimit\(\);/);
  assert.match(html, /startDateInput\.value = test\.startDate;[\s\S]{0,80}applyProjectStartDateLimit\(\);/);

  // min 은 직접 입력으로 뚫릴 수 있으므로 3단계 검증에서도 막는다.
  assert.match(html, /const startDateLimit = startDateInput\.min \|\| getTodayDateValue\(\);/);
  assert.match(html, /startDateInput\.value < startDateLimit[\s\S]{0,160}모집 시작일은 오늘 이전 날짜로 지정할 수 없습니다\./);
});

test('does not restore an unscoped project cache across login accounts', () => {
  const html = readAppSource();
  assert.equal(html.includes("localStorage.getItem('don_dwae_my_created_test')"), false);
  assert.equal(html.includes("localStorage.setItem('don_dwae_my_created_test'"), false);
});

test('프로젝트 수정 ID를 세션에 유지하고 ID 기준으로 update 경로를 선택한다', () => {
  const html = readAppSource();

  assert.match(html, /PROJECT_EDIT_SESSION_KEY = 'dondwae_editing_project_id'/);
  assert.match(html, /const editingProjectId = getActiveProjectEditId\(\)/);
  assert.match(html, /const wasEditing = Boolean\(editingProjectId\)/);
  assert.match(html, /navigateTo\('create', \{ preserveProjectEdit: true \}\)/);
  assert.match(html, /updateProjectRecord\(editingProjectId, dbPayload\)/);
});

test('신규 프로젝트 등록은 이전 작성값과 수정 대상을 모두 초기화한다', () => {
  const html = readAppSource();
  const resetSource = readRuntimeFunction('resetCreateProjectForm');
  const createViewStart = html.indexOf('id="view-create"');
  const createViewEnd = html.indexOf('id="view-post"', createViewStart);
  const createView = html.slice(createViewStart, createViewEnd);

  assert.match(resetSource, /clearProjectEditContext\(\)/);
  assert.match(resetSource, /querySelectorAll\('input, textarea, select'\)/);
  assert.match(resetSource, /questionsList\.innerHTML = ''[\s\S]*addQuestionItem\(\)/);
  assert.match(resetSource, /quizList\.innerHTML = ''[\s\S]*addQuizQuestionItem\(\)/);
  assert.match(resetSource, /initializeProjectDateDefaults\(\{ force: true \}\)/);
  assert.match(resetSource, /toggleProductAbMode\(false\)/);
  assert.match(resetSource, /toggleMissionFormatMode\('direct'\)/);
  assert.match(resetSource, /setVerificationMethod\('none'\)/);
  assert.match(html, /if \(!preserveProjectEdit\) \{\s*resetCreateProjectForm\(\)/);
  assert.doesNotMatch(createView, /value="https:\/\/try-money-pig\.io"/);
  assert.doesNotMatch(createView, /value="가계부 영수증 촬영 후/);
});

test('단순 설문은 생략 예외가 아닌 설문조사 대분류로 저장한다', () => {
  const html = readAppSource();
  const createViewStart = html.indexOf('id="view-create"');
  const createViewEnd = html.indexOf('id="view-post"', createViewStart);
  const createView = html.slice(createViewStart, createViewEnd);

  assert.match(createView, /id="card-main-survey"/);
  assert.match(createView, /name="mainCategory" value="survey"/);
  assert.match(createView, />설문조사</);
  assert.doesNotMatch(createView, /btn-skip-main-category|대분류 생략/);
  assert.match(html, /currentMainCategory = 'product'; \/\/ 'product' \| 'prototype' \| 'vote' \| 'survey'/);
  assert.match(html, /const surveyMode = document\.querySelector\('input\[name="missionFormatMode"\]:checked'\)/);
  assert.match(html, /category: currentMainCategory \|\| 'product'/);
  assert.match(html, /platform: currentMainCategory === 'survey' \? 'none'/);
  assert.doesNotMatch(html, /currentMainCategory === 'none'|surveySubMode|handleSkipMainCategory/);
});

test('프로덕트와 프로토타입의 웹 접속 안내 문구를 구분한다', () => {
  const html = readAppSource();

  assert.match(html, /id="text-platform-web">🌐 웹사이트 \(Web Site\)</);
  assert.match(html, /cat === 'prototype'[\s\S]{0,80}\? '🌐 웹 \/ Figma Link'[\s\S]{0,80}: '🌐 웹사이트 \(Web Site\)'/);
});

test('프로젝트 등록은 단계별 필수 입력을 완료해야 다음 단계와 게시로 이동한다', () => {
  const html = readAppSource();

  assert.match(html, /function validateCreateStep\(stepNum\)/);
  assert.match(html, /function requestCreateStep\(stepNum\)/);
  assert.match(html, /onclick="requestCreateStep\(2\)"/);
  assert.match(html, /onclick="requestCreateStep\(3\)"/);
  assert.match(html, /if \(!validateCreateStep\(step\)\) return false/);
  assert.match(html, /'input-test-title', (?:titleMessage|'테스트 제목을 입력해 주세요\.')/);
  assert.match(html, /'input-service-desc', '서비스 소개를 입력해 주세요\.'/);
  assert.match(html, /isValidCreateStepUrl\(serviceUrlInput\?\.value\)/);
  assert.match(html, /취급·수집되는 개인정보 항목을 입력해 주세요/);
  assert.match(html, /검증 문항의 질문 내용을 입력해 주세요/);
  assert.match(html, /검증 퀴즈 정답을 입력해 주세요/);
  assert.match(html, /모집 종료일은 시작일보다 빠를 수 없습니다/);
  assert.match(html, /for \(const stepNum of \[1, 2, 3\]\) \{\s*if \(!validateCreateStep\(stepNum\)\) return;/);
});

test('검증 퀴즈와 스크린샷은 배타적인 선택사항이며 기본값은 미선택이다', () => {
  const html = readAppSource();
  const createViewStart = html.indexOf('id="view-create"');
  const createViewEnd = html.indexOf('id="view-post"', createViewStart);
  const createView = html.slice(createViewStart, createViewEnd);

  assert.match(createView, /3\. 성실 참여 검증 방식[\s\S]{0,120}\(선택\)/);
  assert.match(createView, /type="checkbox" name="verificationMethod" value="quiz"/);
  assert.match(createView, /this\.checked \? 'quiz' : 'none'/);
  assert.match(createView, /type="checkbox" name="verificationMethod" value="screenshot"/);
  assert.match(createView, /this\.checked \? 'screenshot' : 'none'/);
  const verificationInputs = createView.match(/<input[^>]*name="verificationMethod"[^>]*>/g) || [];
  assert.equal(verificationInputs.length, 2);
  verificationInputs.forEach((input) => assert.doesNotMatch(input, /\schecked(?:\s|\/?>)/));
  assert.match(html, /let currentVerificationMethod = 'none'/);
  assert.match(html, /currentVerificationMethod = \['quiz', 'screenshot'\]\.includes\(method\) \? method : 'none'/);
});

test('테스트 세부 설정에서 개발 도구와 개발 환경 태그를 별도로 입력한다', () => {
  const html = readAppSource();
  const stepThree = html.slice(html.indexOf('id="form-section-3"'), html.indexOf('id="view-post"'));

  assert.match(stepThree, /개발 도구 \/ 개발 환경/);
  assert.match(stepThree, /id="input-tech-tag"/);
  assert.match(stepThree, /id="tech-tags-container"/);
  assert.match(stepThree, /addTechTag\('React'\)/);
  assert.match(html, /tech_tags: techTags/);
  assert.match(html, /target_persona_tags: personaTags/);
  assert.match(html, /renderProjectTagChips\('tech-tags-container', test\.techTags/);
  assert.match(html, /renderProjectTagChips\('persona-tags-container', test\.personaTags/);
});

test('does not persist the current page URL when no thumbnail was selected', () => {
  const html = readAppSource();
  assert.equal(html.includes("thumbImg.src = '';"), false);
  assert.equal(html.includes("previewImg.src = '';"), false);
  assert.match(html, /thumbnailPreview\.getAttribute\('src'\)/);
  assert.match(html, /onerror="handleBrokenProjectThumbnail\(this\)"/);
});

test('투표 프로젝트는 A/B 이미지 직접 업로드와 URL 입력을 모두 영속화한다', () => {
  const html = readAppSource();

  assert.doesNotMatch(html, /currentVoteSubOption/);
  assert.match(html, /id="btn-vote-input-mode-image" onclick="setVoteInputMode\('image'\)"/);
  assert.match(html, /id="input-vote-image-a" type="file"/);
  assert.match(html, /id="input-vote-image-b" type="file"/);
  assert.match(html, /testCategoryName = inputMode === 'image' \? '투표 \(이미지형\)' : '투표 \(URL형\)'/);
  assert.match(html, /uploadVoteProjectImage\(file, \{/);
  assert.match(html, /typeSpecificData\.content = resolvedImageUrls/);
  assert.match(html, /dataService\.isVoteImageStorageUrl\(existingVoteImageUrls\[optionKey\]\)/);
  assert.match(html, /ab_url_a: abUrlA/);
  assert.match(html, /ab_url_b: abUrlB/);
  assert.match(html, /currentMainCategory === 'vote'[\s\S]*?requiresServiceUrl = false;[\s\S]*?serviceUrlRaw = '';/);
  assert.match(html, /if \(project\.category === 'vote'\) return '';/);
  assert.match(html, /removeVoteProjectImagePaths\(uploadedVoteAssetPaths/);
  assert.match(html, /const persistedQuestions = currentMainCategory === 'vote'/);
  assert.match(html, /questions: persistedQuestions/);
  assert.match(html, /is_ab_test: \['product', 'prototype'\]\.includes\(currentMainCategory\) && isProductAbMode/);
});

test('투표 이미지 파일은 안전한 형식과 파일당 5MB 제한을 적용한다', () => {
  assert.equal(VOTE_IMAGE_BUCKET, 'project-vote-assets');
  assert.equal(VOTE_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
  assert.deepEqual(validateVoteImageFile({ type: 'image/png', size: 1024 }), {
    mimeType: 'image/png',
    extension: 'png',
    size: 1024
  });
  assert.throws(() => validateVoteImageFile({ type: 'image/svg+xml', size: 1024 }), /PNG, JPG, WEBP, GIF/);
  assert.throws(() => validateVoteImageFile({ type: 'image/png', size: VOTE_IMAGE_MAX_BYTES + 1 }), /5MB/);
});

test('투표 이미지 업로드 전에 실제 파일 시그니처를 확인한다', async () => {
  const validPng = new Blob([
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00])
  ], { type: 'image/png' });
  const fakePng = new Blob([
    Uint8Array.from([0x3c, 0x73, 0x76, 0x67, 0x3e, 0x00, 0x00, 0x00])
  ], { type: 'image/png' });

  assert.equal((await validateVoteImageFileContent(validPng)).extension, 'png');
  await assert.rejects(() => validateVoteImageFileContent(fakePng), /파일 내용이 확장자 또는 형식과 일치/);
});

test('투표 이미지 Storage 공개 URL에서 삭제 가능한 객체 경로만 해석한다', () => {
  const projectUrl = `https://mikswhcchbatrlpetngb.supabase.co/storage/v1/object/public/${VOTE_IMAGE_BUCKET}/user-id/votes/sample-a.png`;
  assert.equal(getVoteImageStoragePath(projectUrl), 'user-id/votes/sample-a.png');
  assert.equal(getVoteImageStoragePath('https://attacker.example/storage/v1/object/public/project-vote-assets/user/votes/a.png'), '');
});

test('투표 이미지 Storage는 공개 읽기와 제작자별 쓰기·삭제 권한을 제한한다', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260915221000_add_vote_image_storage.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /'project-vote-assets'[\s\S]*TRUE[\s\S]*5242880/);
  assert.doesNotMatch(migration, /image\/svg\+xml/i);
  assert.match(migration, /FOR SELECT[\s\S]*TO anon, authenticated[\s\S]*bucket_id = 'project-vote-assets'/i);
  assert.match(migration, /FOR INSERT[\s\S]*storage\.foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::TEXT/i);
  assert.match(migration, /profile\.has_passed_gating/i);
  assert.match(migration, /FOR DELETE[\s\S]*storage\.foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::TEXT/i);
});

test('creator report opens with the current project instead of the static feedback sample', () => {
  const html = readAppSource();
  const creatorActions = html.match(/<div id="creator-only-actions"[\s\S]*?<\/div>\s*<hr/)?.[0] || '';

  assert.match(creatorActions, /onclick="openFeedbackReport\(currentPostId\)"/);
  assert.doesNotMatch(creatorActions, /onclick="navigateTo\('feedback'\)"/);
  assert.match(html, /id="feedback-average-rating"/);
  assert.match(html, /answers\.review_text/);
  assert.match(html, /if \(!project\) throw new Error\('프로젝트를 찾을 수 없습니다\.'\)/);
});
