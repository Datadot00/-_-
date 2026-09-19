    function updatePledgeModalUI() {
      const count = getCompletedTestCount();
      const badge = document.getElementById('pledge-test-count-badge');
      const bar = document.getElementById('pledge-test-count-bar');
      const countEl = document.getElementById('pledge-user-completed-count');
      const bannerBadge = document.getElementById('dashboard-qualification-badge');

      if (badge) badge.textContent = `${count} / 3 회`;
      if (bar) bar.style.width = `${Math.min(100, Math.round((count / 3) * 100))}%`;
      if (countEl) countEl.textContent = `${count}회`;

      if (bannerBadge) {
        if (count >= 3) {
          bannerBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/30 border border-primary/50 text-[#25500F] text-xs font-bold mb-3';
          bannerBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-primary animate-ping"></span> 검증 자격 획득 (다른 서비스 테스트 ${count}/3 완료)`;
        } else {
          bannerBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/30 border border-secondary/50 text-[#8A2B43] text-xs font-bold mb-3';
          bannerBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> 게시 자격 진행 중 (다른 서비스 테스트 ${count}/3 완료)`;
        }
      }
    }

    function renderProjectTagChips(containerId, tags, icon) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      (Array.isArray(tags) ? tags : []).forEach(tag => appendProjectTagChip(containerId, tag, icon));
    }

    function addProductAbQuestionItem() {
      const list = document.getElementById('product-ab-questions-list');
      if (!list) return;
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-white animate-in fade-in duration-150';
      div.innerHTML = `
        <span class="px-2 py-0.5 rounded bg-primary/20 text-primary-dark font-extrabold text-xs shrink-0">질문 ${count}</span>
        <input type="text" placeholder="A안과 B안을 비교할 질문을 입력하세요..." class="flex-1 text-xs font-medium focus:outline-none" />
        <button type="button" onclick="this.parentElement.remove()" class="text-neutral-400 hover:text-neutral-600 text-xs px-1">삭제</button>
      `;
      list.appendChild(div);
    }

    function addVoteUrlItem() {
      const list = document.getElementById('vote-url-list');
      if (!list) return;
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2 p-3 rounded-xl border border-neutral-200 bg-white animate-in fade-in duration-150';
      div.innerHTML = `
        <span class="text-xs font-bold text-neutral-500 shrink-0">항목 ${count}</span>
        <input type="url" placeholder="https://example.com" class="flex-1 text-xs font-medium focus:outline-none" />
        <button type="button" onclick="this.parentElement.remove()" class="text-neutral-400 hover:text-neutral-600 text-xs px-1">삭제</button>
      `;
      list.appendChild(div);
    }

    function addVoteQuestionItem() {
      const list = document.getElementById('vote-questions-list');
      if (!list) return;
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-white hover:border-primary/60 transition-colors animate-in fade-in duration-150';
      div.innerHTML = `
        <span class="px-2 py-0.5 rounded bg-primary/20 text-primary-dark font-extrabold text-xs shrink-0">질문 ${count}</span>
        <input type="text" placeholder="예: 어떤 안이 더 좋아 보이나요? 왜 그렇게 생각하시나요?" class="flex-1 text-xs font-medium focus:outline-none" />
        <button type="button" onclick="this.parentElement.remove()" class="text-neutral-400 hover:text-neutral-600 text-xs px-1">삭제</button>
      `;
      list.appendChild(div);
    }

    function addSurveyQuestionItem() {
      const list = document.getElementById('survey-questions-list');
      if (!list) return;
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'flex items-center gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-white animate-in fade-in duration-150';
      div.innerHTML = `
        <span class="px-2 py-0.5 rounded bg-primary/20 text-primary-dark font-extrabold text-xs">문항 ${count}</span>
        <input type="text" placeholder="설문 질문 내용을 입력하세요..." class="flex-1 text-xs font-medium focus:outline-none" />
        <button type="button" onclick="this.parentElement.remove()" class="text-neutral-400 hover:text-neutral-600 text-xs px-1">삭제</button>
      `;
      list.appendChild(div);
    }

    function updateTestCredentialFieldGuidance(mode) {
      const accountIdLabel = document.getElementById('label-test-login-id');
      const accountPasswordLabel = document.getElementById('label-test-login-pw');
      const accountIdInput = document.getElementById('input-test-login-id');
      const accountPasswordInput = document.getElementById('input-test-login-pw');
      const helpText = document.getElementById('test-login-credentials-help');
      const preservesExistingCredentials = mode === 'required'
        && Boolean(getActiveProjectEditId())
        && editingOriginalLoginRequired === true;

      if (accountIdLabel) {
        accountIdLabel.innerHTML = preservesExistingCredentials
          ? '테스트용 계정 ID / 이메일 <span class="text-neutral-400 font-medium">(선택, 변경 시에만 입력)</span>'
          : '테스트용 계정 ID / 이메일 <span class="text-neutral-400 font-medium">(선택)</span>';
      }
      if (accountPasswordLabel) {
        accountPasswordLabel.innerHTML = preservesExistingCredentials
          ? '테스트용 계정 비밀번호 <span class="text-neutral-400 font-medium">(선택, 변경 시에만 입력)</span>'
          : '테스트용 계정 비밀번호 <span class="text-neutral-400 font-medium">(선택)</span>';
      }
      if (accountIdInput) {
        accountIdInput.required = false;
        accountIdInput.placeholder = preservesExistingCredentials
          ? '비워두면 기존 테스트 계정을 유지합니다.'
          : '예: tester01@dondwae.io (체험 계정, 선택사항)';
      }
      if (accountPasswordInput) {
        accountPasswordInput.required = false;
        accountPasswordInput.placeholder = preservesExistingCredentials
          ? '비워두면 기존 비밀번호를 유지합니다.'
          : '예: test1234! (선택사항)';
      }
      if (helpText) {
        helpText.textContent = preservesExistingCredentials
          ? '보안을 위해 기존 계정 정보는 다시 표시하지 않습니다. 두 칸을 비워두면 저장된 계정 정보가 유지됩니다.'
          : '테스트용 공용 계정이 있는 경우 입력해 주세요. (미입력 시 테스터 본인 계정 사용 또는 직접 가입)';
      }
    }

    function addOptionToQuestion(btnEl) {
      const questionItem = btnEl.closest('.question-item');
      if (!questionItem) return;
      const container = questionItem.querySelector('.options-container');
      if (!container) return;

      const currentOptions = container.querySelectorAll('.option-item');
      if (currentOptions.length >= 5) {
        alert('선택지는 질문당 최대 5개까지 생성 가능합니다.');
        return;
      }

      const num = currentOptions.length + 1;
      const div = document.createElement('div');
      div.className = 'option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200 animate-in fade-in duration-150';
      div.innerHTML = `
        <span class="text-xs text-neutral-400 font-mono option-num">${num}.</span>
        <input type="text" placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none" />
        <button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>
      `;
      container.appendChild(div);
      reindexQuestionOptions(container);
    }

    function addQuestionItem() {
      const list = document.getElementById('questions-list');
      if (!list) return;
      if (list.children.length >= 10) {
        alert('검증 문항은 최대 10개까지 등록 가능합니다.');
        return;
      }
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'question-item p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-primary/60 transition-all flex flex-col gap-3.5 shadow-2xs animate-in fade-in duration-150';
      div.setAttribute('data-question-type', 'single');
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-1 rounded-lg bg-[#EDF8E5] text-[#2F6517] font-bold text-xs shrink-0">검증 ${count}</span>
          <input type="text" placeholder="질문 내용을 입력하세요..." class="question-title-input flex-1 text-xs font-semibold text-neutral-dark focus:outline-none border-b border-neutral-200 pb-1" />

          <select class="question-type-select text-xs font-bold bg-[#F4F4F5] px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none cursor-pointer" onchange="handleQuestionTypeChange(this)">
            <option value="essay">📝 서술형</option>
            <option value="single" selected>🔘 객관식 (단일선택)</option>
            <option value="multiple">☑️ 객관식 (복수선택)</option>
          </select>

          <label class="flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200">
            <input type="checkbox" class="question-required-toggle accent-primary-dark w-3.5 h-3.5" checked />
            <span class="text-neutral-700">필수</span>
          </label>

          <button type="button" onclick="this.closest('.question-item').remove(); reindexQuestionTitles();" class="text-neutral-400 hover:text-red-500 text-xs px-1 font-bold">✕ 삭제</button>
        </div>

        <div class="question-options-box pl-6 flex flex-col gap-2 border-t border-neutral-100 pt-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-neutral-500">선택지 (최대 5개)</span>
            <button type="button" onclick="addOptionToQuestion(this)" class="text-[11px] text-[#2F6517] font-extrabold hover:underline cursor-pointer">+ 선택지 추가</button>
          </div>
          <div class="options-container grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
              <span class="text-xs text-neutral-400 font-mono option-num">1.</span>
              <input type="text" placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none" />
              <button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>
            </div>
            <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
              <span class="text-xs text-neutral-400 font-mono option-num">2.</span>
              <input type="text" placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none" />
              <button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>
            </div>
          </div>
        </div>
      `;
      list.appendChild(div);
    }

    function addQuizQuestionItem() {
      const list = document.getElementById('quiz-questions-list');
      if (!list) return;
      if (list.children.length >= 3) {
        alert('검증 퀴즈는 최대 3개까지만 등록할 수 있습니다.');
        return;
      }
      const count = list.children.length + 1;
      const div = document.createElement('div');
      div.className = 'quiz-item p-4 rounded-xl border border-neutral-200 bg-white flex flex-col gap-3 shadow-2xs animate-in fade-in duration-150';
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-neutral-dark flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-primary/30 text-primary-dark flex items-center justify-center text-[11px] font-bold">${count}</span>
            <span>퀴즈 질문 ${count}</span>
          </span>
          <button type="button" onclick="this.closest('.quiz-item').remove(); reindexQuizTitles();" class="text-neutral-400 hover:text-red-500 text-xs font-bold">✕ 삭제</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <input type="text" placeholder="예: 서비스 로고 색상 또는 특정 버튼 이름" class="quiz-question-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-medium focus:outline-none" />
          </div>
          <div>
            <input type="text" placeholder="정답 입력" class="quiz-answer-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-bold bg-[#F9FAFB] focus:outline-none text-emerald-800" />
          </div>
        </div>
      `;
      list.appendChild(div);
    }

    function calculateTotalCost() {
      const rewardInput = document.getElementById('input-reward-coin');
      const targetInput = document.getElementById('input-target-count');
      if (!rewardInput || !targetInput) return;

      const reward = Math.max(0, parseInt(rewardInput.value, 10) || 0);
      const target = Math.max(0, parseInt(targetInput.value, 10) || 0);
      const newTotal = reward * target;
      const balance = userCoinBalance;
      const origReward = Number(myCreatedTest?.rewardCoin ?? 0);
      const origTarget = Number(myCreatedTest?.targetCount ?? 1);
      const originalTotal = isProjectEditMode && myCreatedTest
        ? origReward * origTarget
        : 0;
      const budgetToApply = isProjectEditMode ? Math.max(0, newTotal - originalTotal) : newTotal;
      const deficit = Math.max(0, budgetToApply - balance);

      const totalCoin = document.getElementById('total-cost-coin');
      const summary = document.getElementById('total-cost-summary');
      const banner = document.getElementById('step3-coin-status-banner');
      const btnText = document.getElementById('btn-publish-step3-text');
      const btnIcon = document.getElementById('btn-publish-step3-icon');
      const btnPublish = document.getElementById('btn-publish-test-step3');

      if (totalCoin) totalCoin.textContent = newTotal.toLocaleString();

      if (summary) {
        const formula = `${target.toLocaleString()}명 × ${reward.toLocaleString()}코인 = <strong>${newTotal.toLocaleString()}코인</strong>`;
        if (isProjectEditMode) {
          summary.innerHTML = `총 예산 ${formula} · 추가 반영 <strong>${budgetToApply.toLocaleString()}코인</strong>`;
        } else {
          summary.innerHTML = `계산식: ${formula}`;
        }
        if (deficit > 0) {
          summary.innerHTML += ` · <span class="font-extrabold text-amber-700">보유액보다 ${deficit.toLocaleString()}코인 많음</span>`;
        }
        summary.className = deficit > 0
          ? 'text-[11px] font-semibold text-amber-700'
          : 'text-[11px] font-semibold text-[#2E5E14]';
      }

      if (banner) {
        if (deficit > 0) {
          banner.className = 'rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 animate-in fade-in duration-200';
          banner.innerHTML = `
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg">🧪</div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">테스트 모드</span>
                  <span class="text-xs font-extrabold text-amber-900">결제 단계 없이 등록할 수 있습니다</span>
                </div>
                <p class="mt-1 text-xs font-medium leading-relaxed text-amber-800">
                  적용 예산 <strong>${budgetToApply.toLocaleString()}코인</strong> 중 <strong>${deficit.toLocaleString()}코인</strong>이 현재 보유액보다 많지만,
                  테스트 기간에는 결제 모달을 표시하지 않고 바로 저장합니다.
                </p>
              </div>
            </div>`;
        } else if (budgetToApply > 0) {
          const remaining = Math.max(0, balance - budgetToApply);
          banner.className = 'rounded-2xl border border-primary/40 bg-[#F4F9EE] p-4 sm:p-5 animate-in fade-in duration-200';
          banner.innerHTML = `
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/30 text-lg">🪙</div>
              <div>
                <span class="text-xs font-extrabold text-[#1F450B]">${isProjectEditMode ? '수정 차액' : '리워드 예산'} ${budgetToApply.toLocaleString()}코인</span>
                <p class="mt-1 text-xs font-medium text-[#354326]">현재 보유 ${balance.toLocaleString()}코인 · 반영 후 예상 잔액 ${remaining.toLocaleString()}코인</p>
              </div>
            </div>`;
        } else {
          banner.className = 'rounded-2xl border border-neutral-200 bg-neutral-50 p-4 animate-in fade-in duration-200';
          banner.innerHTML = `
            <div class="flex items-center gap-3 text-xs font-medium text-neutral-600">
              <span class="text-lg">ℹ️</span>
              <span>${isProjectEditMode ? '추가로 반영할 리워드 예산이 없습니다.' : '모집인원과 1인당 코인을 입력하면 총 예산이 표시됩니다.'}</span>
            </div>`;
        }
      }

      if (btnText) btnText.textContent = isProjectEditMode ? '수정 완료하기' : '프로젝트 게시하기';
      if (btnIcon) btnIcon.textContent = isProjectEditMode ? '✏️' : '🚀';
      if (btnPublish) {
        btnPublish.className = 'px-8 py-3.5 rounded-full bg-primary hover:bg-primary-hover active:scale-95 text-neutral-dark font-extrabold text-sm shadow-sm transition-all flex items-center gap-2 border border-primary-dark/20 cursor-pointer';
      }
    }

    function originalPublishOld() {
      testCreationStore.serviceName = document.getElementById('input-service-name').value.trim();
      testCreationStore.serviceDesc = document.getElementById('input-service-desc').value.trim();
      testCreationStore.serviceUrl = document.getElementById('input-service-url').value.trim();
      testCreationStore.rewardCoin = parseInt(document.getElementById('input-reward-coin').value) || 0;
      testCreationStore.targetCount = parseInt(document.getElementById('input-target-count').value) || 10;
      testCreationStore.requireScreenshot = document.getElementById('toggle-screenshot').checked;

      const activeNickname = document.getElementById('mypage-user-nickname')?.textContent.trim() || '크리에이터';

      const grid = document.getElementById('dashboard-cards-grid');
      if (grid) {
        const oldCard = document.getElementById('newly-published-card');
        if (oldCard) oldCard.remove();

        const newCard = document.createElement('article');
        newCard.id = 'newly-published-card';
        newCard.onclick = () => navigateTo('post');
        newCard.className = 'feed-card bg-white rounded-2xl border-2 border-primary shadow-card hover:shadow-float hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group animate-in fade-in zoom-in-95';
        newCard.setAttribute('data-category', 'product');
        newCard.setAttribute('data-reward', testCreationStore.rewardCoin ?? '500');
        newCard.setAttribute('data-time', '5');
        newCard.setAttribute('data-date', new Date().toISOString().split('T')[0]);
        newCard.setAttribute('data-deadline', '14');
        newCard.setAttribute('data-recommended', '100');

        newCard.innerHTML = `
          <div class="relative bg-[#F4F9EE] border-b border-[#EAF2DE] p-3">
            <div class="w-full h-44 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs overflow-hidden p-3 flex flex-col justify-center items-center text-center relative">
              <span class="text-3xl mb-1 filter drop-shadow-xs">🎉</span>
              <span class="text-sm font-extrabold text-neutral-dark">${testCreationStore.serviceName}</span>
              <span class="text-[11px] text-neutral-muted mt-1 font-mono">${testCreationStore.serviceUrl}</span>
              <div class="mt-3 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/30 text-primary-dark font-extrabold">
                  실시간 테스터 모집 중
                </span>
              </div>
            </div>

            <div class="absolute top-5 left-5 flex items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-md bg-primary text-[#1F450B] text-[11px] font-extrabold shadow-2xs">
                [방금 등록됨]
              </span>
              <span class="px-2 py-1 rounded-md bg-white/90 text-neutral-dark text-[11px] font-bold">
                [${testCreationStore.testType}]
              </span>
            </div>
            <div class="absolute top-5 right-5">
              <span class="px-2.5 py-1 rounded-full bg-[#191A1C] text-white text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
                <span>🪙</span> +${testCreationStore.rewardCoin} 코인
              </span>
            </div>
          </div>

          <div class="p-5 flex flex-col flex-1 justify-between">
            <div>
              <h3 class="text-[16px] font-extrabold text-neutral-dark mb-2 line-clamp-1 group-hover:text-primary-dark transition-colors">
                ${testCreationStore.serviceName} - ${testCreationStore.serviceDesc}
              </h3>
              <div class="flex items-center gap-2 text-xs text-neutral-muted mb-4 font-normal">
                <span>#신규등록</span>
                <span>#테스터모집</span>
                <span>#바이브코딩</span>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between text-xs font-semibold text-neutral-dark mb-1.5">
                <span>모집률 0/${testCreationStore.targetCount}명</span>
                <span class="text-neutral-muted">0%</span>
              </div>
              <div class="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full" style="width: 4%;"></div>
              </div>
            </div>
          </div>

          <div class="px-5 py-3.5 border-t border-[#F4F4F5] flex items-center justify-between text-xs bg-[#FCFDFC]">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-neutral-dark shadow-2xs">제작</div>
              <span class="font-bold text-neutral-dark">${activeNickname} (나)</span>
            </div>
            <span class="font-bold text-primary-dark">방금 등록됨</span>
          </div>
        `;
        grid.insertBefore(newCard, grid.firstChild);
      }

      // Add to My Projects list as well
      const myprojList = document.getElementById('myproj-cards-list');
      if (myprojList) {
        const oldMyprojCard = document.getElementById('myproj-newly-published-card');
        if (oldMyprojCard) oldMyprojCard.remove();

        const myprojCard = document.createElement('div');
        myprojCard.id = 'myproj-newly-published-card';
        myprojCard.className = 'myproj-card bg-white rounded-2xl border-2 border-primary p-5 shadow-xs flex flex-col gap-4 transition-all hover:shadow-subtle animate-in fade-in zoom-in-95';
        myprojCard.setAttribute('data-status', 'active');
        myprojCard.innerHTML = `
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] flex flex-col items-center justify-center relative p-1 shrink-0">
                <div class="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-xs">🚀</div>
                <span class="text-[9px] font-black text-white bg-emerald-600 px-1 rounded mt-1">NEW</span>
              </div>
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2 flex-wrap text-xs">
                  <span class="px-2.5 py-0.5 rounded-full bg-[#B4E380] text-[#1E3E0B] font-extrabold text-[11px]">
                    ● 진행중 (방금 등록)
                  </span>
                  <span class="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-bold">
                    [${testCreationStore.testType}]
                  </span>
                </div>
                <h3 class="text-base font-extrabold text-neutral-dark hover:text-primary-dark cursor-pointer transition-colors" onclick="navigateTo('post')">
                  ${testCreationStore.serviceName} - ${testCreationStore.serviceDesc}
                </h3>
                <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-1">
                  <div class="flex items-center gap-2 min-w-[200px]">
                    <span class="font-bold text-neutral-700">모집률 <strong class="text-neutral-dark font-black">0/${testCreationStore.targetCount}명</strong></span>
                    <div class="w-28 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div class="h-full bg-[#B4E380] rounded-full" style="width: 0%;"></div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 bg-[#FFFDF0] px-2.5 py-1 rounded-lg border border-[#F5E8B8]">
                    <span class="text-neutral-500 font-medium text-[11px]">지급 리워드</span>
                    <span class="font-black text-[#D97706] text-xs">🪙 ${testCreationStore.rewardCoin} C / 명</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 text-neutral-400">
              <button type="button" onclick="alert('프로젝트 수정 화면으로 이동합니다.')" class="p-1.5 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors" title="수정">✏️</button>
              <button type="button" onclick="this.closest('.myproj-card').remove(); showGenericToast('프로젝트가 삭제되었습니다.', '🗑️')" class="p-1.5 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition-colors" title="삭제">🗑️</button>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
            <button onclick="navigateTo('post')" class="px-4 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5">
              <span>👁️ 상세 화면</span>
            </button>
            <button onclick="navigateTo('feedback')" class="px-4 py-2 rounded-xl bg-[#191A1C] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
              <span>📊 결과 및 피드백</span>
            </button>
          </div>
        `;
        myprojList.insertBefore(myprojCard, myprojList.firstChild);
      }

      showGenericToast(`🎉 '${testCreationStore.serviceName}' 프로젝트가 실시간 등록되었습니다!`, '🚀');

      navigateTo('explore');
      startRealtimeReviewTimer();
    }

    function verifyUrlAction() {
      const input = document.getElementById('input-product-web-url');
      const btn = document.getElementById('btn-verify-url');
      const msg = document.getElementById('verify-url-msg');
      if (!input || !msg) return;

      const rawVal = input.value.trim();
      if (!rawVal) {
        msg.className = 'text-xs font-semibold text-red-500 block';
        msg.textContent = '❌ 사이트 URL을 입력해 주세요.';
        return;
      }

      btn.disabled = true;
      btn.textContent = '검증 중...';
      msg.className = 'text-xs font-semibold text-neutral-500 block';
      msg.textContent = '⏳ URL 형식을 확인하는 중입니다...';

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = '검증';

        try {
          const normalizedUrl = window.donDwaeDataService.normalizeHttpUrl(rawVal, { required: true });
          input.value = normalizedUrl;
          msg.className = 'text-xs font-bold text-[#2E5E14] block flex items-center gap-1';
          msg.innerHTML = '<span>✓</span> <span>DB에 저장 가능한 URL 형식입니다.</span>';
        } catch (error) {
          msg.className = 'text-xs font-bold text-red-500 block';
          msg.textContent = `❌ ${resolveFriendlyError(error, 'PRJ_INVALID_URL').formatted}`;
        }
      }, 400);
    }

    function populateProjectEditor(test) {
      const hasApplicants = (test.currentRecruits || 0) > 0;

      const titleInput = document.getElementById('input-test-title');
      const nameInput = document.getElementById('input-service-name');
      const descInput = document.getElementById('input-service-desc');
      const noticeInput = document.getElementById('input-test-notice');
      const urlInput = document.getElementById('input-product-web-url');
      const targetCountInput = document.getElementById('input-target-count');
      const rewardCoinInput = document.getElementById('input-reward-coin');
      const startDateInput = document.getElementById('input-start-date');
      const endDateInput = document.getElementById('input-end-date');
      const privacyInput = document.getElementById('input-privacy-items');
      const guideInput = document.getElementById('input-test-guide');
      const feedbackPrivacyInput = document.getElementById('toggle-feedback-privacy');

      if (titleInput) {
        titleInput.value = test.title || '';
        const tCounter = document.getElementById('test-title-counter');
        if (tCounter) tCounter.textContent = `${(test.title || '').length} / 50자`;
      }
      if (nameInput) {
        nameInput.value = test.serviceName || '';
        const sCounter = document.getElementById('service-name-counter');
        if (sCounter) sCounter.textContent = `${(test.serviceName || '').length} / 20자`;
      }
      if (descInput) descInput.value = test.serviceDesc || '';
      if (noticeInput) noticeInput.value = test.testNotice || '';
      if (startDateInput && test.startDate) startDateInput.value = test.startDate;
      applyProjectStartDateLimit();
      if (endDateInput && test.endDate) endDateInput.value = test.endDate;
      if (privacyInput) privacyInput.value = test.privacyItems || '';
      if (guideInput) guideInput.value = test.testGuide || '';
      const testLoginIdInput = document.getElementById('input-test-login-id');
      const testLoginPwInput = document.getElementById('input-test-login-pw');
      if (testLoginIdInput) testLoginIdInput.value = test.testAccountId || '';
      if (testLoginPwInput) testLoginPwInput.value = test.testAccountPassword || '';
      if (feedbackPrivacyInput) feedbackPrivacyInput.checked = !test.reviewsPublic;

      // 썸네일 이미지 미리보기 복원
      const thumbImg = document.getElementById('thumbnail-img-preview');
      const removeThumbBtn = document.getElementById('btn-remove-thumbnail');
      if (thumbImg) {
        if (test.thumbnailUrl) {
          thumbImg.src = test.thumbnailUrl;
          thumbImg.classList.remove('hidden');
          if (removeThumbBtn) removeThumbBtn.classList.remove('hidden');
        } else {
          thumbImg.removeAttribute('src');
          thumbImg.classList.add('hidden');
          if (removeThumbBtn) removeThumbBtn.classList.add('hidden');
        }
      }

      // 개발 환경 태그와 권장 참여 대상 태그는 서로 섞이지 않게 복원합니다.
      renderProjectTagChips('tech-tags-container', test.techTags || [], '🛠️');
      renderProjectTagChips('persona-tags-container', test.personaTags || [], '🎯');

      const editableCategory = ['product', 'prototype', 'vote', 'survey'].includes(test.mainCategory)
        ? test.mainCategory
        : 'product';
      const categoryRadio = document.querySelector(`input[name="mainCategory"][value="${editableCategory}"]`);
      if (categoryRadio) categoryRadio.checked = true;
      handleMainCategoryChange(editableCategory);

      if (editableCategory !== 'survey') {
        const platformRadio = document.querySelector(`input[name="productSubPlatform"][value="${test.platform || 'web'}"]`);
        if (platformRadio) platformRadio.checked = true;
        toggleProductPlatformFields(test.platform || 'web');
      }

      const abToggle = document.getElementById('toggle-product-ab');
      if (abToggle) abToggle.checked = !!test.isAbTest;
      toggleProductAbMode(!!test.isAbTest);
      const abAInput = document.getElementById('input-product-ab-web-a');
      const abBInput = document.getElementById('input-product-ab-web-b');
      const playstoreInput = document.getElementById('input-app-playstore-url');
      const appstoreInput = document.getElementById('input-app-appstore-url');
      if (abAInput) abAInput.value = test.abUrlA || '';
      if (abBInput) abBInput.value = test.abUrlB || '';
      if (playstoreInput) playstoreInput.value = test.playstoreUrl || '';
      if (appstoreInput) appstoreInput.value = test.appstoreUrl || '';

      const loginMode = test.loginRequired ? 'required' : 'none';
      const loginRadio = document.querySelector(`input[name="loginRequirementMode"][value="${loginMode}"]`);
      if (loginRadio) loginRadio.checked = true;
      handleLoginRequirementChange(loginMode);

      const missionMode = test.externalSurveyUrl ? 'link' : 'direct';
      const missionRadio = document.querySelector(`input[name="missionFormatMode"][value="${missionMode}"]`);
      if (missionRadio) missionRadio.checked = true;
      const externalSurveyInput = document.getElementById('input-external-survey-url');
      if (externalSurveyInput) externalSurveyInput.value = test.externalSurveyUrl || '';
      toggleMissionFormatMode(missionMode);

      // URL은 고정 (수정 불가 사전 서약 준수)
      if (urlInput) {
        urlInput.value = test.serviceUrl || '';
        urlInput.disabled = true;
        urlInput.title = '이미 생성된 프로젝트의 서비스 URL은 수정할 수 없습니다.';
        urlInput.classList.add('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }

      // 모집인원: 수정 가능 (단, 기존 모집인원 미만으로는 축소 불가)
      if (targetCountInput) {
        const existingTargetCount = Number(test.targetCount ?? 1);
        targetCountInput.value = existingTargetCount;
        targetCountInput.disabled = false;
        targetCountInput.min = existingTargetCount;
        targetCountInput.title = `기존 모집인원(${existingTargetCount}명) 이상으로 상향 조절이 가능합니다.`;
        targetCountInput.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }

      // 1인당 보상 돼지코인: 수정 가능 (단, 기존 보상 미만으로는 삭감 불가)
      if (rewardCoinInput) {
        const existingRewardCoin = Number(test.rewardCoin ?? 0);
        rewardCoinInput.value = existingRewardCoin;
        rewardCoinInput.disabled = false;
        rewardCoinInput.min = existingRewardCoin;
        rewardCoinInput.title = `기존 1인당 보상(${existingRewardCoin}돼지코인) 이상으로 상향 설정 가능합니다.`;
        rewardCoinInput.classList.remove('bg-neutral-100', 'cursor-not-allowed', 'opacity-70');
      }

      // STEP 02 제약 조건 적용
      // 1. 테스트 대분류 선택 락 처리
      const mainCatInputs = document.querySelectorAll('input[name="mainCategory"]');
      mainCatInputs.forEach(input => {
        input.disabled = hasApplicants;
        if (hasApplicants) input.classList.add('cursor-not-allowed');
        else input.classList.remove('cursor-not-allowed');
      });

      // 2. 로그인 필요 여부 락 처리
      const loginReqInputs = document.querySelectorAll('input[name="loginRequirementMode"]');
      loginReqInputs.forEach(input => {
        input.disabled = hasApplicants;
        if (hasApplicants) input.classList.add('cursor-not-allowed');
        else input.classList.remove('cursor-not-allowed');
      });

      // 3. 테스트 진행 방법 (가이드): 언제나 자유롭게 수정 가능
      if (guideInput) guideInput.disabled = false;

      // Populate existing questions into Step 2 DOM
      const qList = document.getElementById('questions-list');
      const addQBtn = document.querySelector('button[onclick="addQuestionItem()"]');
      if (addQBtn) {
        addQBtn.disabled = hasApplicants;
        if (hasApplicants) addQBtn.classList.add('opacity-50', 'cursor-not-allowed', 'hidden');
        else addQBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'hidden');
      }

      if (qList && test.questions && test.questions.length > 0) {
        qList.innerHTML = '';
        test.questions.forEach((qObj, idx) => {
          const qTitle = typeof qObj === 'string' ? qObj : (qObj.title || '');
          const qType = (typeof qObj === 'object' && qObj.type) ? qObj.type : 'single';
          const choices = (typeof qObj === 'object' && qObj.choices) ? qObj.choices : [];

          const itemDiv = document.createElement('div');
          itemDiv.className = 'question-item p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-primary/60 transition-all flex flex-col gap-3.5 shadow-2xs';
          itemDiv.setAttribute('data-question-type', qType);

          let choicesHtml = '';
          choices.forEach((cText, cIdx) => {
            choicesHtml += `
              <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
                <span class="text-xs text-neutral-400 font-mono option-num">${cIdx + 1}.</span>
                <input type="text" value="${cText}" ${hasApplicants ? 'disabled' : ''} placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none ${hasApplicants ? 'opacity-70 cursor-not-allowed' : ''}" />
                ${!hasApplicants ? '<button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>' : ''}
              </div>
            `;
          });

          itemDiv.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="px-2.5 py-1 rounded-lg bg-[#EDF8E5] text-[#2F6517] font-bold text-xs shrink-0">검증 ${idx + 1}</span>
              <input type="text" value="${qTitle}" ${hasApplicants ? 'disabled' : ''} placeholder="질문 내용을 입력하세요..."
                class="question-title-input flex-1 text-xs font-semibold text-neutral-dark focus:outline-none border-b border-neutral-200 pb-1 ${hasApplicants ? 'opacity-70 cursor-not-allowed' : ''}" />

              <select ${hasApplicants ? 'disabled' : ''} class="question-type-select text-xs font-bold bg-[#F4F4F5] px-3 py-1.5 rounded-lg border border-neutral-200 focus:outline-none ${hasApplicants ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}" onchange="handleQuestionTypeChange(this)">
                <option value="essay" ${qType === 'essay' ? 'selected' : ''}>📝 서술형</option>
                <option value="single" ${qType === 'single' ? 'selected' : ''}>🔘 객관식 (단일선택)</option>
                <option value="multiple" ${qType === 'multiple' ? 'selected' : ''}>☑️ 객관식 (복수선택)</option>
              </select>

              <label class="flex items-center gap-1.5 text-xs font-bold shrink-0 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200 ${hasApplicants ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}">
                <input type="checkbox" ${hasApplicants ? 'disabled' : ''} class="question-required-toggle accent-primary-dark w-3.5 h-3.5" checked />
                <span class="text-neutral-700">필수</span>
              </label>

              ${!hasApplicants ? '<button type="button" onclick="this.closest(\'.question-item\').remove(); reindexQuestionTitles();" class="text-neutral-400 hover:text-red-500 text-xs px-1 font-bold">✕ 삭제</button>' : ''}
            </div>

            <div class="question-options-box pl-6 flex flex-col gap-2 border-t border-neutral-100 pt-3" style="${qType === 'essay' ? 'display: none;' : ''}">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-neutral-500">선택지 (최대 5개)</span>
                ${!hasApplicants ? '<button type="button" onclick="addOptionToQuestion(this)" class="text-[11px] text-[#2F6517] font-extrabold hover:underline cursor-pointer">+ 선택지 추가</button>' : ''}
              </div>
              <div class="options-container grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${choicesHtml || `
                  <div class="option-item flex items-center gap-2 bg-[#FAFBF7] px-3 py-2 rounded-xl border border-neutral-200">
                    <span class="text-xs text-neutral-400 font-mono option-num">1.</span>
                    <input type="text" value="매우 양호함 / 이상 없음" ${hasApplicants ? 'disabled' : ''} placeholder="선택지 내용을 입력하세요" class="option-title-input flex-1 text-xs font-medium bg-transparent focus:outline-none ${hasApplicants ? 'opacity-70 cursor-not-allowed' : ''}" />
                    ${!hasApplicants ? '<button type="button" onclick="removeOptionFromQuestion(this)" class="text-neutral-400 hover:text-red-500 text-xs">✕</button>' : ''}
                  </div>
                `}
              </div>
            </div>
          `;
          qList.appendChild(itemDiv);
        });
      }

      if (editableCategory === 'vote') {
        resetVoteImageInputs();
        existingVoteImageUrls.A = test.abUrlA || test.serviceUrl || '';
        existingVoteImageUrls.B = test.abUrlB || '';
        const usesStoredVoteImages = ['A', 'B'].every(optionKey => (
          window.donDwaeDataService?.isVoteImageStorageUrl(existingVoteImageUrls[optionKey])
        ));
        setVoteInputMode(usesStoredVoteImages ? 'image' : 'url');
        if (usesStoredVoteImages) {
          setVoteImagePreview('A', existingVoteImageUrls.A, '기존 저장 A안 이미지');
          setVoteImagePreview('B', existingVoteImageUrls.B, '기존 저장 B안 이미지');
        }
        ['A', 'B'].forEach(optionKey => {
          const imageInput = document.getElementById(`input-vote-image-${optionKey.toLowerCase()}`);
          if (imageInput) imageInput.disabled = hasApplicants;
        });
        setVoteInputModeLocked(hasApplicants);

        const voteUrlList = document.getElementById('vote-url-list');
        if (voteUrlList) {
          voteUrlList.innerHTML = '';
          addVoteUrlItem();
          addVoteUrlItem();
          const voteUrlInputs = voteUrlList.querySelectorAll('input[type="url"]');
          if (voteUrlInputs[0]) voteUrlInputs[0].value = test.abUrlA || test.serviceUrl || '';
          if (voteUrlInputs[1]) voteUrlInputs[1].value = test.abUrlB || '';
          voteUrlInputs.forEach(input => {
            input.disabled = hasApplicants;
            input.classList.toggle('cursor-not-allowed', hasApplicants);
            input.classList.toggle('opacity-70', hasApplicants);
          });
        }

        const voteQuestionList = document.getElementById('vote-questions-list');
        if (voteQuestionList) {
          voteQuestionList.innerHTML = '';
          const savedVoteQuestions = Array.isArray(test.questions) && test.questions.length > 0
            ? test.questions
            : [{ title: '' }];
          savedVoteQuestions.slice(0, 5).forEach((question) => {
            addVoteQuestionItem();
            const row = voteQuestionList.lastElementChild;
            const input = row?.querySelector('input[type="text"]');
            if (input) {
              input.value = typeof question === 'string' ? question : (question?.title || question?.question || '');
              input.disabled = hasApplicants;
              input.classList.toggle('cursor-not-allowed', hasApplicants);
              input.classList.toggle('opacity-70', hasApplicants);
            }
            row?.querySelector('button')?.classList.toggle('hidden', hasApplicants);
          });
        }
      }

      // Restore the saved optional verification method.
      const restoredVerificationMethod = ['quiz', 'screenshot'].includes(test.verification_method)
        ? test.verification_method
        : 'none';
      setVerificationMethod(restoredVerificationMethod);

      // Populate existing quizzes into Step 2 DOM
      const quizList = document.getElementById('quiz-questions-list');
      const addQuizBtn = document.querySelector('button[onclick="addQuizQuestionItem()"]');
      if (addQuizBtn) {
        addQuizBtn.disabled = hasApplicants;
        if (hasApplicants) addQuizBtn.classList.add('opacity-50', 'cursor-not-allowed', 'hidden');
        else addQuizBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'hidden');
      }

      if (quizList && test.quizzes && test.quizzes.length > 0) {
        quizList.innerHTML = '';
        test.quizzes.forEach((qz, qzIdx) => {
          const quizDiv = document.createElement('div');
          quizDiv.className = 'quiz-item p-4 rounded-xl border border-neutral-200 bg-white flex flex-col gap-3 shadow-2xs';
          quizDiv.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-neutral-dark flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-primary/30 text-primary-dark flex items-center justify-center text-[11px] font-bold">${qzIdx + 1}</span>
                <span>퀴즈 질문 ${qzIdx + 1}</span>
              </span>
              ${!hasApplicants ? '<button type="button" onclick="this.closest(\'.quiz-item\').remove(); reindexQuizTitles();" class="text-neutral-400 hover:text-red-500 text-xs font-bold">✕ 삭제</button>' : ''}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <input type="text" placeholder="질문 입력" ${hasApplicants ? 'disabled' : ''} class="quiz-question-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-medium focus:outline-none ${hasApplicants ? 'opacity-70 cursor-not-allowed' : ''}" value="${qz.question || ''}" />
              </div>
              <div>
                <input type="text" placeholder="정답 입력" ${hasApplicants ? 'disabled' : ''} class="quiz-answer-input w-full p-2.5 rounded-lg border border-neutral-200 text-xs font-bold bg-[#F9FAFB] focus:outline-none text-emerald-800 ${hasApplicants ? 'opacity-70 cursor-not-allowed' : ''}" value="${qz.answer || ''}" />
              </div>
            </div>
          `;
          quizList.appendChild(quizDiv);
        });
      }

      // Update STEP 3 Publish button text for Edit Mode
      const step3PublishBtnText = document.getElementById('btn-publish-step3-text');
      const step3PublishBtnIcon = document.getElementById('btn-publish-step3-icon');
      if (step3PublishBtnText) step3PublishBtnText.textContent = '수정 완료하기';
      if (step3PublishBtnIcon) step3PublishBtnIcon.textContent = '✏️';

      if (hasApplicants) {
        showGenericToast('ℹ️ 참여 신청한 테스터가 있어 1·2번 항목 및 기존 검증문항/퀴즈 수정이 보호됩니다.', '🛡️');
      } else {
        showGenericToast('✏️ 신청 테스터가 없어 모든 항목을 자유롭게 수정하실 수 있습니다.', '📝');
      }
    }
