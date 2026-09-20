    function normalizeProjectTag(value) {
      return String(value || '')
        .replace(/^#+/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40);
    }

    function appendProjectTagChip(containerId, value, icon) {
      const container = document.getElementById(containerId);
      const normalized = normalizeProjectTag(value);
      if (!container || !normalized) return false;

      const existingTags = Array.from(container.querySelectorAll('[data-project-tag]'));
      if (existingTags.some(tag => tag.dataset.projectTag.toLowerCase() === normalized.toLowerCase())) {
        return false;
      }
      if (existingTags.length >= PROJECT_TAG_LIMIT) {
        showGenericToast(`태그는 최대 ${PROJECT_TAG_LIMIT}개까지 추가할 수 있습니다.`, '⚠️');
        return false;
      }

      const tagChip = document.createElement('span');
      tagChip.dataset.projectTag = normalized;
      tagChip.className = 'px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 shadow-2xs';

      const tagText = document.createElement('span');
      tagText.textContent = `${icon} ${normalized}`;
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'text-neutral-400 hover:text-red-500 text-xs ml-0.5';
      removeButton.setAttribute('aria-label', `${normalized} 태그 삭제`);
      removeButton.textContent = '✕';
      removeButton.addEventListener('click', () => tagChip.remove());

      tagChip.append(tagText, removeButton);
      container.appendChild(tagChip);
      return true;
    }

    function addProjectTagsFromInput({ inputId, containerId, icon, value = '' }) {
      const input = document.getElementById(inputId);
      const sourceValue = value || input?.value || '';
      sourceValue.split(/[,，]/).forEach(tag => appendProjectTagChip(containerId, tag, icon));
      if (!value && input) input.value = '';
    }

    function addTechTag(value = '') {
      addProjectTagsFromInput({
        inputId: 'input-tech-tag',
        containerId: 'tech-tags-container',
        icon: '🛠️',
        value
      });
    }

    function addPersonaTag(value = '') {
      addProjectTagsFromInput({
        inputId: 'input-target-persona-tag',
        containerId: 'persona-tags-container',
        icon: '🎯',
        value
      });
    }

    function collectProjectTags(containerId) {
      return Array.from(document.querySelectorAll(`#${containerId} [data-project-tag]`))
        .map(tag => normalizeProjectTag(tag.dataset.projectTag))
        .filter(Boolean);
    }

    function formatLocalDateValue(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function getTodayDateValue() {
      return formatLocalDateValue(new Date());
    }

    function goToStep(stepNum) {
      currentCreateStep = stepNum;
      const line = document.getElementById('step-progress-line');
      const b1 = document.getElementById('step-badge-1');
      const b2 = document.getElementById('step-badge-2');
      const b3 = document.getElementById('step-badge-3');
      const l1 = document.getElementById('step-label-1');
      const l2 = document.getElementById('step-label-2');
      const l3 = document.getElementById('step-label-3');

      const s1 = document.getElementById('form-section-1');
      const s2 = document.getElementById('form-section-2');
      const s3 = document.getElementById('form-section-3');

      // 100% Reliable Hide via inline display
      if (s1) s1.style.display = 'none';
      if (s2) s2.style.display = 'none';
      if (s3) s3.style.display = 'none';

      if (stepNum === 1) {
        if (s1) s1.style.display = 'flex';
        if (line) line.style.width = '20%';
        if (b1) { b1.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b1.textContent = '1'; }
        if (b2) { b2.className = 'w-9 h-9 rounded-full bg-[#F4F4F5] text-neutral-muted flex items-center justify-center font-bold text-sm border-2 border-[#E4E4E7]'; b2.textContent = '2'; }
        if (b3) { b3.className = 'w-9 h-9 rounded-full bg-[#F4F4F5] text-neutral-muted flex items-center justify-center font-bold text-sm border-2 border-[#E4E4E7]'; b3.textContent = '3'; }
        if (l1) l1.className = 'text-xs font-semibold text-neutral-dark';
        if (l2) l2.className = 'text-xs font-medium text-neutral-muted';
        if (l3) l3.className = 'text-xs font-medium text-neutral-muted';
      } else if (stepNum === 2) {
        if (s2) s2.style.display = 'flex';
        if (line) line.style.width = '50%';
        if (b1) { b1.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b1.textContent = '✓'; }
        if (b2) { b2.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b2.textContent = '2'; }
        if (b3) { b3.className = 'w-9 h-9 rounded-full bg-[#F4F4F5] text-neutral-muted flex items-center justify-center font-bold text-sm border-2 border-[#E4E4E7]'; b3.textContent = '3'; }
        if (l1) l1.className = 'text-xs font-semibold text-neutral-dark';
        if (l2) l2.className = 'text-xs font-semibold text-neutral-dark';
        if (l3) l3.className = 'text-xs font-medium text-neutral-muted';
      } else if (stepNum === 3) {
        if (s3) s3.style.display = 'flex';
        if (line) line.style.width = '90%';
        if (b1) { b1.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b1.textContent = '✓'; }
        if (b2) { b2.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b2.textContent = '✓'; }
        if (b3) { b3.className = 'w-9 h-9 rounded-full bg-primary text-neutral-dark flex items-center justify-center font-bold text-sm shadow-xs border-2 border-primary'; b3.textContent = '3'; }
        if (l1) l1.className = 'text-xs font-semibold text-neutral-dark';
        if (l2) l2.className = 'text-xs font-semibold text-neutral-dark';
        if (l3) l3.className = 'text-xs font-semibold text-neutral-dark';
        calculateTotalCost();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (typeof saveProjectCreationDraft === 'function' && !isProjectEditMode) {
        saveProjectCreationDraft({ showToast: false, silent: true });
      }
    }

    function requestCreateStep(stepNum) {
      if (stepNum <= currentCreateStep) {
        goToStep(stepNum);
        return true;
      }
      for (let step = currentCreateStep; step < stepNum; step += 1) {
        if (!validateCreateStep(step)) return false;
      }
      goToStep(stepNum);
      return true;
    }

    function handleFormBottomPrev() {
      if (currentCreateStep === 1) {
        navigateTo('explore');
      } else {
        goToStep(currentCreateStep - 1);
      }
    }

    function handleFormBottomNext() {
      if (currentCreateStep === 1) {
        requestCreateStep(2);
      } else if (currentCreateStep === 2) {
        requestCreateStep(3);
      } else if (currentCreateStep === 3) {
        handleStep3PublishClick();
      }
    }

    function resetCreateProjectForm() {
      clearProjectEditContext();
      const createView = document.getElementById('view-create');
      if (!createView) return;

      // 신규 등록은 현재 DOM에 남아 있는 수정/작성값을 재사용하지 않습니다.
      createView.querySelectorAll('input, textarea, select').forEach(control => {
        const inputType = (control.getAttribute('type') || '').toLowerCase();
        control.disabled = false;
        control.removeAttribute('title');
        control.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');

        if (inputType === 'radio' || inputType === 'checkbox') {
          control.checked = control.defaultChecked;
        } else if (inputType === 'file') {
          control.value = '';
        } else if (control.tagName === 'SELECT') {
          const defaultIndex = Array.from(control.options).findIndex(option => option.defaultSelected);
          control.selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
        } else {
          control.value = '';
        }
      });
      const titleInput = document.getElementById('input-test-title');
      const nameInput = document.getElementById('input-service-name');
      const descInput = document.getElementById('input-service-desc');
      const noticeInput = document.getElementById('input-test-notice');
      const urlInput = document.getElementById('input-product-web-url');
      const targetCountInput = document.getElementById('input-target-count');
      const rewardCoinInput = document.getElementById('input-reward-coin');
      const privacyInput = document.getElementById('input-privacy-items');
      const guideInput = document.getElementById('input-test-guide');
      const personaContainer = document.getElementById('persona-tags-container');
      const techTagsContainer = document.getElementById('tech-tags-container');

      if (titleInput) titleInput.value = '';
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      if (noticeInput) noticeInput.value = '';
      if (urlInput) {
        urlInput.value = '';
        urlInput.disabled = false;
        urlInput.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }
      if (targetCountInput) {
        targetCountInput.value = 0;
        targetCountInput.min = 1;
        targetCountInput.disabled = false;
        targetCountInput.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }
      if (rewardCoinInput) {
        rewardCoinInput.value = 70;
        rewardCoinInput.min = 0;
        rewardCoinInput.disabled = false;
        rewardCoinInput.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }
      if (privacyInput) privacyInput.value = '';
      if (guideInput) guideInput.value = '';
      const testLoginIdInput = document.getElementById('input-test-login-id');
      const testLoginPwInput = document.getElementById('input-test-login-pw');
      if (testLoginIdInput) testLoginIdInput.value = '';
      if (testLoginPwInput) testLoginPwInput.value = '';
      if (personaContainer) personaContainer.innerHTML = '';
      if (techTagsContainer) techTagsContainer.innerHTML = '';

      const personaInput = document.getElementById('input-target-persona-tag');
      const techTagInput = document.getElementById('input-tech-tag');
      const externalSurveyInput = document.getElementById('input-external-survey-url');
      if (personaInput) personaInput.value = '';
      if (techTagInput) techTagInput.value = '';
      if (externalSurveyInput) externalSurveyInput.value = '';

      // 수정 화면에서 만들어진 동적 항목도 신규 등록용 빈 항목으로 교체합니다.
      const questionsList = document.getElementById('questions-list');
      if (questionsList) {
        questionsList.innerHTML = '';
        addQuestionItem();
      }
      const quizList = document.getElementById('quiz-questions-list');
      if (quizList) {
        quizList.innerHTML = '';
        addQuizQuestionItem();
      }
      const voteUrlList = document.getElementById('vote-url-list');
      if (voteUrlList) {
        voteUrlList.innerHTML = '';
        addVoteUrlItem();
        addVoteUrlItem();
      }
      const voteQuestionList = document.getElementById('vote-questions-list');
      if (voteQuestionList) {
        voteQuestionList.innerHTML = '';
        addVoteQuestionItem();
      }
      const productAbQuestionList = document.getElementById('product-ab-questions-list');
      if (productAbQuestionList) productAbQuestionList.innerHTML = '';

      ['addQuestionItem()', 'addQuizQuestionItem()'].forEach(handler => {
        const addButton = createView.querySelector(`button[onclick="${handler}"]`);
        if (!addButton) return;
        addButton.disabled = false;
        addButton.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
      });

      const tCounter = document.getElementById('test-title-counter');
      if (tCounter) tCounter.textContent = '0 / 50자';
      const sCounter = document.getElementById('service-name-counter');
      if (sCounter) sCounter.textContent = '0 / 20자';

      const thumbImg = document.getElementById('thumbnail-img-preview');
      const removeThumbBtn = document.getElementById('btn-remove-thumbnail');
      if (thumbImg) {
        thumbImg.removeAttribute('src');
        thumbImg.classList.add('hidden');
      }
      if (removeThumbBtn) removeThumbBtn.classList.add('hidden');

      initializeProjectDateDefaults({ force: true });

      const durationSelect = document.getElementById('select-test-duration');
      if (durationSelect) durationSelect.value = '3분 내외';

      const webPlatformInput = document.querySelector('input[name="productSubPlatform"][value="web"]');
      if (webPlatformInput) webPlatformInput.checked = true;
      toggleProductPlatformFields('web');

      const productAbToggle = document.getElementById('toggle-product-ab');
      if (productAbToggle) productAbToggle.checked = false;
      toggleProductAbMode(false);

      resetVoteImageInputs();
      setVoteInputMode('image');

      const directMissionInput = document.querySelector('input[name="missionFormatMode"][value="direct"]');
      if (directMissionInput) directMissionInput.checked = true;
      toggleMissionFormatMode('direct');

      setVerificationMethod('none');

      const feedbackPrivacyInput = document.getElementById('toggle-feedback-privacy');
      const feedbackPrivacyLabel = document.getElementById('feedback-privacy-label');
      if (feedbackPrivacyInput) feedbackPrivacyInput.checked = false;
      if (feedbackPrivacyLabel) {
        feedbackPrivacyLabel.textContent = '전체 공개';
        feedbackPrivacyLabel.className = 'text-xs font-bold text-[#2F6517]';
      }

      const step3PublishBtnText = document.getElementById('btn-publish-step3-text');
      const step3PublishBtnIcon = document.getElementById('btn-publish-step3-icon');
      if (step3PublishBtnText) step3PublishBtnText.textContent = '테스트 게시하기';
      if (step3PublishBtnIcon) step3PublishBtnIcon.textContent = '🚀';

      // 락 해제 및 대분류 기본값(프로덕트) 복원
      const mainCatInputs = document.querySelectorAll('input[name="mainCategory"]');
      mainCatInputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('cursor-not-allowed');
      });
      const loginReqInputs = document.querySelectorAll('input[name="loginRequirementMode"]');
      loginReqInputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('cursor-not-allowed');
      });
      const noLoginRequiredInput = document.querySelector('input[name="loginRequirementMode"][value="none"]');
      if (noLoginRequiredInput) noLoginRequiredInput.checked = true;
      handleLoginRequirementChange('none');

      handleMainCategoryChange('product');
      Object.assign(testCreationStore, {
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
      });
      calculateTotalCost();
    }

    async function ensureProjectGatingPassed() {
      if (window.userHasPassedGating) return true;

      const ds = window.donDwaeDataService;
      if (!ds || !ds.supabase) return false;

      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        if (!session?.user) return false;
        const profile = await ds.fetchUserProfile(session.user.id);
        window.userHasPassedGating = !!profile?.has_passed_gating;
        window.completedTestCountFromDB = Number(profile?.completed_test_count || 0);
        return window.userHasPassedGating;
      } catch (err) {
        console.warn('[Don Dwae] Failed to verify project gating:', err.message);
        return false;
      }
    }

    function getCompletedTestCount() {
      const storedCount = Number(window.completedTestCountFromDB || 0);
      const localCount = Object.keys(userParticipatedTests).length;
      const gatedMinimum = window.userHasPassedGating ? 3 : 0;
      const bypassMinimum = isGatingBypassActive ? 3 : 0;
      return Math.max(storedCount, localCount, gatedMinimum, bypassMinimum);
    }

    window.openPledgeModalLocal = function () {
      if (window.donDwaeDataService && window.donDwaeDataService.supabase) {
        window.donDwaeDataService.supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user) {
            alert('프로젝트를 등록하시려면 먼저 로그인해 주세요!');
            navigateTo('login');
            return;
          }
          proceedPledgeModal();
        });
      } else {
        if (!window.isUserLoggedIn) {
          alert('프로젝트를 등록하시려면 먼저 로그인해 주세요!');
          navigateTo('login');
          return;
        }
        proceedPledgeModal();
      }
    };

    function proceedPledgeModal() {
      const modal = document.getElementById('pledge-modal');
      const viewBlocked = document.getElementById('pledge-view-blocked');
      const viewAllowed = document.getElementById('pledge-view-allowed');

      const count = getCompletedTestCount();

      if (count < 3 && !window.userHasPassedGating) {
        if (viewBlocked) viewBlocked.classList.remove('hidden');
        if (viewAllowed) viewAllowed.classList.add('hidden');

        const badge = document.getElementById('pledge-test-count-badge');
        const bar = document.getElementById('pledge-test-count-bar');
        if (badge) badge.textContent = `${count} / 3 회`;
        if (bar) bar.style.width = `${Math.min(100, Math.round((count / 3) * 100))}%`;
      } else {
        if (viewBlocked) viewBlocked.classList.add('hidden');
        if (viewAllowed) viewAllowed.classList.remove('hidden');

        const countEl = document.getElementById('pledge-user-completed-count');
        if (countEl) countEl.textContent = `${count >= 3 ? count : '게이팅 완료 (1회 충족)'}`;
      }

      if (modal) modal.classList.remove('hidden');
    }

    function openPledgeModal() {
      window.openPledgeModalLocal();
    }

    function closePledgeModal() {
      const modal = document.getElementById('pledge-modal');
      if (modal) modal.classList.add('hidden');
    }

    async function confirmPledgeAndProceed() {
      const ds = window.donDwaeDataService;
      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        if (!session?.user) throw new Error('로그인이 필요합니다.');
        const profile = await ds.fetchUserProfile(session.user.id);
        window.userHasPassedGating = !!profile?.has_passed_gating;
        if (!window.userHasPassedGating) {
          const completed = Number(profile?.completed_test_count || 0);
          showGenericToast(`프로젝트 등록 자격은 리뷰 완료 3회 후 자동 부여됩니다. (현재 ${completed}/3회)`, '🔒');
          return;
        }
        closePledgeModal();
        navigateTo('create');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to verify project gating:', err);
        showGenericToast(resolveFriendlyError(err, 'PRJ_PERMISSION_DENIED').formatted, '⚠️');
      }
    }

    function handleMainCategoryChange(cat) {
      currentMainCategory = cat;

      // Update Card Visuals & Radio Buttons
      document.querySelectorAll('.main-category-card').forEach(card => {
        card.className = 'main-category-card cursor-pointer rounded-2xl border-2 border-[#E5E7EB] hover:border-neutral-300 p-5 flex flex-col items-center text-center gap-3 transition-all';
      });

      document.querySelectorAll('input[name="mainCategory"]').forEach(radio => {
        radio.checked = (radio.value === cat);
      });

      const activeCard = document.getElementById(`card-main-${cat}`);
      if (activeCard) {
        activeCard.className = 'main-category-card cursor-pointer rounded-2xl border-2 border-primary bg-[#F4F9EE] p-5 flex flex-col items-center text-center gap-3 transition-all shadow-xs';
      }

      // Show/Hide Sub Forms
      const subContainer = document.getElementById('sub-category-form-container');
      const subProduct = document.getElementById('sub-form-product');
      const subVote = document.getElementById('sub-form-vote');
      const labelApp = document.getElementById('label-platform-app');
      const noticeApp = document.getElementById('prototype-app-disabled-notice');
      const webRadio = document.querySelector('input[name="productSubPlatform"][value="web"]');
      const webPlatformText = document.getElementById('text-platform-web');

      if (webPlatformText) {
        webPlatformText.textContent = cat === 'prototype'
          ? '🌐 웹 / Figma Link'
          : '🌐 웹사이트 (Web Site)';
      }

      if (cat === 'prototype') {
        if (webRadio) webRadio.checked = true;
        if (labelApp) labelApp.classList.add('opacity-50', 'pointer-events-none');
        if (noticeApp) noticeApp.classList.remove('hidden');
      } else {
        if (labelApp) labelApp.classList.remove('opacity-50', 'pointer-events-none');
        if (noticeApp) noticeApp.classList.add('hidden');
      }

      if (cat === 'survey') {
        if (subContainer) {
          subContainer.style.display = 'none';
          subContainer.classList.add('hidden');
        }
      } else {
        if (subContainer) {
          subContainer.style.display = 'flex';
          subContainer.classList.remove('hidden');
        }
        if (subProduct) subProduct.style.display = (cat === 'product' || cat === 'prototype') ? 'flex' : 'none';
        if (subVote) subVote.style.display = cat === 'vote' ? 'flex' : 'none';
        toggleProductPlatformFields(document.querySelector('input[name="productSubPlatform"]:checked')?.value || 'web');
      }

      // STEP 01: 검증 항목 작성 섹션 제어 (투표 시 숨김, 프로덕트/프로토타입/설문조사는 노출)
      const questionsSection = document.getElementById('section-questions-container');
      if (questionsSection) {
        questionsSection.style.display = (cat === 'vote') ? 'none' : 'flex';
      }

      // STEP 01: 섹션 번호 동적 제어 (투표 시 검증 항목이 숨겨지므로 2, 3, 4로 번호 재지정)
      const labelVerification = document.getElementById('label-section-verification');
      const labelLogin = document.getElementById('label-section-login');
      const labelGuide = document.getElementById('label-section-guide');

      if (cat === 'vote') {
        if (labelVerification) labelVerification.innerHTML = '2. 성실 참여 검증 방식 <span class="text-xs font-normal text-neutral-400">(선택)</span>';
        if (labelLogin) labelLogin.innerHTML = '3. 로그인 필요 여부 및 개인정보 명시 <span class="text-red-500">*</span>';
        if (labelGuide) labelGuide.innerHTML = '4. 테스트 진행 방법 (가이드) <span class="text-red-500">*</span>';
      } else {
        if (labelVerification) labelVerification.innerHTML = '3. 성실 참여 검증 방식 <span class="text-xs font-normal text-neutral-400">(선택)</span>';
        if (labelLogin) labelLogin.innerHTML = '4. 로그인 필요 여부 및 개인정보 명시 <span class="text-red-500">*</span>';
        if (labelGuide) labelGuide.innerHTML = '5. 테스트 진행 방법 (가이드) <span class="text-red-500">*</span>';
      }

      // STEP 02: 서비스명/서비스 소개 필드 및 제목/안내 라벨 동적 제어
      const fieldServiceNameBox = document.getElementById('field-service-name-box');
      const fieldServiceDescBox = document.getElementById('field-service-desc-box');
      const labelTestTitle = document.getElementById('label-test-title');
      const inputTestTitle = document.getElementById('input-test-title');
      const labelTestNotice = document.getElementById('label-test-notice');
      const inputTestNotice = document.getElementById('input-test-notice');

      if (cat === 'vote') {
        if (fieldServiceNameBox) fieldServiceNameBox.style.display = 'none';
        if (fieldServiceDescBox) fieldServiceDescBox.style.display = 'none';
        if (labelTestTitle) labelTestTitle.innerHTML = '투표 제목 <span class="text-secondary">*</span>';
        if (inputTestTitle) inputTestTitle.placeholder = '예: 브랜드 로고 A안 vs B안 선호도 조사 (최대 50자)';
        if (labelTestNotice) labelTestNotice.innerHTML = '안내 내용 / 투표 목적 <span class="text-secondary">*</span>';
        if (inputTestNotice) inputTestNotice.placeholder = '참여자에게 투표의 취지나 배경을 안내해주세요.';
      } else if (cat === 'survey') {
        if (fieldServiceNameBox) fieldServiceNameBox.style.display = 'none';
        if (fieldServiceDescBox) fieldServiceDescBox.style.display = 'none';
        if (labelTestTitle) labelTestTitle.innerHTML = '설문 제목 <span class="text-secondary">*</span>';
        if (inputTestTitle) inputTestTitle.placeholder = '예: 2030 가계부 앱 사용 패턴 설문 (최대 50자)';
        if (labelTestNotice) labelTestNotice.innerHTML = '안내 내용 / 설문 목적 <span class="text-secondary">*</span>';
        if (inputTestNotice) inputTestNotice.placeholder = '참여자에게 설문조사의 목적과 배경을 안내해주세요.';
      } else {
        if (fieldServiceNameBox) fieldServiceNameBox.style.display = 'block';
        if (fieldServiceDescBox) fieldServiceDescBox.style.display = 'block';
        if (labelTestTitle) labelTestTitle.innerHTML = '테스트 제목 <span class="text-secondary">*</span>';
        if (inputTestTitle) inputTestTitle.placeholder = '예: 직관적인 가계부 앱 온보딩 및 첫 거래 기록 사용성 테스트 (최대 50자)';
        if (labelTestNotice) labelTestNotice.innerHTML = '안내 내용 / 테스트 목적 <span class="text-secondary">*</span>';
        if (inputTestNotice) inputTestNotice.placeholder = '테스터에게 전달할 배경이나 특히 주의 깊게 봐주었으면 하는 부분을 적어주세요.';
      }
    }

    function toggleProductPlatformFields(platform) {
      const webFields = document.getElementById('product-web-fields');
      const appStoreFields = document.getElementById('product-app-store-fields');
      const appPrototypeFields = document.getElementById('product-app-prototype-fields');

      if (platform === 'web') {
        if (webFields) webFields.style.display = 'flex';
        if (appStoreFields) appStoreFields.style.display = 'none';
        if (appPrototypeFields) appPrototypeFields.style.display = 'none';
      } else {
        if (webFields) webFields.style.display = 'none';
        if (currentMainCategory === 'product') {
          if (appStoreFields) appStoreFields.style.display = 'flex';
          if (appPrototypeFields) appPrototypeFields.style.display = 'none';
        } else {
          if (appStoreFields) appStoreFields.style.display = 'none';
          if (appPrototypeFields) appPrototypeFields.style.display = 'flex';
        }
      }

      // Update AB fields if active
      const webAb = document.getElementById('product-ab-web-fields');
      const appAb = document.getElementById('product-ab-app-fields');
      if (webAb) webAb.style.display = (isProductAbMode && platform === 'web') ? 'grid' : 'none';
      if (appAb) appAb.style.display = (isProductAbMode && platform === 'app') ? 'grid' : 'none';
    }

    function toggleMissionFormatMode(mode) {
      const directBox = document.getElementById('mission-direct-container');
      const linkBox = document.getElementById('mission-link-container');
      if (directBox) directBox.style.display = mode === 'direct' ? 'flex' : 'none';
      if (linkBox) linkBox.style.display = mode === 'link' ? 'flex' : 'none';
    }

    function toggleProductAbMode(isAbOn) {
      isProductAbMode = isAbOn;
      const singleFields = document.getElementById('product-single-fields');
      const abFields = document.getElementById('product-ab-fields');
      if (singleFields) singleFields.style.display = isAbOn ? 'none' : 'flex';
      if (abFields) abFields.style.display = isAbOn ? 'flex' : 'none';

      // Update AB sub fields based on platform
      const platform = document.querySelector('input[name="productSubPlatform"]:checked')?.value || 'web';
      const webAb = document.getElementById('product-ab-web-fields');
      const appAb = document.getElementById('product-ab-app-fields');
      if (webAb) webAb.style.display = (isAbOn && platform === 'web') ? 'grid' : 'none';
      if (appAb) appAb.style.display = (isAbOn && platform === 'app') ? 'grid' : 'none';
    }

    function setVoteInputMode(mode = 'image') {
      currentVoteInputMode = mode === 'url' ? 'url' : 'image';
      const btnImage = document.getElementById('btn-vote-input-mode-image');
      const btnUrl = document.getElementById('btn-vote-input-mode-url');

      if (btnImage) btnImage.className = currentVoteInputMode === 'image'
        ? 'py-2.5 px-4 rounded-xl border-2 border-primary bg-primary/10 text-primary-dark font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5'
        : 'py-2.5 px-4 rounded-xl border border-neutral-200 bg-white text-neutral-600 font-bold hover:bg-neutral-50 transition-all cursor-pointer flex items-center justify-center gap-1.5';
      if (btnUrl) btnUrl.className = currentVoteInputMode === 'url'
        ? 'py-2.5 px-4 rounded-xl border-2 border-primary bg-primary/10 text-primary-dark font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5'
        : 'py-2.5 px-4 rounded-xl border border-neutral-200 bg-white text-neutral-600 font-bold hover:bg-neutral-50 transition-all cursor-pointer flex items-center justify-center gap-1.5';

      const imgBox = document.getElementById('vote-image-input-container');
      const urlBox = document.getElementById('vote-url-input-container');

      if (imgBox) imgBox.style.display = currentVoteInputMode === 'image' ? 'flex' : 'none';
      if (urlBox) urlBox.style.display = currentVoteInputMode === 'url' ? 'flex' : 'none';
    }

    function setVoteInputModeLocked(isLocked) {
      ['image', 'url'].forEach(mode => {
        const button = document.getElementById(`btn-vote-input-mode-${mode}`);
        if (!button) return;
        button.disabled = Boolean(isLocked);
        button.classList.toggle('opacity-60', Boolean(isLocked));
        button.classList.toggle('cursor-not-allowed', Boolean(isLocked));
        button.classList.toggle('cursor-pointer', !isLocked);
      });
    }

    function setVoteImagePreview(optionKey, imageUrl = '', label = '') {
      const key = String(optionKey || '').toUpperCase();
      if (!['A', 'B'].includes(key)) return;
      const suffix = key.toLowerCase();
      const preview = document.getElementById(`vote-image-preview-${suffix}`);
      const image = document.getElementById(`vote-image-preview-img-${suffix}`);
      const name = document.getElementById(`vote-image-preview-name-${suffix}`);
      if (!preview || !image || !name) return;

      if (!imageUrl) {
        image.removeAttribute('src');
        name.textContent = '';
        preview.classList.add('hidden');
        return;
      }
      image.src = imageUrl;
      name.textContent = label || `${key}안 이미지`;
      preview.classList.remove('hidden');
    }

    function revokeVoteImagePreview(optionKey) {
      const key = String(optionKey || '').toUpperCase();
      const objectUrl = voteImagePreviewObjectUrls[key];
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      voteImagePreviewObjectUrls[key] = '';
    }

    function handleVoteImageSelected(optionKey, input) {
      const key = String(optionKey || '').toUpperCase();
      const file = input?.files?.[0];
      revokeVoteImagePreview(key);
      if (!file) {
        setVoteImagePreview(key, existingVoteImageUrls[key], existingVoteImageUrls[key] ? '기존 저장 이미지' : '');
        return;
      }

      try {
        window.donDwaeDataService?.validateVoteImageFile(file);
      } catch (error) {
        input.value = '';
        setVoteImagePreview(key, existingVoteImageUrls[key], existingVoteImageUrls[key] ? '기존 저장 이미지' : '');
        showGenericToast(error?.message || '이미지 파일을 확인해 주세요.', '⚠️');
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      voteImagePreviewObjectUrls[key] = objectUrl;
      setVoteImagePreview(key, objectUrl, `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    function resetVoteImageInputs() {
      ['A', 'B'].forEach(optionKey => {
        revokeVoteImagePreview(optionKey);
        existingVoteImageUrls[optionKey] = '';
        const input = document.getElementById(`input-vote-image-${optionKey.toLowerCase()}`);
        if (input) {
          input.value = '';
          input.disabled = false;
        }
        setVoteImagePreview(optionKey);
      });
      setVoteInputModeLocked(false);
    }

    function toggleSurveySubMode(mode) {
      const linkFields = document.getElementById('survey-link-fields');
      const directFields = document.getElementById('survey-direct-fields');
      if (linkFields) linkFields.style.display = mode === 'link' ? 'flex' : 'none';
      if (directFields) directFields.style.display = mode === 'direct' ? 'flex' : 'none';
    }

    function handleThumbnailUpload(input) {
      if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const previewImg = document.getElementById('thumbnail-img-preview');
          const removeBtn = document.getElementById('btn-remove-thumbnail');
          if (previewImg) {
            previewImg.src = e.target.result;
            previewImg.classList.remove('hidden');
          }
          if (removeBtn) removeBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
      }
    }

    function removeThumbnailImage() {
      const fileInput = document.getElementById('input-thumbnail-file');
      const previewImg = document.getElementById('thumbnail-img-preview');
      const removeBtn = document.getElementById('btn-remove-thumbnail');
      if (fileInput) fileInput.value = '';
      if (previewImg) {
        previewImg.removeAttribute('src');
        previewImg.classList.add('hidden');
      }
      if (removeBtn) removeBtn.classList.add('hidden');
    }

    function handleLoginRequirementChange(mode) {
      const cardNo = document.getElementById('card-login-req-no');
      const cardYes = document.getElementById('card-login-req-yes');
      const detailFields = document.getElementById('login-detail-fields');

      if (mode === 'required') {
        if (cardNo) cardNo.className = 'flex items-center justify-between p-3.5 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 cursor-pointer transition-all';
        if (cardYes) cardYes.className = 'flex items-center justify-between p-3.5 rounded-xl border-2 border-primary bg-[#F4F9EE] cursor-pointer transition-all';
        if (detailFields) detailFields.classList.remove('hidden');
      } else {
        if (cardNo) cardNo.className = 'flex items-center justify-between p-3.5 rounded-xl border-2 border-primary bg-[#F4F9EE] cursor-pointer transition-all';
        if (cardYes) cardYes.className = 'flex items-center justify-between p-3.5 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 cursor-pointer transition-all';
        if (detailFields) detailFields.classList.add('hidden');
      }
      updateTestCredentialFieldGuidance(mode);
    }

    function handleQuestionTypeChange(selectEl) {
      const questionItem = selectEl.closest('.question-item');
      if (!questionItem) return;
      const type = selectEl.value;
      questionItem.setAttribute('data-question-type', type);
      const optionsBox = questionItem.querySelector('.question-options-box');
      if (optionsBox) {
        optionsBox.style.display = (type === 'essay') ? 'none' : 'flex';
      }
    }

    function removeOptionFromQuestion(btnEl) {
      const optionItem = btnEl.closest('.option-item');
      const container = optionItem?.parentElement;
      if (optionItem) optionItem.remove();
      if (container) reindexQuestionOptions(container);
    }

    function reindexQuestionOptions(container) {
      const options = container.querySelectorAll('.option-item');
      options.forEach((opt, idx) => {
        const numSpan = opt.querySelector('.option-num');
        if (numSpan) numSpan.textContent = `${idx + 1}.`;
      });
    }

    function reindexQuestionTitles() {
      const list = document.getElementById('questions-list');
      if (!list) return;
      const items = list.querySelectorAll('.question-item');
      items.forEach((item, idx) => {
        const badge = item.querySelector('.px-2.5');
        if (badge) badge.textContent = `검증 ${idx + 1}`;
      });
    }

    function setVerificationMethod(method = 'none') {
      currentVerificationMethod = ['quiz', 'screenshot'].includes(method) ? method : 'none';
      const isQuiz = currentVerificationMethod === 'quiz';
      const isScreenshot = currentVerificationMethod === 'screenshot';

      const quizSection = document.getElementById('verification-quiz-section');
      const screenshotNote = document.getElementById('verification-screenshot-note');
      if (quizSection) quizSection.classList.toggle('hidden', !isQuiz);
      if (quizSection) quizSection.classList.toggle('flex', isQuiz);
      if (screenshotNote) screenshotNote.classList.toggle('hidden', !isScreenshot);

      document.querySelectorAll('[data-verification-option]').forEach(card => {
        const selected = card.dataset.verificationOption === currentVerificationMethod;
        card.className = `verification-method-card cursor-pointer rounded-xl border-2 p-4 flex flex-col gap-1.5 transition-all ${
          selected ? 'border-[#2F6517] bg-[#F4F9EE]' : 'border-neutral-200 bg-white'
        }`;
        const radio = card.querySelector('input[name="verificationMethod"]');
        if (radio) radio.checked = selected;
      });
    }

    function reindexQuizTitles() {
      const list = document.getElementById('quiz-questions-list');
      if (!list) return;
      const items = list.querySelectorAll('.quiz-item');
      items.forEach((item, idx) => {
        const numSpan = item.querySelector('.rounded-full');
        const titleSpan = item.querySelector('.text-neutral-dark span:last-child');
        if (numSpan) numSpan.textContent = idx + 1;
        if (titleSpan) titleSpan.textContent = `퀴즈 질문 ${idx + 1}`;
      });
    }
