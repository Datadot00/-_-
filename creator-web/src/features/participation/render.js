    function renderInternalVoteOptionCard(option) {
      const preview = option.isImage
        ? `<img src="${escapeHtml(option.label)}" alt="${option.key}안 시안"
             class="h-full max-h-[420px] w-full rounded-xl object-contain" loading="lazy" />`
        : option.isUrl
          ? `<div class="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-xl bg-white px-5 py-8">
               <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-2xl" aria-hidden="true">🔗</span>
               <span class="max-w-full break-all text-center text-xs font-bold text-neutral-600">${escapeHtml(option.label)}</span>
               <a href="${escapeHtml(option.label)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"
                 class="rounded-lg bg-[#1F242D] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-neutral-700">시안 새 탭에서 확인하기 ↗</a>
             </div>`
        : `<span class="text-xs font-extrabold text-neutral-dark break-words">${escapeHtml(option.label)}</span>
           <span class="text-[11px] text-neutral-500 font-medium">제작자가 등록한 시안 설명입니다.</span>`;

      return `
        <div id="opt-card-${option.key}" onclick="selectInternalVoteOption('${option.key}')"
          data-internal-vote-option="${option.key}" role="radio" aria-checked="false" tabindex="0"
          onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectInternalVoteOption('${option.key}'); }"
          class="${INTERNAL_VOTE_CARD_IDLE_CLASS}">
          <div class="flex items-center gap-2">
            <input type="radio" name="internal-ab-vote" value="${option.key}"
              onchange="selectInternalVoteOption('${option.key}')" class="w-4 h-4 accent-[#2F6517] cursor-pointer">
            <span class="text-xs font-extrabold text-neutral-dark cursor-pointer">${option.key}안 선택하기</span>
          </div>
          <div class="w-full bg-[#F4F9EE] border border-[#DCE4B8] rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 min-h-[240px] overflow-hidden cursor-pointer">
            <span class="text-[10px] uppercase font-bold tracking-widest text-[#2F6517]">OPTION ${option.key}</span>
            ${preview}
          </div>
          <button type="button" onclick="event.stopPropagation(); selectInternalVoteOption('${option.key}');"
            class="w-full py-2.5 rounded-xl bg-[#1F242D] hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
            <span>✓</span> <span>이 안 선택하기</span>
          </button>
        </div>`;
    }

    function renderInternalQuestionCard(question, index) {
      const typeLabel = question.choices.length === 0
        ? '주관식 서술형'
        : question.type === 'multiple' ? '복수 선택' : '단일 선택';
      const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
      const body = question.choices.length === 0
        ? `<textarea data-internal-answer rows="3" placeholder="이 질문에 대해 느낀 솔직한 생각을 자유롭게 서술해 주세요..."
             class="w-full text-xs p-3.5 rounded-xl border border-neutral-200 outline-none focus:border-primary bg-white leading-relaxed resize-none"></textarea>`
        : `<div class="flex flex-col gap-2">
             ${question.choices.map(choice => `
               <label class="p-3 border border-neutral-200 hover:border-primary bg-white hover:bg-primary/5 rounded-xl flex items-center gap-3 cursor-pointer font-semibold text-neutral-800 text-xs transition-colors">
                 <input type="${inputType}" name="internal-q${index}" data-internal-answer value="${escapeHtml(choice)}" class="accent-[#2F6517] w-4 h-4">
                 <span>${escapeHtml(choice)}</span>
               </label>`).join('')}
           </div>`;

      return `
        <div data-internal-question data-question-title="${escapeHtml(question.title)}"
          class="bg-white rounded-2xl border border-neutral-200 p-4 flex flex-col gap-3 shadow-2xs">
          <div class="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2">
            <span class="text-xs font-extrabold text-neutral-dark leading-relaxed">Q${index + 1}. ${escapeHtml(question.title)}</span>
            <span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shrink-0">${typeLabel}</span>
          </div>
          ${body}
        </div>`;
    }

    function renderInternalMissionFlow(project, rewardCoin = 0) {
      const moderationNotice = document.getElementById('vote-moderation-result');
      if (moderationNotice) { moderationNotice.textContent = ''; moderationNotice.classList.add('hidden'); }
      const projectId = String(project?.id || currentParticipatingPostId || currentPostId || '');
      const inMemoryDraft = internalMissionAnswers?.projectId === projectId
        ? normalizeInternalMissionDraftData(internalMissionAnswers.data)
        : null;
      const restoredDraft = inMemoryDraft || readInternalMissionDraft(projectId);
      selectedInternalVoteOption = restoredDraft?.selected_option || null;
      internalMissionAnswers = restoredDraft ? { projectId, data: restoredDraft } : null;

      const titleEl = document.getElementById('part-internal-title');
      const rewardEl = document.getElementById('part-internal-reward');
      const dynamicContent = document.getElementById('part-internal-dynamic-content');
      if (!dynamicContent) return;

      const isVoteMission = project?.category === 'vote'
        || project?.mainCategory === 'vote'
        || project?.category === 'abtest'
        || project?.is_ab_test === true
        || project?.isAbTest === true;
      const questions = parseProjectQuestions(project);
      const hasQuestions = questions.length > 0;
      const serviceName = project?.service_name || project?.title || project?.serviceName || '서비스';
      const rewardValue = Number(rewardCoin ?? project?.reward_coin ?? project?.rewardCoin ?? 0);

      if (titleEl) {
        titleEl.textContent = project
          ? `${serviceName} ${isVoteMission ? '선호도 투표' : (hasQuestions ? '검증 문항 작성' : '리뷰 작성 준비')}`
          : '투표 및 검증 작성';
      }
      if (rewardEl) rewardEl.textContent = `+${rewardValue.toLocaleString()} 돼지코인`;
      const descriptionEl = document.getElementById('vote-progress-description');
      if (descriptionEl) {
        descriptionEl.textContent = isVoteMission
          ? '각 시안을 충분히 확인한 뒤 더 마음에 드는 안을 선택해 주세요.'
          : (hasQuestions
              ? '등록된 진행 안내를 확인하고 준비된 질문에 답변해 주세요.'
              : '등록된 진행 안내를 확인한 뒤 리뷰 화면에서 소감을 남겨 주세요.');
      }
      const badgeEl = document.getElementById('vote-progress-badge');
      const headingEl = document.getElementById('vote-progress-heading');
      const stepTwoEl = document.getElementById('vote-progress-step-two');
      const stepThreeEl = document.getElementById('vote-progress-step-three');
      const asideNoticeEl = document.getElementById('vote-progress-aside-notice');
      const viewLabelEl = document.getElementById('vote-progress-view-label');
      const completeButtonTextEl = document.getElementById('btn-complete-internal-test-text');
      if (badgeEl) badgeEl.innerHTML = isVoteMission ? '<span aria-hidden="true">🗳️</span> 내부 투표 진행' : '<span aria-hidden="true">📋</span> 내부 설문 진행';
      if (headingEl) headingEl.textContent = isVoteMission ? '시안을 비교해 주세요' : (hasQuestions ? '질문에 답변해 주세요' : '진행 안내를 확인해 주세요');
      if (stepTwoEl) stepTwoEl.textContent = isVoteMission ? '선호 시안 선택' : (hasQuestions ? '준비된 질문에 답변' : '별점 및 자유 의견 작성');
      if (stepThreeEl) stepThreeEl.textContent = isVoteMission ? '투표 완료 후 리워드 수령' : '리뷰 저장 후 리워드 수령';
      if (asideNoticeEl) asideNoticeEl.textContent = isVoteMission ? '시안 투표를 완료하면 돼지코인 리워드가 즉시 지급됩니다.' : '리워드는 투표 선택만으로 지급되지 않으며, 마지막 리뷰가 서버에 저장된 뒤 지급됩니다.';
      if (viewLabelEl) viewLabelEl.textContent = isVoteMission ? '시안 투표 진행' : (hasQuestions ? '설문 응답 진행' : '리뷰 작성 준비');
      if (completeButtonTextEl) completeButtonTextEl.textContent = isVoteMission
        ? '투표 완료하고 리워드 받기 →'
        : (hasQuestions ? '응답 완료하고 리뷰 작성하기 →' : '리뷰 작성하기 →');

      if (!project) {
        dynamicContent.innerHTML = `
          <div class="bg-[#FAFBF7] border border-[#E9EEDC] rounded-2xl p-5 text-xs text-neutral-600 font-medium leading-relaxed">
            프로젝트 검증 문항을 불러오지 못했습니다. 아래 버튼으로 리뷰 작성 화면에서 피드백을 남겨 주세요.
          </div>`;
        return;
      }

      const guideText = project.test_guide || project.test_notice || project.testGuide || '';
      const headerHtml = `
        <div class="flex items-center justify-between bg-[#F4F9EE] px-4 py-2.5 rounded-xl border border-[#DCE4B8]">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2F6517] text-white text-[11px] font-extrabold shadow-2xs">
            <span>✓</span> ${isVoteMission ? '시안 선택 후 제출' : (hasQuestions ? `검증 문항 ${questions.length}개` : '추가 검증 문항 없음')}
          </span>
          <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
            🪙 ${isVoteMission ? '투표 완료 시' : '리뷰 저장 시'} +${rewardValue.toLocaleString()} 돼지코인
          </span>
        </div>`;

      const guideHtml = guideText
        ? `<div class="bg-[#FAFBF7] border border-[#E9EEDC] rounded-xl p-3.5 text-[11px] text-neutral-600 font-medium leading-relaxed">
             <span class="font-bold text-neutral-800">📋 진행 안내</span><br>${escapeHtml(guideText)}
           </div>`
        : '';

      let bodyHtml = '';
      if (isVoteMission) {
        const options = getInternalVoteOptions(project);
        const questionHtml = questions.map(renderInternalQuestionCard).join('');
        bodyHtml = `
          <div class="text-center my-1">
            <h4 class="text-base font-extrabold text-neutral-dark tracking-tight">${escapeHtml(serviceName)}</h4>
            <p class="text-xs text-neutral-500 mt-1 leading-relaxed">
              ${escapeHtml(project.service_desc || '두 시안 중 더 마음에 드는 쪽을 선택해 주세요.')}<br>
              <strong class="text-[#2F6517]">더 마음이 끌리는 안을 직접 클릭해 주세요!</strong>
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-1">
            ${options.map(renderInternalVoteOptionCard).join('')}
          </div>
          ${questionHtml}`;
      } else {
        bodyHtml = hasQuestions
          ? questions.map(renderInternalQuestionCard).join('')
          : `
              <div class="rounded-2xl border border-dashed border-[#D8E0C8] bg-white p-5 text-center">
                <p class="text-xs font-extrabold text-neutral-700">제작자가 등록한 추가 검증 문항이 없습니다.</p>
                <p class="mt-1 text-[11px] font-medium text-neutral-500">진행 안내를 확인했다면 바로 리뷰 화면에서 별점과 자유 의견을 남겨 주세요.</p>
              </div>`;
      }

      dynamicContent.innerHTML = `${headerHtml}${guideHtml}${bodyHtml}`;
      restoreInternalMissionDraftToForm(restoredDraft);
    }

    function selectInternalVoteOption(optionKey) {
      const normalized = String(optionKey || '').trim().toUpperCase();
      const cards = [...document.querySelectorAll('[data-internal-vote-option]')];
      if (!cards.some(card => (card.dataset.internalVoteOption || '').toUpperCase() === normalized)) return;

      selectedInternalVoteOption = normalized;
      cards.forEach((card) => {
        const isSelected = (card.dataset.internalVoteOption || '').toUpperCase() === normalized;
        card.className = isSelected ? INTERNAL_VOTE_CARD_SELECTED_CLASS : INTERNAL_VOTE_CARD_IDLE_CLASS;
        card.setAttribute('aria-checked', String(isSelected));
        const btn = card.querySelector('button');
        if (btn) {
          if (isSelected) {
            btn.className = 'w-full py-2.5 rounded-xl bg-[#2F6517] hover:bg-[#25500F] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs';
            btn.innerHTML = '<span>✓</span> <span>선택됨 (이 안으로 투표)</span>';
          } else {
            btn.className = 'w-full py-2.5 rounded-xl bg-[#1F242D] hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors';
            btn.innerHTML = '<span>✓</span> <span>이 안 선택하기</span>';
          }
        }
      });
      const radio = document.querySelector(`input[name="internal-ab-vote"][value="${normalized}"]`);
      if (radio) radio.checked = true;
    }

    window.selectInternalVoteOption = selectInternalVoteOption;

    function proceedTestParticipateModal(postId, project = null) {
      const targetPostId = postId || currentPostId || 'moneylog';
      currentParticipatingPostId = targetPostId;

      const modal = document.getElementById('test-participate-modal');
      const viewInitial = document.getElementById('participate-view-initial');
      const viewExternal = document.getElementById('participate-view-external-done');

      if (!modal) return;

      // Reset views
      viewInitial.classList.remove('hidden');
      viewExternal.classList.add('hidden');

      const targetBox = document.getElementById('part-modal-target-box');
      const targetText = document.getElementById('part-modal-target-text');
      const targetTags = Array.isArray(project?.target_persona_tags)
        ? project.target_persona_tags.filter(tag => typeof tag === 'string' && tag.trim())
        : [];
      if (targetText) targetText.innerHTML = targetTags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
      if (targetBox) {
        if (targetTags.length) targetBox.classList.remove('hidden');
        else targetBox.classList.add('hidden');
      }

      if (project) {
        const thumbBox = document.getElementById('part-modal-thumb-box');
        const badge = document.getElementById('part-modal-badge');
        const reward = document.getElementById('part-modal-reward');
        const title = document.getElementById('part-modal-title');
        const desc = document.getElementById('part-modal-desc');
        const checklist = document.getElementById('part-modal-checklist');
        const categoryLabels = {
          vote: '[투표 테스트]',
          survey: '[설문조사]',
          abtest: '[A/B 테스트]',
          product: '[프로덕트 테스트]'
        };
        const guideItems = Array.isArray(project.test_guide)
          ? project.test_guide
          : String(project.test_guide || '').split('\n').map(item => item.trim()).filter(Boolean);
        const questionItems = Array.isArray(project.questions)
          ? project.questions.map(item => item?.title || item?.question).filter(Boolean)
          : [];
        const items = [...guideItems, ...questionItems].slice(0, 4);

        if (thumbBox) thumbBox.textContent = project.category === 'vote' || project.category === 'abtest' ? '🗳️' : '📱';
        if (badge) badge.textContent = categoryLabels[project.category] || '[서비스 테스트]';
        if (reward) reward.textContent = `🪙 ${Number(project.reward_coin ?? 0).toLocaleString()} 돼지코인 수령`;
        if (title) title.textContent = project.service_name || project.title;
        if (desc) desc.textContent = project.service_desc || project.title;
        if (checklist) {
          checklist.innerHTML = (items.length ? items : ['서비스를 직접 사용하고 솔직한 피드백을 남겨 주세요.'])
            .map(item => `<div class="flex items-center gap-2 text-neutral-700"><span class="text-primary font-bold">✓</span>${escapeHtml(item)}</div>`)
            .join('');
        }
      }

      modal.classList.remove('hidden');
    }

    function renderSubmittedVote(result, voteOptionChoice, reward) {
      const fbContainer = document.getElementById('feedback-cards-container');
        if (fbContainer) {
          const nickname = document.getElementById('mypage-user-nickname')?.textContent || '나';
          const cardArticle = document.createElement('article');
          cardArticle.id = `feedback-card-${result?.review_id || Date.now()}`;
          cardArticle.setAttribute('data-has-reply', 'false');
          cardArticle.className = 'feedback-card bg-white rounded-2xl border border-primary/40 p-7 shadow-subtle flex flex-col gap-5 animate-in fade-in duration-300';
          cardArticle.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary-dark">나</div>
                <div>
                  <span class="font-bold text-sm text-neutral-dark">${escapeHtml(nickname)} (방금 투표 완료)</span>
                  <div class="text-[#2F6517] text-xs font-bold mt-0.5">${escapeHtml(voteOptionChoice)}안 선택</div>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] text-xs font-semibold">투표 완료</span>
            </div>
            <div class="text-[11px] text-neutral-muted flex items-center justify-between">
              <span>투표 참여 및 리워드가 저장되었습니다.</span>
              <span class="font-bold text-primary-dark">+${reward.toLocaleString()} 돼지코인</span>
            </div>`;
          fbContainer.prepend(cardArticle);
        }
    }

    function getParticipationConfirmMarkup() {
      return '<span>확인했어요, 시작하기</span><span>→</span>';
    }

    function getVoteSubmitMarkupPending() {
      return '<span>답변 검수 및 투표 제출 중...</span>';
    }

    function getVoteSubmitMarkupReady() {
      return '<span>투표 완료하고 리워드 받기 →</span>';
    }
