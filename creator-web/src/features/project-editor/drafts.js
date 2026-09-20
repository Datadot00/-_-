    // ========================================================
    // PROJECT EDITOR DRAFT SERVICE (CROSS-DEVICE PERSISTENCE)
    // ========================================================

    const PROJECT_DRAFT_LOCAL_KEY_PREFIX = 'dondwae_project_draft';
    const PROJECT_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

    function getProjectDraftLocalKey() {
      const userId = String(window.currentAuthUserId || 'guest').trim();
      return `${PROJECT_DRAFT_LOCAL_KEY_PREFIX}:${userId}`;
    }

    function collectProjectCreationDraft() {
      // 1. 과제 설정 (Step 1)
      const mainCategory = currentMainCategory || 'product';
      const productSubPlatform = document.querySelector('input[name="productSubPlatform"]:checked')?.value || 'web';
      const webUrl = document.getElementById('input-product-web-url')?.value || '';
      const abWebA = document.getElementById('input-product-ab-web-a')?.value || '';
      const abWebB = document.getElementById('input-product-ab-web-b')?.value || '';
      const appPackage = document.getElementById('input-app-package')?.value || '';
      const appBundle = document.getElementById('input-app-bundle')?.value || '';
      const appTrack = document.getElementById('select-app-track')?.value || 'closed';
      const appGroupLink = document.getElementById('input-app-group-link')?.value || '';
      const appTestLink = document.getElementById('input-app-test-link')?.value || '';
      const appPlaystoreUrl = document.getElementById('input-app-playstore-url')?.value || '';
      const appAppstoreUrl = document.getElementById('input-app-appstore-url')?.value || '';
      const abAppLinkA = document.getElementById('input-product-ab-app-link-a')?.value || '';
      const abAppLinkB = document.getElementById('input-product-ab-app-link-b')?.value || '';

      // Vote specific
      const voteInputMode = currentVoteInputMode || 'image';
      const voteUrlInputs = document.querySelectorAll('#vote-url-list input[type="url"]');
      const voteUrls = Array.from(voteUrlInputs).map(input => input.value);
      const voteQInputs = document.querySelectorAll('#vote-questions-list input[type="text"]');
      const voteQuestions = Array.from(voteQInputs).map(input => input.value);
      const voteImages = {
        A: existingVoteImageUrls?.A || '',
        B: existingVoteImageUrls?.B || ''
      };

      // Survey specific
      const surveyMode = document.querySelector('input[name="missionFormatMode"]:checked')?.value || 'direct';
      const externalSurveyUrl = document.getElementById('input-external-survey-url')?.value || '';

      // Login requirement
      const loginRequired = document.querySelector('input[name="loginRequirementMode"]:checked')?.value === 'required';
      const testAccountId = document.getElementById('input-test-login-id')?.value || '';
      const testAccountPassword = document.getElementById('input-test-login-pw')?.value || '';
      const privacyItems = document.getElementById('input-privacy-items')?.value || '';
      const testGuide = document.getElementById('input-test-guide')?.value || '';

      // Questions
      const questions = [];
      const questionItemEls = document.querySelectorAll('#questions-list .question-item');
      questionItemEls.forEach(item => {
        const title = item.querySelector('.question-title-input')?.value || '';
        const type = item.querySelector('.question-type-select')?.value || 'single';
        const isRequired = item.querySelector('.question-required-toggle')?.checked ?? true;
        const choices = [];
        item.querySelectorAll('.option-title-input').forEach(ci => {
          choices.push(ci.value);
        });
        questions.push({ title, type, choices, isRequired });
      });

      // Verification & Quizzes
      const verificationMethod = currentVerificationMethod || 'none';
      const quizzes = [];
      const quizItemEls = document.querySelectorAll('#quiz-questions-list .quiz-item');
      quizItemEls.forEach(item => {
        const question = item.querySelector('.quiz-question-input')?.value || '';
        const answer = item.querySelector('.quiz-answer-input')?.value || '';
        quizzes.push({ question, answer });
      });

      // 2. 기본 정보 (Step 2)
      const thumbnailPreview = document.getElementById('thumbnail-img-preview');
      const thumbnailUrl = thumbnailPreview && !thumbnailPreview.classList.contains('hidden')
        ? (thumbnailPreview.getAttribute('src') || '')
        : '';
      const title = document.getElementById('input-test-title')?.value || '';
      const serviceName = document.getElementById('input-service-name')?.value || '';
      const serviceDesc = document.getElementById('input-service-desc')?.value || '';
      const testNotice = document.getElementById('input-test-notice')?.value || '';

      // 3. 타겟 및 리워드 (Step 3)
      const startDate = document.getElementById('input-start-date')?.value || '';
      const endDate = document.getElementById('input-end-date')?.value || '';
      const testDuration = document.getElementById('select-test-duration')?.value || '3분 내외';
      const targetCount = document.getElementById('input-target-count')?.value || '';
      const rewardCoin = document.getElementById('input-reward-coin')?.value || '';
      const targetAges = Array.from(document.querySelectorAll('input[name="targetAge"]:checked')).map(c => c.value);
      const targetInterests = Array.from(document.querySelectorAll('input[name="targetInterest"]:checked')).map(c => c.value);
      const techTags = typeof collectProjectTags === 'function' ? collectProjectTags('tech-tags-container') : [];
      const personaTags = typeof collectProjectTags === 'function' ? collectProjectTags('persona-tags-container') : [];
      const feedbackPrivacy = document.getElementById('toggle-feedback-privacy')?.checked || false;

      return {
        // Step 1
        mainCategory,
        productSubPlatform,
        isProductAbMode: Boolean(isProductAbMode),
        webUrl,
        abWebA,
        abWebB,
        appPackage,
        appBundle,
        appTrack,
        appGroupLink,
        appTestLink,
        appPlaystoreUrl,
        appAppstoreUrl,
        abAppLinkA,
        abAppLinkB,
        voteInputMode,
        voteUrls,
        voteQuestions,
        voteImages,
        surveyMode,
        externalSurveyUrl,
        loginRequired,
        testAccountId,
        testAccountPassword,
        privacyItems,
        testGuide,
        questions,
        verificationMethod,
        quizzes,
        // Step 2
        thumbnailUrl,
        title,
        serviceName,
        serviceDesc,
        testNotice,
        // Step 3
        startDate,
        endDate,
        testDuration,
        targetCount,
        rewardCoin,
        targetAges,
        targetInterests,
        techTags,
        personaTags,
        feedbackPrivacy
      };
    }

    function updateProjectDraftStatusUI(savedAt) {
      const badge = document.getElementById('project-draft-status-badge');
      if (!badge) return;
      if (!savedAt) {
        badge.classList.add('hidden');
        badge.textContent = '';
        return;
      }
      const dateObj = new Date(savedAt);
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      badge.textContent = `💾 마지막 저장 ${hours}:${minutes}`;
      badge.classList.remove('hidden');
    }

    async function saveProjectCreationDraft({ showToast = true, silent = false } = {}) {
      if (isProjectEditMode) return null; // Do not overwrite new project drafts when editing existing projects
      const draftData = collectProjectCreationDraft();
      const currentStep = Number(currentCreateStep) || 1;
      const now = Date.now();

      // Always save to localStorage as fast local cache
      try {
        localStorage.setItem(getProjectDraftLocalKey(), JSON.stringify({
          version: 1,
          userId: String(window.currentAuthUserId || ''),
          current_step: currentStep,
          savedAt: now,
          draft_data: draftData
        }));
      } catch (e) {
        console.warn('[Draft] LocalStorage cache failed:', e);
      }

      updateProjectDraftStatusUI(now);

      // Save to Supabase DB if logged in
      const dataService = window.donDwaeDataService;
      if (dataService && typeof dataService.saveProjectDraft === 'function' && window.currentAuthUserId) {
        try {
          await dataService.saveProjectDraft(draftData, currentStep);
        } catch (dbError) {
          console.warn('[Draft] DB persistence warning (cached locally):', dbError?.message || dbError);
        }
      }

      if (showToast && !silent) {
        showGenericToast('💾 작성 중인 프로젝트가 임시저장되었습니다.', '✅');
      }
      return draftData;
    }

    function restoreProjectCreationDraft(draftRecord) {
      if (!draftRecord || !draftRecord.draft_data) return false;
      const d = draftRecord.draft_data;

      // 1. 과제 설정 (Step 1)
      const targetCategory = ['product', 'prototype', 'vote', 'survey'].includes(d.mainCategory)
        ? d.mainCategory
        : 'product';
      const categoryRadio = document.querySelector(`input[name="mainCategory"][value="${targetCategory}"]`);
      if (categoryRadio) categoryRadio.checked = true;
      if (typeof handleMainCategoryChange === 'function') handleMainCategoryChange(targetCategory);

      if (targetCategory !== 'survey') {
        const platform = d.productSubPlatform || 'web';
        const platformRadio = document.querySelector(`input[name="productSubPlatform"][value="${platform}"]`);
        if (platformRadio) platformRadio.checked = true;
        if (typeof toggleProductPlatformFields === 'function') toggleProductPlatformFields(platform);
      }

      const abToggle = document.getElementById('toggle-product-ab');
      if (abToggle) abToggle.checked = Boolean(d.isProductAbMode);
      if (typeof toggleProductAbMode === 'function') toggleProductAbMode(Boolean(d.isProductAbMode));

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
      };

      setVal('input-product-web-url', d.webUrl);
      setVal('input-product-ab-web-a', d.abWebA);
      setVal('input-product-ab-web-b', d.abWebB);
      setVal('input-app-package', d.appPackage);
      setVal('input-app-bundle', d.appBundle);
      setVal('select-app-track', d.appTrack || 'closed');
      setVal('input-app-group-link', d.appGroupLink);
      setVal('input-app-test-link', d.appTestLink);
      setVal('input-app-playstore-url', d.appPlaystoreUrl);
      setVal('input-app-appstore-url', d.appAppstoreUrl);
      setVal('input-product-ab-app-link-a', d.abAppLinkA);
      setVal('input-product-ab-app-link-b', d.abAppLinkB);

      // Vote Mode
      if (targetCategory === 'vote') {
        if (typeof setVoteInputMode === 'function') setVoteInputMode(d.voteInputMode || 'image');
        if (d.voteImages?.A) {
          existingVoteImageUrls.A = d.voteImages.A;
          if (typeof setVoteImagePreview === 'function') setVoteImagePreview('A', d.voteImages.A, '임시저장 A안');
        }
        if (d.voteImages?.B) {
          existingVoteImageUrls.B = d.voteImages.B;
          if (typeof setVoteImagePreview === 'function') setVoteImagePreview('B', d.voteImages.B, '임시저장 B안');
        }
        const voteUrlList = document.getElementById('vote-url-list');
        if (voteUrlList && Array.isArray(d.voteUrls) && d.voteUrls.length > 0) {
          voteUrlList.innerHTML = '';
          d.voteUrls.forEach(url => {
            if (typeof addVoteUrlItem === 'function') addVoteUrlItem();
            const lastInput = voteUrlList.querySelector('div:last-child input[type="url"]');
            if (lastInput) lastInput.value = url;
          });
        }
        const voteQList = document.getElementById('vote-questions-list');
        if (voteQList && Array.isArray(d.voteQuestions) && d.voteQuestions.length > 0) {
          voteQList.innerHTML = '';
          d.voteQuestions.forEach(q => {
            if (typeof addVoteQuestionItem === 'function') addVoteQuestionItem();
            const lastInput = voteQList.querySelector('div:last-child input[type="text"]');
            if (lastInput) lastInput.value = q;
          });
        }
      }

      // Survey Mode
      const surveyMode = d.surveyMode || 'direct';
      const surveyRadio = document.querySelector(`input[name="missionFormatMode"][value="${surveyMode}"]`);
      if (surveyRadio) surveyRadio.checked = true;
      if (typeof toggleMissionFormatMode === 'function') toggleMissionFormatMode(surveyMode);
      setVal('input-external-survey-url', d.externalSurveyUrl);

      // Login
      const loginMode = d.loginRequired ? 'required' : 'none';
      const loginRadio = document.querySelector(`input[name="loginRequirementMode"][value="${loginMode}"]`);
      if (loginRadio) loginRadio.checked = true;
      if (typeof handleLoginRequirementChange === 'function') handleLoginRequirementChange(loginMode);
      setVal('input-test-login-id', d.testAccountId);
      setVal('input-test-login-pw', d.testAccountPassword);
      setVal('input-privacy-items', d.privacyItems);
      setVal('input-test-guide', d.testGuide);

      // Questions List
      const qList = document.getElementById('questions-list');
      if (qList && Array.isArray(d.questions) && d.questions.length > 0) {
        qList.innerHTML = '';
        d.questions.forEach((qObj, idx) => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'question-item p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-primary/60 transition-all flex flex-col gap-3.5 shadow-2xs';
          itemDiv.setAttribute('data-question-type', qObj.type || 'single');

          let choicesHtml = '';
          (qObj.choices || []).forEach((cText, cIdx) => {
            choicesHtml += `
              <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
                <span class="text-xs text-neutral-400 font-mono option-num">${cIdx + 1}.</span>
                <input type="text" value="${cText || ''}" placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none" />
                <button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>
              </div>
            `;
          });

          itemDiv.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 rounded-lg bg-[#EDF8E5] text-[#2F6517] font-bold text-xs shrink-0">검증 ${idx + 1}</span>
              <input type="text" value="${qObj.title || ''}" placeholder="질문 내용을 입력하세요..."
                class="question-title-input flex-1 text-xs font-semibold text-neutral-dark focus:outline-none border-b border-neutral-200 pb-1" />

              <select class="question-type-select text-xs font-bold bg-[#F4F4F5] px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none cursor-pointer" onchange="handleQuestionTypeChange(this)">
                <option value="essay" ${qObj.type === 'essay' ? 'selected' : ''}>📝 서술형</option>
                <option value="single" ${qObj.type === 'single' ? 'selected' : ''}>🔘 객관식 (단일선택)</option>
                <option value="multiple" ${qObj.type === 'multiple' ? 'selected' : ''}>☑️ 객관식 (복수선택)</option>
              </select>

              <label class="flex items-center gap-1.5 text-xs font-bold shrink-0 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200 cursor-pointer">
                <input type="checkbox" class="question-required-toggle accent-primary-dark w-3.5 h-3.5" ${qObj.isRequired !== false ? 'checked' : ''} />
                <span class="text-neutral-700">필수</span>
              </label>

              <button type="button" onclick="this.closest('.question-item').remove(); reindexQuestionTitles();" class="text-neutral-400 hover:text-red-500 text-xs px-1 font-bold">✕ 삭제</button>
            </div>

            <div class="question-options-box pl-6 flex flex-col gap-2 border-t border-neutral-100 pt-3" style="${qObj.type === 'essay' ? 'display: none;' : ''}">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-neutral-500">선택지 (최대 5개)</span>
                <button type="button" onclick="addOptionToQuestion(this)" class="text-[11px] text-[#2F6517] font-extrabold hover:underline cursor-pointer">+ 선택지 추가</button>
              </div>
              <div class="options-container grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${choicesHtml || `
                  <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
                    <span class="text-xs text-neutral-400 font-mono option-num">1.</span>
                    <input type="text" value="매우 양호함 / 이상 없음" placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none" />
                    <button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>
                  </div>
                `}
              </div>
            </div>
          `;
          qList.appendChild(itemDiv);
        });
      }

      // Verification method & Quizzes
      if (typeof setVerificationMethod === 'function') {
        setVerificationMethod(d.verificationMethod || 'none');
      }
      const quizList = document.getElementById('quiz-questions-list');
      if (quizList && Array.isArray(d.quizzes) && d.quizzes.length > 0) {
        quizList.innerHTML = '';
        d.quizzes.forEach((qz, qzIdx) => {
          const quizDiv = document.createElement('div');
          quizDiv.className = 'quiz-item p-4 rounded-xl border border-neutral-200 bg-white flex flex-col gap-3 shadow-2xs';
          quizDiv.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-neutral-dark flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-primary/30 text-primary-dark flex items-center justify-center text-[11px] font-bold">${qzIdx + 1}</span>
                <span>퀴즈 질문 ${qzIdx + 1}</span>
              </span>
              <button type="button" onclick="this.closest('.quiz-item').remove(); reindexQuizTitles();" class="text-neutral-400 hover:text-red-500 text-xs font-bold">✕ 삭제</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <input type="text" placeholder="질문 입력" class="quiz-question-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-medium focus:outline-none" value="${qz.question || ''}" />
              </div>
              <div>
                <input type="text" placeholder="정답 입력" class="quiz-answer-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-bold bg-[#F9FAFB] focus:outline-none text-emerald-800" value="${qz.answer || ''}" />
              </div>
            </div>
          `;
          quizList.appendChild(quizDiv);
        });
      }

      // 2. 기본 정보 (Step 2)
      setVal('input-test-title', d.title);
      setVal('input-service-name', d.serviceName);
      setVal('input-service-desc', d.serviceDesc);
      setVal('input-test-notice', d.testNotice);

      const titleCounter = document.getElementById('test-title-counter');
      if (titleCounter) titleCounter.textContent = `${(d.title || '').length} / 50자`;
      const nameCounter = document.getElementById('service-name-counter');
      if (nameCounter) nameCounter.textContent = `${(d.serviceName || '').length} / 20자`;

      const thumbImg = document.getElementById('thumbnail-img-preview');
      const removeThumbBtn = document.getElementById('btn-remove-thumbnail');
      if (thumbImg) {
        if (d.thumbnailUrl) {
          thumbImg.src = d.thumbnailUrl;
          thumbImg.classList.remove('hidden');
          if (removeThumbBtn) removeThumbBtn.classList.remove('hidden');
        } else {
          thumbImg.removeAttribute('src');
          thumbImg.classList.add('hidden');
          if (removeThumbBtn) removeThumbBtn.classList.add('hidden');
        }
      }

      // 3. 타겟 및 리워드 (Step 3)
      if (d.startDate) setVal('input-start-date', d.startDate);
      if (typeof applyProjectStartDateLimit === 'function') applyProjectStartDateLimit();
      if (d.endDate) setVal('input-end-date', d.endDate);
      if (d.testDuration) setVal('select-test-duration', d.testDuration);
      if (d.targetCount) setVal('input-target-count', d.targetCount);
      if (d.rewardCoin) setVal('input-reward-coin', d.rewardCoin);
      if (typeof calculateTotalCost === 'function') calculateTotalCost();

      if (Array.isArray(d.targetAges)) {
        document.querySelectorAll('input[name="targetAge"]').forEach(cb => {
          cb.checked = d.targetAges.includes(cb.value);
        });
      }
      if (Array.isArray(d.targetInterests)) {
        document.querySelectorAll('input[name="targetInterest"]').forEach(cb => {
          cb.checked = d.targetInterests.includes(cb.value);
        });
      }

      if (typeof renderProjectTagChips === 'function') {
        renderProjectTagChips('tech-tags-container', d.techTags || [], '🛠️');
        renderProjectTagChips('persona-tags-container', d.personaTags || [], '🎯');
      }

      const feedbackPrivacyInput = document.getElementById('toggle-feedback-privacy');
      if (feedbackPrivacyInput) {
        feedbackPrivacyInput.checked = Boolean(d.feedbackPrivacy);
        const lbl = document.getElementById('feedback-privacy-label');
        if (lbl) {
          if (d.feedbackPrivacy) {
            lbl.textContent = '제작자만 비공개';
            lbl.className = 'text-xs font-bold text-purple-700';
          } else {
            lbl.textContent = '전체 공개';
            lbl.className = 'text-xs font-bold text-[#2F6517]';
          }
        }
      }

      // Hide prompt banner
      const banner = document.getElementById('project-draft-banner');
      if (banner) banner.classList.add('hidden');

      // Navigate to target step
      const targetStep = Math.min(Math.max(1, parseInt(draftRecord.current_step, 10) || 1), 3);
      if (typeof goToStep === 'function') goToStep(targetStep);

      const savedTime = draftRecord.updated_at || draftRecord.savedAt;
      if (savedTime) updateProjectDraftStatusUI(savedTime);

      showGenericToast('📂 임시저장된 프로젝트 내용을 불러왔습니다.', '✨');
      return true;
    }

    async function checkAndPromptProjectCreationDraft() {
      if (isProjectEditMode) return null;

      let draftRecord = null;

      // 1. Try DB first if logged in
      const dataService = window.donDwaeDataService;
      if (dataService && typeof dataService.fetchProjectDraft === 'function' && window.currentAuthUserId) {
        try {
          draftRecord = await dataService.fetchProjectDraft();
        } catch (e) {
          console.warn('[Draft] DB fetch exception:', e);
        }
      }

      // 2. Fallback to localStorage if DB is empty or user is offline
      if (!draftRecord || !draftRecord.draft_data) {
        try {
          const localVal = localStorage.getItem(getProjectDraftLocalKey());
          if (localVal) {
            const parsed = JSON.parse(localVal);
            const isExpired = !Number.isFinite(Number(parsed?.savedAt))
              || Number(parsed.savedAt) > Date.now()
              || Date.now() - Number(parsed.savedAt) > PROJECT_DRAFT_MAX_AGE_MS;
            if (!isExpired && parsed.draft_data) {
              draftRecord = parsed;
            } else {
              localStorage.removeItem(getProjectDraftLocalKey());
            }
          }
        } catch (e) {
          console.warn('[Draft] Local fallback parse failed:', e);
        }
      }

      const banner = document.getElementById('project-draft-banner');
      const timeText = document.getElementById('project-draft-banner-time');

      if (draftRecord && draftRecord.draft_data) {
        window._activeProjectDraftRecord = draftRecord;
        if (banner) {
          const timestamp = draftRecord.updated_at || draftRecord.savedAt;
          if (timeText && timestamp) {
            const d = new Date(timestamp);
            const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            timeText.textContent = `저장 일시: ${formatted} (Step 0${draftRecord.current_step || 1} 작성 중)`;
          }
          banner.classList.remove('hidden');
        }
        return draftRecord;
      } else {
        window._activeProjectDraftRecord = null;
        if (banner) banner.classList.add('hidden');
        updateProjectDraftStatusUI(null);
        return null;
      }
    }

    async function handleSaveDraftClick() {
      await saveProjectCreationDraft({ showToast: true });
    }

    function handleRestoreDraftClick() {
      if (window._activeProjectDraftRecord) {
        restoreProjectCreationDraft(window._activeProjectDraftRecord);
      }
    }

    async function handleDiscardDraftClick() {
      await clearProjectCreationDraft();
      showGenericToast('🗑️ 이전 임시저장 내용이 삭제되었습니다. 새로 작성을 시작합니다.', 'ℹ️');
    }

    async function clearProjectCreationDraft() {
      window._activeProjectDraftRecord = null;
      try {
        localStorage.removeItem(getProjectDraftLocalKey());
      } catch (e) {}

      const dataService = window.donDwaeDataService;
      if (dataService && typeof dataService.deleteProjectDraft === 'function' && window.currentAuthUserId) {
        try {
          await dataService.deleteProjectDraft();
        } catch (e) {
          console.warn('[Draft] Delete DB draft failed:', e);
        }
      }

      const banner = document.getElementById('project-draft-banner');
      if (banner) banner.classList.add('hidden');
      updateProjectDraftStatusUI(null);
    }

    window.saveProjectCreationDraft = saveProjectCreationDraft;
    window.restoreProjectCreationDraft = restoreProjectCreationDraft;
    window.checkAndPromptProjectCreationDraft = checkAndPromptProjectCreationDraft;
    window.clearProjectCreationDraft = clearProjectCreationDraft;
    window.handleSaveDraftClick = handleSaveDraftClick;
    window.handleRestoreDraftClick = handleRestoreDraftClick;
    window.handleDiscardDraftClick = handleDiscardDraftClick;
