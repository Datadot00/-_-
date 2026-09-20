    async function handleStep3PublishClick() {
      for (const stepNum of [1, 2, 3]) {
        if (!validateCreateStep(stepNum)) return;
      }

      const reward = Math.max(0, parseInt(document.getElementById('input-reward-coin')?.value, 10) || 0);
      const target = Math.max(1, parseInt(document.getElementById('input-target-count')?.value, 10) || 1);
      const newTotal = reward * target;
      const origReward = Number(myCreatedTest?.rewardCoin ?? 0);
      const origTarget = Number(myCreatedTest?.targetCount ?? 1);
      const originalTotal = isProjectEditMode
        ? origReward * origTarget
        : 0;
      const budgetToApply = isProjectEditMode ? Math.max(0, newTotal - originalTotal) : newTotal;

      // 테스트 기간에는 잔액 부족 여부와 관계없이 결제 모달을 거치지 않고 저장한다.
      await publishNewTestAndReturnToDashboard(budgetToApply);
    }

    async function publishNewTestAndReturnToDashboard(totalCost = 0) {
      const publishButton = document.getElementById('btn-publish-test-step3');
      if (publishButton?.dataset.submitting === 'true') return null;
      if (publishButton) {
        publishButton.dataset.submitting = 'true';
        publishButton.disabled = true;
      }

      const editingProjectId = getActiveProjectEditId();
      const wasEditing = Boolean(editingProjectId);
      let uploadedVoteAssetPaths = [];
      let previousVoteImageUrls = [];
      let uploadDataService = null;
      let uploadCreatorId = '';
      let voteImageUrlsCommitted = false;

      try {
      // 1. STEP 2 기본 정보 수집
      const tTitle = (document.getElementById('input-test-title')?.value || '').trim();
      let sName = (document.getElementById('input-service-name')?.value || '').trim();
      let sDesc = (document.getElementById('input-service-desc')?.value || '').trim();
      const sNoticeVal = (document.getElementById('input-test-notice')?.value || '').trim();
      const thumbnailPreview = document.getElementById('thumbnail-img-preview');
      const thumbImgSrc = thumbnailPreview && !thumbnailPreview.classList.contains('hidden')
        ? (thumbnailPreview.getAttribute('src') || '')
        : '';

      if (!tTitle) {
        throw new Error(
          currentMainCategory === 'vote' ? '투표 제목을 입력해 주세요.' :
          (currentMainCategory === 'survey' ? '설문 제목을 입력해 주세요.' : '테스트 제목을 입력해 주세요.')
        );
      }
      if (currentMainCategory === 'product' || currentMainCategory === 'prototype') {
        if (!sName) {
          throw new Error('서비스명을 입력해 주세요.');
        }
      } else {
        // 투표, 설문조사 시 서비스명/소개가 비노출되므로 DB NOT NULL 제약조건 호환을 위해 자동 보정
        if (!sName) sName = tTitle;
        if (!sDesc) sDesc = sNoticeVal || tTitle;
      }

      // 2. STEP 2 동적 데이터 수집 (유형별)
      let testCategoryName = '프로덕트 테스트';
      let typeSpecificData = {};

      if (currentMainCategory === 'product' || currentMainCategory === 'prototype') {
        const platform = document.querySelector('input[name="productSubPlatform"]:checked')?.value || 'web';
        if (platform === 'web') {
          testCategoryName = currentMainCategory === 'prototype' ? '프로토타입 (웹)' : '프로덕트 (웹)';
          typeSpecificData = {
            platform: 'web',
            url: document.getElementById('input-product-web-url')?.value || '',
            abUrlA: isProductAbMode ? (document.getElementById('input-product-ab-web-a')?.value || '') : '',
            abUrlB: isProductAbMode ? (document.getElementById('input-product-ab-web-b')?.value || '') : ''
          };
        } else {
          testCategoryName = '프로덕트 (앱)';
          typeSpecificData = {
            platform: 'app',
            packageName: document.getElementById('input-app-package')?.value || '',
            bundleId: document.getElementById('input-app-bundle')?.value || '',
            track: document.getElementById('select-app-track')?.value || 'closed',
            groupLink: document.getElementById('input-app-group-link')?.value || '',
            testLink: document.getElementById('input-app-test-link')?.value || '',
            playstoreUrl: document.getElementById('input-app-playstore-url')?.value || '',
            appstoreUrl: document.getElementById('input-app-appstore-url')?.value || '',
            abUrlA: isProductAbMode ? (document.getElementById('input-product-ab-app-link-a')?.value || '') : '',
            abUrlB: isProductAbMode ? (document.getElementById('input-product-ab-app-link-b')?.value || '') : ''
          };
        }
      } else if (currentMainCategory === 'vote') {
        const inputMode = currentVoteInputMode;
        testCategoryName = inputMode === 'image' ? '투표 (이미지형)' : '투표 (URL형)';
        const voteUrlInputs = document.querySelectorAll('#vote-url-list input[type="url"]');
        const contentData = inputMode === 'url'
          ? Array.from(voteUrlInputs).map(input => input.value.trim()).filter(Boolean).slice(0, 2)
          : [existingVoteImageUrls.A, existingVoteImageUrls.B];
        const uploadFiles = inputMode === 'image'
          ? {
              A: document.getElementById('input-vote-image-a')?.files?.[0] || null,
              B: document.getElementById('input-vote-image-b')?.files?.[0] || null
            }
          : {};

        // Extract questions from reusable vote questions list
        const voteQInputs = document.querySelectorAll('#vote-questions-list input[type="text"]');
        const voteQuestions = [];
        voteQInputs.forEach(inp => {
          if (inp.value.trim()) voteQuestions.push(inp.value.trim());
        });
        if (voteQuestions.length === 0) {
          voteQuestions.push('어떤 안이 더 좋아 보이나요? 왜 그렇게 생각하시나요?');
        }

        typeSpecificData = {
          inputMode,
          content: contentData,
          uploadFiles,
          questions: voteQuestions
        };
      } else if (currentMainCategory === 'survey') {
        const surveyMode = document.querySelector('input[name="missionFormatMode"]:checked')?.value || 'direct';
        testCategoryName = `설문조사 (${surveyMode === 'link' ? 'URL 링크형' : '직접 입력형'})`;
        typeSpecificData = {
          platform: 'none',
          surveyMode,
          url: surveyMode === 'link'
            ? (document.getElementById('input-external-survey-url')?.value || '')
            : ''
        };
      }

      // 3. STEP 3 세부 설정 수집
      const sNotice = (document.getElementById('input-test-notice')?.value || '').trim();
      initializeProjectDateDefaults();
      const startDate = document.getElementById('input-start-date')?.value;
      const endDate = document.getElementById('input-end-date')?.value;
      const rCoin = Math.max(0, parseInt(document.getElementById('input-reward-coin')?.value || '0', 10));
      const tCount = Math.max(1, parseInt(document.getElementById('input-target-count')?.value || '1', 10));

      // Extract target age & interests
      const targetAges = Array.from(document.querySelectorAll('input[name="targetAge"]:checked')).map(c => c.value);
      const targetInterests = Array.from(document.querySelectorAll('input[name="targetInterest"]:checked')).map(c => c.value);

      // Extract questions with custom choices (up to 5 choices; empty choices array = subjective question)
      const questionItemEls = document.querySelectorAll('#questions-list .question-item');
      const questions = [];
      questionItemEls.forEach(item => {
        const titleVal = item.querySelector('.question-title-input')?.value.trim();
        const typeSelect = item.querySelector('.question-type-select')?.value || 'single';
        const optionsBox = item.querySelector('.question-options-box');
        const isEssay = typeSelect === 'essay' || (optionsBox && window.getComputedStyle(optionsBox).display === 'none');

        const choices = [];
        if (!isEssay) {
          const choiceInputs = item.querySelectorAll('.option-title-input');
          choiceInputs.forEach(ci => {
            const val = ci.value.trim();
            if (val) choices.push(val);
          });
        }

        if (titleVal) {
          questions.push({
            title: titleVal,
            type: typeSelect, // 'essay' | 'single' | 'multiple'
            choices: choices // empty [] for essay, array of strings for choice types
          });
        }
      });

      // 검증 항목은 선택 사항이므로 비어 있으면 비운 채로 저장한다. 기본 문항을
      // 끼워 넣으면 제작자가 만들지 않은 질문이 테스터에게 보인다.
      const persistedQuestions = currentMainCategory === 'vote'
        ? (typeSpecificData.questions || []).map(title => ({
            title,
            type: 'essay',
            choices: []
          }))
        : questions;

      // Extract quiz items (up to 3 questions & answers)
      const quizItemEls = document.querySelectorAll('#quiz-questions-list .quiz-item');
      const quizzes = [];
      quizItemEls.forEach(item => {
        const qText = item.querySelector('.quiz-question-input')?.value.trim();
        const aText = item.querySelector('.quiz-answer-input')?.value.trim();
        if (qText) {
          quizzes.push({ question: qText, answer: aText || '' });
        }
      });

      const dataService = window.donDwaeDataService;
      if (!dataService?.supabase || typeof dataService.normalizeHttpUrl !== 'function') {
        throw new Error('Supabase 데이터 연결이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      }

      const { data: { session }, error: sessionError } = await dataService.supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      }

      const activeCreatorId = session.user.id;
      uploadDataService = dataService;
      uploadCreatorId = activeCreatorId;
      if (currentMainCategory === 'vote') {
        previousVoteImageUrls = [existingVoteImageUrls.A, existingVoteImageUrls.B].filter(Boolean);
      }

      if (currentMainCategory === 'vote' && typeSpecificData.inputMode === 'image') {
        if (typeof dataService.uploadVoteProjectImage !== 'function') {
          throw new Error('투표 이미지 업로드 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
        }
        const publishButtonText = document.getElementById('btn-publish-step3-text');
        if (publishButtonText) publishButtonText.textContent = 'A/B 이미지 업로드 중...';
        const resolvedImageUrls = [];
        for (const optionKey of ['A', 'B']) {
          const file = typeSpecificData.uploadFiles?.[optionKey];
          if (file) {
            const uploaded = await dataService.uploadVoteProjectImage(file, {
              userId: activeCreatorId,
              optionKey
            });
            uploadedVoteAssetPaths.push(uploaded.objectPath);
            resolvedImageUrls.push(uploaded.publicUrl);
          } else {
            const existingUrl = dataService.isVoteImageStorageUrl(existingVoteImageUrls[optionKey])
              ? existingVoteImageUrls[optionKey]
              : '';
            if (!existingUrl) throw new Error(`${optionKey}안 이미지를 선택해 주세요.`);
            resolvedImageUrls.push(existingUrl);
          }
        }
        typeSpecificData.content = resolvedImageUrls;
        delete typeSpecificData.uploadFiles;
        if (publishButtonText) publishButtonText.textContent = '이미지 저장 완료 · 프로젝트 게시 중...';
      }

      const missionFormat = document.querySelector('input[name="missionFormatMode"]:checked')?.value || 'direct';
      const externalSurveyUrl = dataService.normalizeHttpUrl(
        missionFormat === 'link' ? document.getElementById('input-external-survey-url')?.value : '',
        { required: missionFormat === 'link' }
      );

      let serviceUrlRaw = '';
      let requiresServiceUrl = false;
      if (currentMainCategory === 'product' || currentMainCategory === 'prototype') {
        requiresServiceUrl = true;
        serviceUrlRaw = typeSpecificData.platform === 'app'
          ? (typeSpecificData.testLink || typeSpecificData.playstoreUrl || typeSpecificData.appstoreUrl || typeSpecificData.abUrlA)
          : (typeSpecificData.url || typeSpecificData.abUrlA);
      } else if (currentMainCategory === 'vote') {
        // 이미지 URL은 ab_url_a / ab_url_b에 각각 저장하고, 내부 투표에는
        // 별도의 외부 서비스 URL을 만들지 않는다.
        requiresServiceUrl = false;
        serviceUrlRaw = '';
      } else if (currentMainCategory === 'survey') {
        requiresServiceUrl = false;
        serviceUrlRaw = '';
      }

      const sUrl = dataService.normalizeHttpUrl(serviceUrlRaw, { required: requiresServiceUrl });
      const isVoteUrlMode = currentMainCategory === 'vote';
      const abUrlA = dataService.normalizeHttpUrl(
        typeSpecificData.abUrlA || (isVoteUrlMode ? typeSpecificData.content?.[0] : '')
      );
      const abUrlB = dataService.normalizeHttpUrl(
        typeSpecificData.abUrlB || (isVoteUrlMode ? typeSpecificData.content?.[1] : '')
      );
      const playstoreUrl = dataService.normalizeHttpUrl(typeSpecificData.playstoreUrl || '');
      const appstoreUrl = dataService.normalizeHttpUrl(typeSpecificData.appstoreUrl || '');

      // 개발 환경과 권장 참여 대상은 의미가 다른 태그이므로 각각 수집·저장합니다.
      const techTags = collectProjectTags('tech-tags-container');
      const personaTags = collectProjectTags('persona-tags-container');

      // Determine internal vs external test method
      let isInternalMethod = false;
      if (currentMainCategory === 'vote') {
        isInternalMethod = true;
      } else if (currentMainCategory === 'survey') {
        isInternalMethod = typeSpecificData.surveyMode === 'direct';
      } else {
        isInternalMethod = false; // 웹/앱 프로덕트/프로토타입 및 URL이 있는 검증은 외부 테스트
      }

      const loginRequired = document.querySelector('input[name="loginRequirementMode"]:checked')?.value === 'required';
      const testAccountId = loginRequired ? (document.getElementById('input-test-login-id')?.value || '').trim() : null;
      const testAccountPassword = loginRequired ? (document.getElementById('input-test-login-pw')?.value || '').trim() : null;
      const privacyItems = loginRequired ? (document.getElementById('input-privacy-items')?.value || '').trim() : null;
      const testGuide = (document.getElementById('input-test-guide')?.value || '').trim();
      const reviewsPublic = !document.getElementById('toggle-feedback-privacy')?.checked;

      if (typeof dataService.prepareProjectLoginConfiguration !== 'function') {
        throw new Error('프로젝트 로그인 설정 검증기를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
      }
      const loginConfiguration = dataService.prepareProjectLoginConfiguration({
        loginRequired,
        testAccountId,
        testAccountPassword,
        privacyItems,
        preserveExistingCredentials: wasEditing && editingOriginalLoginRequired === true
      });
      if (!testGuide) {
        throw new Error('테스트 진행 방법을 입력해 주세요.');
      }

      const dbPayload = {
        creator_id: activeCreatorId,
        title: tTitle,
        service_name: sName,
        service_desc: sDesc,
        test_notice: sNotice,
        thumbnail_url: thumbImgSrc || null,
        category: currentMainCategory || 'product',
        platform: currentMainCategory === 'survey' ? 'none' : (typeSpecificData.platform || 'web'),
        is_ab_test: ['product', 'prototype'].includes(currentMainCategory) && isProductAbMode,
        service_url: sUrl,
        ab_url_a: abUrlA,
        ab_url_b: abUrlB,
        app_playstore_url: playstoreUrl,
        app_appstore_url: appstoreUrl,
        external_survey_url: externalSurveyUrl,
        ...loginConfiguration,
        test_guide: testGuide,
        questions: persistedQuestions,
        ...dataService.prepareProjectVerification(currentVerificationMethod, quizzes),
        start_date: startDate,
        end_date: endDate,
        target_count: tCount,
        reward_coin: rCoin,
        total_funded_cost: rCoin * tCount,
        is_reviews_public: reviewsPublic,
        tech_tags: techTags,
        target_persona_tags: personaTags
      };

      let persistedProject;
      if (wasEditing) {
        if (!editingProjectId || editingProjectId === 'my-created-test') {
          throw new Error('수정할 프로젝트의 DB 식별자를 찾지 못했습니다. 내 프로젝트에서 다시 시도해 주세요.');
        }
        persistedProject = await dataService.updateProjectRecord(editingProjectId, dbPayload);
      } else {
        persistedProject = await dataService.createProjectRecord(dbPayload);
      }
      voteImageUrlsCommitted = uploadedVoteAssetPaths.length > 0;

      const verifiedProject = await dataService.fetchProjectById(persistedProject.id);
      if (!verifiedProject) {
        throw new Error('프로젝트 저장 후 재조회 검증에 실패했습니다. 잠시 후 내 프로젝트에서 확인해 주세요.');
      }

      if (previousVoteImageUrls.length > 0 && typeof dataService.removeVoteProjectImagesByUrls === 'function') {
        const retainedUrls = new Set([verifiedProject.ab_url_a, verifiedProject.ab_url_b].filter(Boolean));
        const replacedUrls = previousVoteImageUrls.filter(url => !retainedUrls.has(url));
        if (replacedUrls.length > 0) {
          try {
            await dataService.removeVoteProjectImagesByUrls(replacedUrls, { userId: activeCreatorId });
          } catch (cleanupError) {
            console.warn('[Vote image storage] Replaced image cleanup failed:', cleanupError?.message || cleanupError);
          }
        }
      }
      ['A', 'B'].forEach(revokeVoteImagePreview);

      const createdId = verifiedProject.id;
      myCreatedTest = {
        id: createdId,
        title: verifiedProject.title,
        serviceName: verifiedProject.service_name,
        serviceDesc: verifiedProject.service_desc,
        thumbnailUrl: verifiedProject.thumbnail_url,
        testType: testCategoryName,
        testMethod: isInternalMethod ? 'internal' : 'external',
        mainCategory: currentMainCategory,
        typeSpecificData: typeSpecificData,
        testNotice: verifiedProject.test_notice,
        regDate: verifiedProject.start_date,
        endDate: verifiedProject.end_date,
        targetAges: targetAges,
        targetInterests: targetInterests,
        questions: verifiedProject.questions,
        quizzes: verifiedProject.quizzes,
        verification_method: verifiedProject.verification_method || currentVerificationMethod,
        rewardCoin: verifiedProject.reward_coin,
        targetCount: verifiedProject.target_count,
        currentRecruits: verifiedProject.current_count,
        serviceUrl: verifiedProject.service_url,
        abUrlA: verifiedProject.ab_url_a,
        abUrlB: verifiedProject.ab_url_b,
        techTags: verifiedProject.tech_tags || techTags,
        personaTags: verifiedProject.target_persona_tags || personaTags,
        tech_tags: verifiedProject.tech_tags || techTags,
        target_persona_tags: verifiedProject.target_persona_tags || personaTags
      };
      // 화면상의 돼지코인은 DB 저장 성공 이후에만 반영합니다.
      userCoinBalance = Math.max(0, userCoinBalance - totalCost);
      updateAllCoinDisplays();
      clearProjectEditContext();
      if (typeof clearProjectCreationDraft === 'function') {
        try {
          await clearProjectCreationDraft();
        } catch (draftErr) {
          console.warn('[Draft cleanup notice]:', draftErr);
        }
      }

      // 3. Create or update top card in Dashboard Feed
      renderPublishedProjectCard(createdId, sName, sDesc, sUrl, rCoin, tCount, techTags);

      // Update MyPage stats if exists
      const myProjectCountEl = document.getElementById('mypage-my-project-count');
      if (myProjectCountEl) {
        myProjectCountEl.textContent = '3개';
      }

      if (wasEditing) {
        showGenericToast(`✏️ '${sName}' 프로젝트 수정 내용이 DB에 저장되었습니다.`, '🎉');
      } else {
        showGenericToast(`🎉 '${sName}' 테스트가 게시되었습니다! 리워드 예산은 ${totalCost.toLocaleString()} 돼지코인입니다.`, '🚀');
      }

      const liveProjects = await dataService.fetchExploreProjects();
      if (liveProjects) window.renderLiveProjectsToFeed(liveProjects);

      await openPostDetail(createdId);
      navigateTo('post');
      startRealtimeReviewTimer();
      return verifiedProject;
      } catch (error) {
        if (!voteImageUrlsCommitted && uploadedVoteAssetPaths.length > 0 && uploadDataService && uploadCreatorId) {
          try {
            await uploadDataService.removeVoteProjectImagePaths(uploadedVoteAssetPaths, { userId: uploadCreatorId });
          } catch (cleanupError) {
            console.warn('[Vote image storage] Failed upload cleanup failed:', cleanupError?.message || cleanupError);
          }
        }
        console.error('[Supabase DB] Project persistence failed:', error);
        const friendly = resolveFriendlyError(error, 'PRJ_SAVE_FAILED');
        const message = error?.code === '42501'
          ? '[PRJ-004] 프로젝트 등록 권한을 확인해 주세요. 등록 전 확인 서약을 완료해야 합니다.'
          : friendly.formatted;
        showGenericToast(message, '⚠️');
        return null;
      } finally {
        if (publishButton) {
          publishButton.dataset.submitting = 'false';
          publishButton.disabled = false;
        }
        calculateTotalCost();
      }
    }
