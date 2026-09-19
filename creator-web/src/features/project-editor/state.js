    const testCreationStore = {
      testType: '프로덕트 테스트',
      serviceName: '',
      serviceDesc: '',
      serviceUrl: '',
      techTags: [],
      personaTags: [],
      requireScreenshot: false,
      questions: [],
      rewardCoin: 0,
      targetCount: 10
    };

    const PROJECT_TAG_LIMIT = 10;

    function createDefaultProjectPreview() {
      return {
        id: 'my-created-test',
        testType: '프로덕트 테스트',
        serviceName: '돈돼 (DonDwae)',
        serviceDesc: '바이브코딩으로 만든 서비스 검증 및 피드백 플랫폼',
        serviceUrl: 'try-money-pig.io',
        techTags: ['#Cursor', '#v0', '#Next.js', '#Supabase'],
        personaTags: ['20대·30대', '가계부 관심자', '앱 실사용자'],
        questions: [
          '회원가입 플로우 만족도 및 이탈 지점이 있었나요?',
          '첫인상을 3단어로 평가한다면 어떤 느낌인가요?'
        ],
        rewardCoin: 50,
        targetCount: 30,
        currentRecruits: 0,
        regDate: '2024. 11. 20.',
        endDate: '2024. 12. 05.'
      };
    }

    let myCreatedTest = createDefaultProjectPreview();

    let currentCreateStep = 1;

    const PROJECT_EDIT_SESSION_KEY = 'dondwae_editing_project_id';

    function readStoredProjectEditId() {
      try {
        return sessionStorage.getItem(PROJECT_EDIT_SESSION_KEY) || null;
      } catch (e) {
        return null;
      }
    }

    let activeEditingProjectId = readStoredProjectEditId();

    let isProjectEditMode = Boolean(activeEditingProjectId);

    let editingOriginalLoginRequired = null;

    window.userHasPassedGating = false;

    window.completedTestCountFromDB = 0;

    let currentMainCategory = 'product'; // 'product' | 'prototype' | 'vote' | 'survey'

    let isProductAbMode = false;

    let currentVoteInputMode = 'image';

    const existingVoteImageUrls = { A: '', B: '' };

    const voteImagePreviewObjectUrls = { A: '', B: '' };

    let currentVerificationMethod = 'none';
