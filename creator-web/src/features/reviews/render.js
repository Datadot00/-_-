    function renderReviewAnswerSummary(reviews) {
      const summary = buildReviewAnswerSummary(reviews);
      if (summary.length === 0) return '';

      const rows = summary.map(({ question, responses, options }) => `
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-extrabold text-neutral-800">${escapeHtml(question)}</span>
            <span class="text-[10px] font-bold text-neutral-400 shrink-0">응답 ${responses}명</span>
          </div>
          ${options.map(([label, count]) => {
            const percent = Math.round((count / responses) * 100);
            return `
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-semibold text-neutral-600 w-32 sm:w-44 truncate shrink-0" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
                <span class="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <span class="block h-full rounded-full bg-[#A9DD82]" style="width: ${percent}%"></span>
                </span>
                <span class="text-[11px] font-extrabold text-[#2F6517] w-14 text-right shrink-0">${percent}% (${count})</span>
              </div>`;
          }).join('')}
        </div>`).join('');

      return `
        <div class="bg-white rounded-[22px] border border-[#E5E7EB] p-6 shadow-subtle flex flex-col gap-5">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h4 class="text-sm font-extrabold text-neutral-dark flex items-center gap-2">
              <span>📊 검증 문항 응답 분포</span>
            </h4>
            <span class="text-[11px] text-neutral-400 font-medium">선택형 문항만 집계</span>
          </div>
          ${rows}
        </div>`;
    }

    function renderReviewAnswerItems(items) {
      if (!items || items.length === 0) return '';
      return `
        <div class="flex flex-col gap-2">
          ${items.map(({ question, values }) => `
            <div class="rounded-xl border border-[#EAEFE0] bg-[#FAFBF7] px-3.5 py-2.5 flex flex-col gap-1">
              <span class="text-[11px] font-bold text-neutral-500">${escapeHtml(question)}</span>
              <span class="text-xs font-semibold text-neutral-800 leading-relaxed whitespace-pre-line">${values.map(value => escapeHtml(value)).join(', ')}</span>
            </div>`).join('')}
        </div>`;
    }

    async function renderDetailReviews(projectId, project) {
      const tabCountBadge = document.getElementById('tab-count-reviews');
      const avgScoreEl = document.getElementById('detail-reviews-avg-score');
      const starsDisplayEl = document.getElementById('detail-reviews-stars-display');
      const countNumEl = document.getElementById('detail-reviews-count-num');
      const reviewsContainer = document.getElementById('detail-reviews-container');

      if (!reviewsContainer) return;

      let reviews = [];
      try {
        if (window.donDwaeDataService && isDatabaseProjectId(projectId)) {
          reviews = await window.donDwaeDataService.fetchProjectReviews(projectId);
        }
      } catch (err) {
        console.warn('[renderDetailReviews] fetch error:', err);
      }

      // Merge with in-memory reviews if any
      const inMem = (window.inMemoryReviews && window.inMemoryReviews[projectId]) || [];
      if (inMem.length > 0) {
        const existingIds = new Set(reviews.map(r => r.id));
        inMem.forEach(im => {
          if (!existingIds.has(im.id)) {
            reviews.unshift(im);
          }
        });
      }

      // Fallback for legacy mock projects (only if not DB project and reviews is empty)
      if ((!reviews || reviews.length === 0) && !isDatabaseProjectId(projectId)) {
        if (projectId === 'moneylog') {
          reviews = [
            {
              id: 'mock-1',
              rating: 5,
              created_at: '2026-09-09T10:00:00Z',
              users: { nickname: '스마트알뜰러' },
              answers: { review_text: '영수증 OCR 인식 속도가 생각보다 훨씬 빠르고 정확하네요! 월별 카테고리 분류도 깔끔합니다.' },
              creator_reply: '좋은 의견 감사합니다! 더 정확한 인식을 위해 모델 최적화 중입니다.'
            },
            {
              id: 'mock-2',
              rating: 4,
              created_at: '2026-09-08T14:30:00Z',
              users: { nickname: '핀테크매니아' },
              answers: { review_text: 'UI가 직관적이라 어르신들도 쓰기 좋을 것 같아요. 영수증 여러 장 일괄 업로드 기능도 추가되면 좋겠습니다.' }
            }
          ];
        } else if (projectId === 'prototype') {
          reviews = [
            {
              id: 'mock-p1',
              rating: 5,
              created_at: '2026-09-10T11:00:00Z',
              users: { nickname: 'UX디자이너_린' },
              answers: { review_text: '3단계 카드 온보딩(A안)이 정보 습득 부담이 적어 훨씬 직관적이었습니다.' }
            }
          ];
        }
      }

      const count = reviews ? reviews.length : 0;
      if (tabCountBadge) tabCountBadge.textContent = count;
      if (countNumEl) countNumEl.textContent = `${count}명`;

      if (count === 0) {
        if (avgScoreEl) avgScoreEl.textContent = '-';
        if (starsDisplayEl) starsDisplayEl.textContent = '☆☆☆☆☆';
        reviewsContainer.innerHTML = `
          <div class="bg-white rounded-[22px] border border-dashed border-neutral-300 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
            <div class="w-14 h-14 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-2xl">
              💬
            </div>
            <h4 class="text-sm font-extrabold text-neutral-dark mb-0.5">아직 등록된 테스터 리뷰가 없습니다</h4>
            <p class="text-xs text-neutral-400 font-medium max-w-xs">
              테스터들이 참여를 완료하면 작성된 솔직한 사용 후기와 피드백이 이곳에 실시간으로 반영됩니다.
            </p>
          </div>
        `;
      } else {
        const totalRating = reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        const avgRating = (totalRating / count).toFixed(1);
        const avgNum = Math.round(Number(avgRating));

        if (avgScoreEl) avgScoreEl.textContent = avgRating;
        if (starsDisplayEl) starsDisplayEl.textContent = '★'.repeat(avgNum) + '☆'.repeat(Math.max(0, 5 - avgNum));

        const answerSummaryHtml = renderReviewAnswerSummary(reviews);
        reviewsContainer.innerHTML = answerSummaryHtml + reviews.map(r => {
          const userNick = r.users?.nickname || '익명 테스터';
          const rRating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
          const starStr = '★'.repeat(rRating) + '☆'.repeat(5 - rRating);
          const reviewDate = r.created_at ? r.created_at.split('T')[0] : '방금 전';

          const parsedAnswers = parseReviewAnswers(r.answers);
          let contentStr = parsedAnswers.text;
          if (!contentStr && r.answers) {
            if (typeof r.answers === 'object') {
              contentStr = r.answers.review_text || r.answers.text || '';
            } else if (typeof r.answers === 'string') {
              try {
                const parsed = JSON.parse(r.answers);
                contentStr = parsed.review_text || parsed.text || r.answers;
              } catch (e) {
                contentStr = r.answers;
              }
            }
          }
          if (!contentStr) {
            contentStr = r.content || r.feedback_text || '';
          }
          contentStr = String(contentStr).trim();

          return `
            <article class="bg-white rounded-[22px] border border-[#E5E7EB] p-6 shadow-subtle flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-[#FAFBF5] border border-[#E2E8D3] flex items-center justify-center font-bold text-sm text-[#2F6517]">
                    ${escapeHtml(userNick.charAt(0))}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-extrabold text-sm text-neutral-800">${escapeHtml(userNick)}</span>
                      <span class="text-xs text-neutral-400 font-medium">${reviewDate}</span>
                    </div>
                    <div class="text-amber-500 text-xs flex items-center gap-1 mt-0.5">
                      <span>${starStr}</span>
                      <span class="font-bold text-neutral-600 text-[11px]">(${rRating}.0)</span>
                    </div>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-md bg-[#EDF8E5] text-[#2F6517] text-xs font-extrabold border border-[#2F6517]/20">
                  ✓ 참여 완료
                </span>
              </div>

              ${renderReviewAnswerItems(parsedAnswers.items)}

              ${contentStr ? `
                <div class="p-4 rounded-xl bg-[#FAFBF7] border border-[#EAEFE0] text-xs text-neutral-700 font-medium leading-relaxed whitespace-pre-line">
                  ${escapeHtml(contentStr)}
                </div>
              ` : ''}

              ${r.creator_reply ? `
                <div class="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 ml-3 sm:ml-6 flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <span>💬 제작자 답글</span>
                    </span>
                    <span class="text-[10px] text-neutral-400">${r.creator_replied_at ? r.creator_replied_at.split('T')[0] : ''}</span>
                  </div>
                  <p class="text-xs text-neutral-600 font-medium leading-relaxed whitespace-pre-line">${escapeHtml(r.creator_reply)}</p>
                </div>
              ` : ''}
            </article>
          `;
        }).join('');
      }
    }

    function renderFeedbackSelectedVotePreview(project, selectedOption) {
      const normalizedOption = String(selectedOption || '').trim().toUpperCase();
      const selected = getInternalVoteOptions(project)
        .find(option => option.key === normalizedOption);
      if (!selected) return '';

      const preview = selected.isUrl
        ? `<div class="rounded-xl bg-white p-2">
             <img src="${escapeHtml(selected.label)}" alt="선택한 ${selected.key}안 시안"
               class="${selected.isImage ? '' : 'hidden '}max-h-64 w-full rounded-lg object-contain" loading="lazy"
               onload="this.classList.remove('hidden'); this.nextElementSibling.classList.add('hidden')"
               onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden')" />
             <div class="${selected.isImage ? 'hidden ' : ''}flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
               <span class="text-2xl" aria-hidden="true">🔗</span>
               <span class="max-w-full break-all text-[11px] font-semibold text-neutral-500">${escapeHtml(selected.label)}</span>
               <a href="${escapeHtml(selected.label)}" target="_blank" rel="noopener noreferrer"
                 class="rounded-lg bg-[#1F242D] px-3.5 py-2 text-[11px] font-extrabold text-white">선택한 시안 확인하기 ↗</a>
             </div>
           </div>`
        : `<div class="rounded-xl bg-white px-4 py-6 text-center text-xs font-bold text-neutral-700">${escapeHtml(selected.label)}</div>`;

      return `
        <div data-feedback-selected-vote-preview class="rounded-2xl border border-[#DCE4B8] bg-[#F4F9EE] p-3">
          <div class="mb-2 flex items-center justify-between px-1">
            <span class="text-xs font-extrabold text-neutral-700">선택한 ${selected.key}안 미리보기</span>
            <button type="button" onclick="returnToInternalVoteFromFeedback()"
              class="text-[11px] font-bold text-[#2F6517] underline underline-offset-2">다시 비교하기</button>
          </div>
          ${preview}
        </div>`;
    }

    async function openFeedbackWriteModal(postId) {
      closeTestParticipateModal();
      currentFeedbackVerificationMethod = 'none';
      feedbackScreenshotDataUrl = null;
      currentFeedbackProjectQuizzes = [];

      const pId = postId || currentParticipatingPostId || currentPostId || '11111111-1111-1111-1111-111111111111';
      currentParticipatingPostId = pId;
      const modal = document.getElementById('write-feedback-modal');
      const badge = document.getElementById('fb-modal-badge');
      const reward = document.getElementById('fb-modal-reward');
      const title = document.getElementById('fb-modal-title');
      const body = document.getElementById('fb-modal-dynamic-body');

      if (!modal || !body) return;

      // 클릭 피드백을 즉시 보여주고 DB 프로젝트 정보는 모달 안에서 불러옵니다.
      modal.classList.remove('hidden');
      body.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center gap-3 text-center text-neutral-500">
          <span class="w-7 h-7 rounded-full border-2 border-neutral-200 border-t-[#2F6517] animate-spin"></span>
          <span class="text-xs font-bold">리뷰 양식을 불러오는 중...</span>
        </div>`;

      let dbProj = null;
      if (window.donDwaeDataService && typeof window.donDwaeDataService.fetchProjectById === 'function') {
        try {
          dbProj = await window.donDwaeDataService.fetchProjectById(pId);
        } catch (e) {
          console.warn('[openFeedbackWriteModal] DB fetch warning:', e.message);
        }
      }
      currentFeedbackProject = dbProj;

      const isVoteProject = dbProj?.category === 'vote'
        || dbProj?.category === 'abtest'
        || dbProj?.is_ab_test === true;
      if (isVoteProject && internalMissionAnswers?.projectId !== String(pId)) {
        const restoredDraft = readInternalMissionDraft(pId);
        internalMissionAnswers = restoredDraft ? { projectId: String(pId), data: restoredDraft } : null;
        selectedInternalVoteOption = restoredDraft?.selected_option || null;
      }
      const hasCurrentVoteAnswer = internalMissionAnswers?.projectId === String(pId)
        && Boolean(internalMissionAnswers?.data?.selected_option);
      if (isVoteProject && !hasCurrentVoteAnswer) {
        closeFeedbackWriteModal();
        renderInternalMissionFlow(dbProj, dbProj?.reward_coin ?? 0);
        navigateTo('vote-progress');
        return;
      }

      const titleText = dbProj?.title || dbProj?.service_name || '테스트 피드백';
      const rewardCoin = dbProj?.reward_coin ?? 500;
      const categoryText = isVoteProject ? '🗳️ 투표 테스트' : (dbProj?.category === 'survey' ? '📋 설문조사' : '📱 프로덕트 테스트');

      if (badge) badge.textContent = `${categoryText} 피드백`;
      if (reward) reward.textContent = `🪙 +${rewardCoin} 돼지코인 지급`;
      if (title) title.textContent = `${titleText} 피드백 작성`;

      // Render content based on test type & DB questions/quizzes
      try {
        renderFeedbackFormByTestType(isVoteProject ? 'vote' : (dbProj?.category || 'product'), body, dbProj);
      } catch (error) {
        console.error('[openFeedbackWriteModal] Form render failed:', error);
        body.innerHTML = `
          <div class="py-10 px-5 rounded-2xl border border-red-200 bg-red-50 text-center">
            <p class="text-sm font-extrabold text-red-800">리뷰 양식을 불러오지 못했습니다.</p>
            <p class="mt-1 text-xs text-red-600">잠시 후 다시 시도해 주세요.</p>
          </div>`;
      }
    }

    window.openFeedbackWriteModal = openFeedbackWriteModal;

    function renderFeedbackFormByTestType(testType, container, dbProj = null) {
      const normalizedTestType = String(testType || '').toLowerCase();
      const parseFeedbackItems = (value, fallback = []) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : fallback;
          } catch (error) {
            console.warn('[renderFeedbackFormByTestType] Invalid feedback items:', error?.message || error);
          }
        }
        return fallback;
      };
      const questionsList = parseFeedbackItems(dbProj?.questions, myCreatedTest?.questions || []);
      const rawVerificationMethod = dbProj?.verification_method
        || (parseFeedbackItems(dbProj?.quizzes, []).length > 0 ? 'quiz' : 'none');
      currentFeedbackVerificationMethod = ['quiz', 'screenshot'].includes(rawVerificationMethod)
        ? rawVerificationMethod
        : 'none';
      const isQuizVerification = currentFeedbackVerificationMethod === 'quiz';
      const isScreenshotVerification = currentFeedbackVerificationMethod === 'screenshot';
      const quizzesList = isQuizVerification
        ? parseFeedbackItems(dbProj?.quizzes, myCreatedTest?.quizzes || [])
        : [];
      currentFeedbackProjectQuizzes = quizzesList;
      const verificationItems = [
        ...questionsList.map((q, idx) => ({ q, idx, isQuiz: false })),
        ...quizzesList.map((q, idx) => ({ q, idx: questionsList.length + idx, quizIndex: idx, isQuiz: true }))
      ];

      if (normalizedTestType === 'vote') {
        const selectedOption = internalMissionAnswers?.projectId === String(currentParticipatingPostId || currentPostId || '')
          ? internalMissionAnswers?.data?.selected_option
          : '';
        const selectedPreview = renderFeedbackSelectedVotePreview(dbProj, selectedOption);
        container.innerHTML = `
          <div class="flex items-center justify-between rounded-xl border border-[#DCE4B8] bg-[#F4F9EE] px-4 py-3">
            <span class="text-xs font-bold text-neutral-600">선택한 시안</span>
            <span class="rounded-full bg-[#2F6517] px-3 py-1 text-xs font-extrabold text-white">${escapeHtml(selectedOption || '-')}안</span>
          </div>

          ${selectedPreview}

          <!-- 별점 평가 -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-neutral-800">1. 시안 디자인 만족도 (별점)</label>
            <div class="flex items-center gap-2 text-2xl text-amber-400 cursor-pointer select-none" id="star-rating-box">
              <span onclick="setFeedbackStar(1)">★</span>
              <span onclick="setFeedbackStar(2)">★</span>
              <span onclick="setFeedbackStar(3)">★</span>
              <span onclick="setFeedbackStar(4)">★</span>
              <span onclick="setFeedbackStar(5)">★</span>
              <span class="text-xs font-bold text-neutral-500 ml-2" id="star-rating-val">5.0 / 5.0</span>
            </div>
          </div>

          <!-- 추가 피드백 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-neutral-800">2. 추가 개선 제안 (선택)</label>
            <textarea rows="3" placeholder="색상, 버튼 위치, 텍스트 가독성 등 추가 피드백이 있다면 남겨주세요" class="w-full text-xs p-3.5 rounded-xl border border-neutral-200 outline-none focus:border-primary"></textarea>
          </div>
        `;
      } else if (normalizedTestType === 'survey') {
        const isExternalSurvey = Boolean(
          dbProj?.external_survey_url ||
          dbProj?.externalSurveyUrl ||
          (dbProj?.category === 'survey' && !isInternalMissionProject(dbProj?.id))
        );
        // 외부 URL 설문이거나 검증 문항을 작성하지 않은 경우 검증항목을 일절 노출하지 않고 종합 의견만 표시
        const hasCustomSurveyQuestions = !isExternalSurvey && questionsList.length > 0;

        container.innerHTML = `
          ${hasCustomSurveyQuestions ? `
            <!-- 설문 문항 응답 -->
            <div class="flex flex-col gap-3">
              <label class="text-xs font-bold text-neutral-800">1. 설문 검증 문항</label>
              <div class="space-y-3 bg-[#FAFBF7] p-4 rounded-xl border border-[#E9EEDC] text-xs">
                ${questionsList.map((q, idx) => {
                  const titleText = typeof q === 'string' ? q : q.title;
                  const choices = (typeof q === 'object' && Array.isArray(q.choices)) ? q.choices : [];
                  const qType = (typeof q === 'object' && q.type) ? q.type : (choices.length > 0 ? 'single' : 'essay');

                  if (choices.length === 0 || qType === 'essay') {
                    return `
                      <div class="p-3.5 bg-white rounded-lg border border-[#E2E8D5] flex flex-col gap-2">
                        <span class="font-extrabold text-neutral-800">Q${idx + 1}. ${escapeHtml(String(titleText))}</span>
                        <textarea rows="2" data-feedback-question="${escapeHtml(String(titleText))}" placeholder="답변을 입력해 주세요..." class="fb-answer-input w-full text-xs p-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-primary font-medium leading-relaxed"></textarea>
                      </div>
                    `;
                  } else {
                    const isMultiChoice = qType === 'multiple';
                    const inputType = isMultiChoice ? 'checkbox' : 'radio';
                    return `
                      <div class="p-3.5 bg-white rounded-lg border border-[#E2E8D5] flex flex-col gap-2">
                        <span class="font-extrabold text-neutral-800">Q${idx + 1}. ${escapeHtml(String(titleText))}</span>
                        <div class="flex flex-col gap-1.5 text-[11px]">
                          ${choices.map((cText, cIdx) => `
                            <label class="p-2 border border-neutral-200 bg-white rounded-md flex items-center gap-2 cursor-pointer font-medium text-neutral-800">
                              <input type="${inputType}" name="fb-survey-custom-q${idx}" data-feedback-question="${escapeHtml(String(titleText))}" value="${escapeHtml(String(cText))}" ${(!isMultiChoice && cIdx === 0) ? 'checked' : ''} class="accent-[#2F6517]">
                              <span>${escapeHtml(String(cText))}</span>
                            </label>
                          `).join('')}
                        </div>
                      </div>
                    `;
                  }
                }).join('')}
              </div>
            </div>
          ` : `
            <div class="p-3.5 bg-[#FAFBF7] rounded-xl border border-[#E9EEDC] text-xs text-neutral-600 font-medium leading-relaxed">
              📋 <strong class="text-neutral-800">외부 설문조사 참여가 완료되었습니다.</strong><br>
              설문에 응답해 주셔서 감사합니다. 아래에 서비스 제작자에게 전하고 싶은 종합 의견을 남겨주세요.
            </div>
          `}

          <!-- 제작자에게 전하고 싶은 종합 의견 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-neutral-800">
              ${hasCustomSurveyQuestions ? '2. 제작자에게 전하고 싶은 종합 의견' : '제작자에게 전하고 싶은 종합 의견'} <span class="text-red-500">*</span>
            </label>
            <textarea rows="4" placeholder="서비스에 대한 솔직한 주관식 답변이나 제작자에게 전하고 싶은 종합 의견을 남겨주세요." class="w-full text-xs p-3.5 rounded-xl border border-neutral-200 outline-none focus:border-primary leading-relaxed"></textarea>
          </div>
        `;
      } else {
        // Default: Product Test (웹/앱 실구동 테스트)
        const hasVerificationItems = verificationItems.length > 0;
        const opinionStepNum = hasVerificationItems ? 3 : 2;
        const screenshotStepNum = hasVerificationItems ? 4 : 3;

        container.innerHTML = `
          <!-- 별점 평가 -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-neutral-800">1. 프로덕트 종합 만족도 (별점) <span class="text-red-500">*</span></label>
            <div class="flex items-center gap-2 text-2xl text-amber-400 cursor-pointer select-none" id="star-rating-box">
              <span onclick="setFeedbackStar(1)">★</span>
              <span onclick="setFeedbackStar(2)">★</span>
              <span onclick="setFeedbackStar(3)">★</span>
              <span onclick="setFeedbackStar(4)">★</span>
              <span onclick="setFeedbackStar(5)">★</span>
              <span class="text-xs font-bold text-neutral-500 ml-2" id="star-rating-val">5.0 / 5.0</span>
            </div>
          </div>

          ${hasVerificationItems ? `
          <!-- 검증 체크리스트 & 객관식 검증 문항 수행 -->
          <div class="flex flex-col gap-3">
            <label class="text-xs font-bold text-neutral-800 flex items-center justify-between">
              <span>2. 테스트 미션 검증 문항</span>
              <span class="text-[11px] font-normal text-neutral-400">제작자가 지정한 실제 구동 확인 질문입니다</span>
            </label>

            <div class="space-y-3 bg-[#FAFBF7] p-4 rounded-xl border border-[#E9EEDC] text-xs">
              ${verificationItems.map(({ q, idx, quizIndex, isQuiz }) => {
                if (isQuiz) {
                  const quizQuestionText = q.question || '퀴즈 질문';
                  const options = (q.options && q.options.length > 0) ? q.options : null;
                  return `
                        <div class="p-3.5 bg-amber-50/70 rounded-lg border border-amber-200/80 flex flex-col gap-2 fb-quiz-block">
                          <div class="flex items-center justify-between">
                            <span class="font-extrabold text-neutral-800 flex items-center gap-1">
                              <span class="text-amber-600">❓</span> Q${idx + 1}. [검증 퀴즈] ${escapeHtml(quizQuestionText)} <span class="text-red-500">*</span>
                            </span>
                            <span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">정답 확인 (필수)</span>
                          </div>
                          ${options ? `
                            <div class="flex flex-col gap-1.5 text-[11px]">
                              ${options.map((optText, oIdx) => `
                                <label class="p-2.5 border border-amber-200/80 hover:border-amber-400 bg-white rounded-md flex items-center gap-2 cursor-pointer font-medium text-neutral-800 transition-colors">
                                  <input type="radio" name="fb-product-quiz-q${quizIndex}" value="${escapeHtml(optText)}" data-quiz-index="${quizIndex}" data-quiz-question="${escapeHtml(quizQuestionText)}" class="accent-[#2F6517]">
                                  <span>${oIdx + 1}. ${escapeHtml(optText)}</span>
                                </label>
                              `).join('')}
                            </div>
                          ` : `
                            <div class="flex flex-col gap-1 text-[11px]">
                              <input type="text"
                                placeholder="서비스를 사용하고 확인한 퀴즈 정답을 입력하세요 (예: 8개, 파란색 등)"
                                data-quiz-index="${quizIndex}"
                                data-quiz-question="${escapeHtml(quizQuestionText)}"
                                oninput="this.classList.remove('border-red-500', 'ring-2', 'ring-red-200')"
                                class="fb-quiz-answer-input w-full p-2.5 rounded-md border border-amber-300 bg-white text-xs font-semibold focus:outline-none focus:border-amber-500 text-neutral-800" />
                            </div>
                          `}
                        </div>
                      `;
                }

                const titleText = typeof q === 'string' ? q : q.title;
                const choices = (typeof q === 'object' && Array.isArray(q.choices)) ? q.choices : [];
                const qType = (typeof q === 'object' && q.type) ? q.type : (choices.length > 0 ? 'single' : 'essay');

                if (choices.length === 0 || qType === 'essay') {
                  // Subjective Question (주관식 서술형)
                  return `
                        <div class="p-3.5 bg-white rounded-lg border border-[#E2E8D5] flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <span class="font-extrabold text-neutral-800">Q${idx + 1}. ${titleText}</span>
                            <span class="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">주관식 서술형</span>
                          </div>
                          <textarea rows="2" data-feedback-question="${escapeHtml(String(titleText))}" data-feedback-kind="essay" placeholder="이 질문에 대한 답변을 자유롭게 서술해 주세요..." class="fb-answer-input w-full text-xs p-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-primary font-medium leading-relaxed"></textarea>
                        </div>
                      `;
                } else {
                  // Multiple Choice Question (단일선택 or 복수선택)
                  const isMultiChoice = qType === 'multiple';
                  const inputType = isMultiChoice ? 'checkbox' : 'radio';
                  const typeLabel = isMultiChoice ? '복수선택 가능' : '단일선택';
                  const badgeColor = isMultiChoice ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return `
                        <div class="p-3.5 bg-white rounded-lg border border-[#E2E8D5] flex flex-col gap-2">
                          <div class="flex items-center justify-between">
                            <span class="font-extrabold text-neutral-800">Q${idx + 1}. ${titleText}</span>
                            <span class="text-[10px] font-bold ${badgeColor} px-2 py-0.5 rounded border">${typeLabel}</span>
                          </div>
                          <div class="flex flex-col gap-1.5 text-[11px]">
                            ${choices.map((cText, cIdx) => `
                              <label class="p-2.5 border border-neutral-200 hover:border-primary/60 bg-white hover:bg-primary/5 rounded-md flex items-center gap-2 cursor-pointer font-medium text-neutral-800 transition-colors">
                                <input type="${inputType}" name="fb-product-custom-q${idx}" data-feedback-question="${escapeHtml(String(titleText))}" data-feedback-kind="${isMultiChoice ? 'multiple' : 'single'}" value="${escapeHtml(String(cText))}" ${(!isMultiChoice && cIdx === 0) ? 'checked' : ''} class="accent-[#2F6517] w-3.5 h-3.5">
                                <span>${cText}</span>
                              </label>
                            `).join('')}
                          </div>
                        </div>
                      `;
                }
              }).join('')}
            </div>
          </div>
          ` : ''}

          <!-- 제작자에게 궁금한 점 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-neutral-800">${opinionStepNum}. 제작자에게 궁금한 점 <span class="font-medium text-neutral-400">(선택)</span></label>
            <textarea rows="4" placeholder="선택 사항입니다. 서비스를 써보며 제작자에게 묻고 싶은 점이 있다면 자유롭게 남겨주세요." class="w-full text-xs p-3.5 rounded-xl border border-neutral-200 outline-none focus:border-primary leading-relaxed"></textarea>
          </div>

          ${isScreenshotVerification ? `
          <!-- 스크린샷 검증 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-neutral-800">${screenshotStepNum}. 사용 화면 스크린샷 첨부 <span class="text-red-500">*</span></label>
            <p class="text-[11px] text-neutral-500 font-medium">이 테스트는 퀴즈 대신 스크린샷으로 참여를 확인합니다. 캡처 이미지를 첨부해 주세요.</p>
            <label for="fb-screenshot-input"
              class="border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col items-center gap-1">
              <span class="text-xl">📸</span>
              <span class="text-xs font-semibold text-neutral-600">캡처 이미지를 클릭하여 첨부하세요</span>
              <span class="text-[11px] text-neutral-400">(PNG, JPG 최대 2MB)</span>
            </label>
            <input type="file" id="fb-screenshot-input" accept="image/png,image/jpeg,image/gif,image/webp"
              class="hidden" onchange="handleFeedbackScreenshotSelected(this)" />
            <div id="fb-screenshot-preview" class="hidden flex items-center gap-3 p-2.5 rounded-xl border border-[#E9EEDC] bg-[#FAFBF7]">
              <img id="fb-screenshot-thumb" alt="첨부한 스크린샷 미리보기" class="w-14 h-14 rounded-lg object-cover border border-neutral-200" />
              <span id="fb-screenshot-name" class="text-[11px] font-semibold text-neutral-600 flex-1 truncate"></span>
              <button type="button" onclick="clearFeedbackScreenshot()"
                class="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-[10px] font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer">삭제</button>
            </div>
          </div>
          ` : ''}
        `;
      }

      if (isQuizVerification && quizzesList.length > 0 && !container.querySelector('.fb-quiz-answer-input')) {
        container.insertAdjacentHTML('beforeend', `
          <div class="flex flex-col gap-3 p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 fb-quiz-block">
            <span class="text-xs font-extrabold text-neutral-800">❓ 참여 확인 퀴즈 <span class="text-red-500">*</span></span>
            ${quizzesList.map((quiz, index) => `
              <label class="flex flex-col gap-1.5 text-xs font-bold text-neutral-700">
                <span>Q${index + 1}. ${escapeHtml(quiz.question || '퀴즈 질문')} <span class="text-red-500">*</span></span>
                <input type="text" class="fb-quiz-answer-input w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                  placeholder="서비스를 이용하고 확인한 정답을 입력하세요"
                  data-quiz-index="${index}"
                  data-quiz-question="${escapeHtml(quiz.question || `퀴즈 ${index + 1}번`)}"
                  oninput="this.classList.remove('border-red-500', 'ring-2', 'ring-red-200')" />
              </label>
            `).join('')}
          </div>`);
      }

      if (isScreenshotVerification && !container.querySelector('#fb-screenshot-input')) {
        container.insertAdjacentHTML('beforeend', `
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-neutral-800">참여 확인용 스크린샷 첨부 <span class="text-red-500">*</span></label>
            <p class="text-[11px] text-neutral-500 font-medium">이 테스트는 스크린샷으로 참여를 확인합니다. 사용 화면을 첨부해 주세요.</p>
            <label for="fb-screenshot-input"
              class="border-2 border-dashed border-neutral-200 rounded-xl p-4 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col items-center gap-1">
              <span class="text-xl">📸</span>
              <span class="text-xs font-semibold text-neutral-600">캡처 이미지를 클릭하여 첨부하세요</span>
              <span class="text-[11px] text-neutral-400">(PNG, JPG 최대 2MB)</span>
            </label>
            <input type="file" id="fb-screenshot-input" accept="image/png,image/jpeg,image/gif,image/webp"
              class="hidden" onchange="handleFeedbackScreenshotSelected(this)" />
            <div id="fb-screenshot-preview" class="hidden flex items-center gap-3 p-2.5 rounded-xl border border-[#E9EEDC] bg-[#FAFBF7]">
              <img id="fb-screenshot-thumb" alt="첨부한 스크린샷 미리보기" class="w-14 h-14 rounded-lg object-cover border border-neutral-200" />
              <span id="fb-screenshot-name" class="text-[11px] font-semibold text-neutral-600 flex-1 truncate"></span>
              <button type="button" onclick="clearFeedbackScreenshot()"
                class="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-[10px] font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer">삭제</button>
            </div>
          </div>`);
      }
    }

    function renderSubmittedFeedback(result, reward, reviewText) {
      const fbContainer = document.getElementById('feedback-cards-container');
        if (fbContainer) {
          const nickname = document.getElementById('mypage-user-nickname')?.textContent || '나';
          const cardArticle = document.createElement('article');
          cardArticle.id = `feedback-card-${result.review_id}`;
          cardArticle.setAttribute('data-has-reply', 'false');
          cardArticle.className = 'feedback-card bg-white rounded-2xl border border-primary/40 p-7 shadow-subtle flex flex-col gap-5 animate-in fade-in duration-300';
          cardArticle.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary-dark">나</div>
                <div>
                  <span class="font-bold text-sm text-neutral-dark">${escapeHtml(nickname)} (방금 작성)</span>
                  <div class="text-[#8D2B44] text-xs mt-0.5">${'★ '.repeat(selectedFeedbackStarCount || 5)} (${selectedFeedbackStarCount || 5}.0)</div>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] text-xs font-semibold">피드백 저장 완료</span>
            </div>
            ${reviewText ? `
              <div class="bg-canvas-cream/80 border border-[#E9E4C2] rounded-xl p-5">
                <p class="text-sm font-medium text-neutral-dark leading-relaxed whitespace-pre-line">${escapeHtml(reviewText)}</p>
              </div>
            ` : ''}
            <div class="text-[11px] text-neutral-muted flex items-center justify-between">
              <span>리뷰·참여 상태·리워드가 하나의 트랜잭션으로 저장되었습니다.</span>
              <span class="font-bold text-primary-dark">+${reward.toLocaleString()} 돼지코인</span>
            </div>`;
          fbContainer.prepend(cardArticle);
        }
    }

    function getFeedbackSubmitMarkup() {
      return '<span>✓ 피드백 제출하고 리워드 받기</span>';
    }
