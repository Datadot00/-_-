    async function openLatestFeedbackReport() {
      const registered = window.myProjectCollections?.registered || [];
      const target = registered.find(project => isDatabaseProjectId(project?.id));
      if (target) return openFeedbackReport(target.id);

      navigateTo('feedback');
      const titleEl = document.getElementById('feedback-project-title');
      const subtextEl = document.getElementById('feedback-project-subtext');
      const container = document.getElementById('feedback-cards-container');
      if (titleEl) titleEl.textContent = '표시할 프로젝트가 없습니다';
      if (subtextEl) subtextEl.textContent = '내 프로젝트에서 등록한 테스트를 선택하면 리포트를 볼 수 있습니다.';
      if (container) {
        container.innerHTML = `
          <div class="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
            <div class="w-14 h-14 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-2xl">📊</div>
            <h4 class="text-sm font-extrabold text-neutral-dark mb-0.5">아직 등록한 테스트가 없습니다</h4>
            <p class="text-xs text-neutral-400 font-medium max-w-xs">테스트를 등록하면 참여 현황과 테스터 피드백이 이곳에 정리됩니다.</p>
          </div>`;
      }
    }

    async function openFeedbackReport(projectId = currentPostId) {
      currentPostId = projectId;
      navigateTo('feedback');

      const loadingTitleEl = document.getElementById('feedback-project-title');
      const loadingSubtextEl = document.getElementById('feedback-project-subtext');
      const loadingContainer = document.getElementById('feedback-cards-container');
      if (loadingTitleEl) loadingTitleEl.textContent = '프로젝트 불러오는 중...';
      if (loadingSubtextEl) loadingSubtextEl.textContent = '';
      if (loadingContainer) {
        loadingContainer.innerHTML = `
          <div class="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-xs font-bold text-neutral-500 shadow-xs">
            참여 현황과 테스터 리뷰를 불러오고 있습니다...
          </div>
        `;
      }

      if (window.donDwaeDataService && typeof window.donDwaeDataService.fetchProjectById === 'function') {
        try {
          const project = await window.donDwaeDataService.fetchProjectById(projectId);
          if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
          if (project) {
            // Update Header & Project Info
            const titleEl = document.getElementById('feedback-project-title');
            const subtextEl = document.getElementById('feedback-project-subtext');
            const catTagEl = document.getElementById('feedback-project-category-tag');
            const statusTagEl = document.getElementById('feedback-project-status-tag');
            const statusBadgeEl = document.getElementById('test-status-badge');
            const visibilityBadgeEl = document.getElementById('feedback-review-visibility-badge');
            const timeLeftEl = document.getElementById('feedback-time-left');

            if (titleEl) titleEl.textContent = project.service_name || project.title;
            if (subtextEl) subtextEl.textContent = project.service_desc || project.title;
            if (catTagEl) catTagEl.textContent = project.category === 'abtest' ? 'A/B 테스트' : (project.category === 'vote' ? '투표 테스트' : (project.category === 'prototype' ? '프로토타입' : '프로덕트 테스트'));
            if (statusTagEl) statusTagEl.textContent = project.status === 'completed' ? '모집 완료' : '모집 중';
            if (statusBadgeEl) statusBadgeEl.textContent = project.status === 'completed' ? '[테스트 종료]' : '[모집 중]';
            if (visibilityBadgeEl) {
              visibilityBadgeEl.innerHTML = project.is_reviews_public
                ? '<span>🌐</span> 리뷰 공개'
                : '<span>🔒</span> 리뷰 비공개';
            }
            if (timeLeftEl) timeLeftEl.textContent = project.status === 'completed' ? '모집 종료' : '모집 중';

            // Update Metrics Cards
            const recruitsNumEl = document.getElementById('feedback-recruits-num');
            const targetCountEl = document.getElementById('feedback-target-count-text');
            const progressBarEl = document.getElementById('feedback-progress-bar');
            const recruitsRateEl = document.getElementById('feedback-recruits-rate');
            const totalRewardEl = document.getElementById('feedback-total-reward-num');
            const perPersonRewardEl = document.getElementById('feedback-per-person-reward-text');
            const averageRatingEl = document.getElementById('feedback-average-rating');
            const averageStarsEl = document.getElementById('feedback-average-stars');

            const current = project.current_count || 0;
            const target = project.target_count || 10;
            const pct = Math.min(100, Math.round((current / target) * 100));

            if (recruitsNumEl) recruitsNumEl.textContent = current;
            if (targetCountEl) targetCountEl.textContent = `/ ${target}명`;
            if (progressBarEl) progressBarEl.style.width = `${pct}%`;
            if (recruitsRateEl) recruitsRateEl.textContent = `${pct}% 달성`;
            if (averageRatingEl) averageRatingEl.textContent = '-';
            if (averageStarsEl) averageStarsEl.textContent = '☆☆☆☆☆';
            if (totalRewardEl) totalRewardEl.textContent = '0';
            if (perPersonRewardEl) perPersonRewardEl.textContent = '아직 지급된 리뷰 리워드가 없습니다';
          }

          // Fetch & Render Real DB Reviews
          const fbContainer = document.getElementById('feedback-cards-container');
          if (fbContainer) {
            const reviews = await window.donDwaeDataService.fetchProjectReviews(projectId);
            const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
            const averageRating = reviewCount > 0
              ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount
              : null;
            const roundedAverage = averageRating === null ? 0 : Math.round(averageRating);
            const rewardPerReview = Math.max(0, Number(project?.reward_coin) || 0);
            const averageRatingEl = document.getElementById('feedback-average-rating');
            const averageStarsEl = document.getElementById('feedback-average-stars');
            const totalRewardEl = document.getElementById('feedback-total-reward-num');
            const perPersonRewardEl = document.getElementById('feedback-per-person-reward-text');

            if (averageRatingEl) averageRatingEl.textContent = averageRating === null ? '-' : averageRating.toFixed(1);
            if (averageStarsEl) {
              averageStarsEl.textContent = averageRating === null
                ? '☆☆☆☆☆'
                : '★'.repeat(roundedAverage) + '☆'.repeat(Math.max(0, 5 - roundedAverage));
            }
            if (totalRewardEl) totalRewardEl.textContent = (reviewCount * rewardPerReview).toLocaleString();
            if (perPersonRewardEl) {
              perPersonRewardEl.textContent = reviewCount > 0
                ? `리뷰 완료 ${reviewCount}명 · 1인당 ${rewardPerReview.toLocaleString()} 돼지코인 지급`
                : '아직 지급된 리뷰 리워드가 없습니다';
            }

            if (!reviews || reviews.length === 0) {
              fbContainer.innerHTML = `
                <div class="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
                  <div class="w-14 h-14 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-2xl">
                    💬
                  </div>
                  <h4 class="text-sm font-extrabold text-neutral-dark mb-0.5">아직 등록된 테스터 리뷰가 없습니다</h4>
                  <p class="text-xs text-neutral-400 font-medium max-w-xs">
                    테스터들이 참여를 완료하면 생생한 피드백과 평가가 이곳에 실시간으로 기록됩니다.
                  </p>
                </div>
              `;
            } else {
              const reportSummaryHtml = renderReviewAnswerSummary(reviews);
              fbContainer.innerHTML = reportSummaryHtml + reviews.map((r, idx) => {
                const userNick = r.users?.nickname || '익명 테스터';
                const ratingStars = '★ '.repeat(Math.round(r.rating || 5));
                const parsedAnswers = parseReviewAnswers(r.answers);
                const reviewText = parsedAnswers.text || String(
                  r.content || r.feedback_text || ''
                ).trim();
                return `
                  <article class="feedback-card bg-white rounded-2xl border border-[#E5E7EB] p-7 shadow-subtle flex flex-col gap-5"
                    data-has-reply="${r.creator_reply ? 'true' : 'false'}" data-rating="${Number(r.rating) || 0}" data-created-at="${escapeHtml(r.created_at || '')}">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center font-bold text-xs text-neutral-700">
                          ${escapeHtml(userNick.charAt(0))}
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-sm text-neutral-dark">${escapeHtml(userNick)}</span>
                            <span class="text-xs text-neutral-muted">${r.created_at ? r.created_at.split('T')[0] : '방금 전'}</span>
                          </div>
                          <div class="text-[#8D2B44] text-xs flex gap-0.5 mt-0.5">
                            ${ratingStars}
                          </div>
                        </div>
                      </div>
                      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">[참여자 #${idx + 1}]</span>
                    </div>

                    ${parsedAnswers.items.length > 0 ? `
                      <div class="flex flex-col gap-2">
                        <span class="text-xs font-extrabold text-neutral-700 flex items-center gap-1.5">
                          <span>📋 검증 문항 응답</span>
                          <span class="text-[10px] font-bold text-neutral-400">${parsedAnswers.items.length}개</span>
                        </span>
                        ${renderReviewAnswerItems(parsedAnswers.items)}
                      </div>
                    ` : ''}

                    ${reviewText ? `
                      <div class="bg-canvas-cream/60 border border-[#E9E4C2] rounded-xl p-5 relative">
                        <p class="text-sm font-medium text-neutral-dark leading-relaxed whitespace-pre-line">${escapeHtml(reviewText)}</p>
                      </div>
                    ` : ''}
                  </article>
                `;
              }).join('');
            }
            applyFeedbackFilter();
          }
        } catch (err) {
          console.warn('[openFeedbackReport] Warning:', err.message);
          if (loadingTitleEl) loadingTitleEl.textContent = '리포트를 불러오지 못했습니다';
          if (loadingContainer) {
            loadingContainer.innerHTML = `
              <div class="bg-red-50 rounded-2xl border border-red-200 p-10 text-center text-xs font-bold text-red-700">
                ${escapeHtml(err.message || '잠시 후 다시 시도해 주세요.')}
              </div>
            `;
          }
        }
      } else {
        if (loadingTitleEl) loadingTitleEl.textContent = '리포트를 불러오지 못했습니다';
        if (loadingContainer) loadingContainer.textContent = '데이터 연결을 확인해 주세요.';
      }
    }

    function submitCreatorReply(cardId) {
      const input = document.getElementById(`reply-input-${cardId}`);
      if (!input || !input.value.trim()) {
        alert('답글 내용을 입력해주세요.');
        return;
      }

      // Mark card as replied
      const card = document.getElementById(`feedback-card-${cardId}`);
      if (card) {
        card.setAttribute('data-has-reply', 'true');
      }

      const replyText = input.value.trim();
      const repliesContainer = document.getElementById(`replies-box-${cardId}`);
      if (repliesContainer) {
        const bubble = document.createElement('div');
        bubble.className = 'bg-[#F8FAF5] rounded-xl p-4 border border-[#E4EBD5] text-xs text-neutral-dark flex flex-col gap-1 shadow-2xs animate-in fade-in duration-200';
        bubble.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-primary-dark flex items-center gap-1">
              <span>💬</span> 나의 답글
            </span>
            <span class="font-normal text-neutral-muted text-[10px]">방금 전</span>
          </div>
          <p class="text-neutral-700 leading-relaxed font-medium mt-0.5">${escapeHtml(replyText)}</p>
        `;
        repliesContainer.appendChild(bubble);
        repliesContainer.classList.remove('empty:hidden');
      }

      input.value = '';
      applyFeedbackFilter();
      showGenericToast('💬 테스터에게 답글이 성공적으로 등록되었습니다!', '✉️');
    }
