    function changeFeedbackReportProject(pVal) {
      const subtext = document.getElementById('feedback-project-subtext');
      const catTag = document.getElementById('feedback-project-category-tag');
      const statusTag = document.getElementById('feedback-project-status-tag');
      const statusBadge = document.getElementById('test-status-badge');

      const projectData = {
        p1: { sub: "AI 영수증 인식 스마트 가계부 '머니로그' 베타테스터 모집", cat: "프로덕트 테스트", status: "모집 완료", badge: "[테스트 종료]" },
        p2: { sub: "영수증 사진 촬영으로 자동 지출 분류 가계부 체험", cat: "앱 테스트", status: "모집 진행중", badge: "[모집 중]" },
        p3: { sub: "SaaS 랜딩페이지 헤더 메인 카피 A/B 테스트", cat: "A/B 투표", status: "모집 완료", badge: "[테스트 종료]" },
        p4: { sub: "노코드 피그마 연동 템플릿 마켓플레이스 사용성 검증", cat: "웹 테스트", status: "모집 진행중", badge: "[모집 중]" }
      };

      const item = projectData[pVal] || projectData.p1;
      if (subtext) subtext.textContent = item.sub;
      if (catTag) catTag.textContent = item.cat;
      if (statusTag) statusTag.textContent = item.status;
      if (statusBadge) statusBadge.textContent = item.badge;

      showGenericToast(`'${item.cat}' 피드백 리포트 데이터로 전환되었습니다.`, '📊');
    }

    function startRealtimeReviewTimer() {
      if (reviewToastTimer) clearTimeout(reviewToastTimer);
      // Dummy timer removed: notifications trigger only on real events
    }

    function showReviewToast() {
      const toast = document.getElementById('review-toast');
      if (toast) {
        toast.style.zIndex = '99999';
        toast.classList.remove('translate-x-32', 'opacity-0', 'pointer-events-none');
        toast.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
      }
    }

    function dismissReviewToast() {
      const toast = document.getElementById('review-toast');
      if (toast) {
        toast.classList.add('translate-x-32', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
      }
    }

    function handleToastClick() {
      dismissReviewToast();
      openLatestFeedbackReport();
    }

    function updateFeedbackRecruitsUI() {
      const target = myCreatedTest ? myCreatedTest.targetCount : 30;
      const reward = myCreatedTest ? myCreatedTest.rewardCoin : 50;
      const current = Math.max(target - 1, 1);
      const rate = Math.round((current / target) * 100);
      const totalBudget = current * reward;

      // Update feedback dashboard header metrics
      const recruitsNum = document.getElementById('feedback-recruits-num');
      const targetCountText = document.getElementById('feedback-target-count-text');
      const recruitsRate = document.getElementById('feedback-recruits-rate');
      const progressBar = document.getElementById('feedback-progress-bar');
      const totalRewardNum = document.getElementById('feedback-total-reward-num');
      const perPersonRewardText = document.getElementById('feedback-per-person-reward-text');
      const card3Badge = document.getElementById('feedback-card3-participant-badge');

      if (recruitsNum) recruitsNum.textContent = String(current);
      if (targetCountText) targetCountText.textContent = `/ ${target}명`;
      if (recruitsRate) recruitsRate.textContent = `${rate}% 달성`;
      if (progressBar) progressBar.style.width = `${rate}%`;
      if (totalRewardNum) totalRewardNum.textContent = totalBudget.toLocaleString();
      if (perPersonRewardText) perPersonRewardText.textContent = `1인당 ${reward} 돼지코인 정상 지급 완료`;
      if (card3Badge) card3Badge.textContent = `[${target}번째 참여자]`;

      // Update Modal recruits text
      const modalTarget1 = document.getElementById('modal-target-recruits-1');
      const modalTarget2 = document.getElementById('modal-target-recruits-2');
      const toastTarget = document.getElementById('toast-target-recruits');
      if (modalTarget1) modalTarget1.textContent = `${target}명`;
      if (modalTarget2) modalTarget2.textContent = String(target);
      if (toastTarget) toastTarget.textContent = String(target);

      // Apply initial unreplied filter
      applyFeedbackFilter();
    }

    function toggleUnrepliedFeedbackFilter() {
      isUnrepliedFilterActive = !isUnrepliedFilterActive;
      applyFeedbackFilter();
    }

    function applyFeedbackFilter() {
      const filterBtn = document.getElementById('btn-filter-unreplied');
      const checkIcon = document.getElementById('unreplied-filter-check');
      const badge = document.getElementById('unreplied-count-badge');
      const cards = document.querySelectorAll('.feedback-card');

      let unrepliedCount = 0;

      cards.forEach(card => {
        const hasReply = card.getAttribute('data-has-reply') === 'true';
        if (!hasReply) {
          unrepliedCount++;
        }

        if (isUnrepliedFilterActive) {
          // 답글 미작성건만 보기 활성화: 답글 있는 카드는 숨김
          if (hasReply) {
            card.style.display = 'none';
          } else {
            card.style.display = 'flex';
          }
        } else {
          // 전체 보기: 모든 카드 표시
          card.style.display = 'flex';
        }
      });

      if (badge) {
        badge.textContent = `${unrepliedCount}건`;
      }

      if (filterBtn) {
        if (isUnrepliedFilterActive) {
          filterBtn.className = 'px-4 py-2 rounded-full bg-[#EBF7E2] text-xs font-bold text-[#2A5E12] border-2 border-primary flex items-center gap-1.5 transition-all shadow-xs cursor-pointer';
          if (checkIcon) checkIcon.textContent = '✓';
        } else {
          filterBtn.className = 'px-4 py-2 rounded-full bg-white text-xs font-semibold text-neutral-600 border border-neutral-border hover:bg-neutral-50 flex items-center gap-1.5 transition-all cursor-pointer';
          if (checkIcon) checkIcon.textContent = '○';
        }
      }
    }

    function sortFeedback(type) {
      const container = document.getElementById('feedback-cards-container');
      if (!container) return;

      const btnRating = document.getElementById('btn-sort-rating');
      const btnLatest = document.getElementById('btn-sort-latest');

      if (type === 'rating') {
        if (btnRating) btnRating.className = 'px-4 py-2 rounded-full bg-[#191A1C] text-white text-xs font-bold transition-all shadow-xs';
        if (btnLatest) btnLatest.className = 'px-4 py-2 rounded-full border border-neutral-border bg-white text-xs font-semibold text-neutral-dark hover:bg-neutral-50 transition-all';
      } else {
        if (btnLatest) btnLatest.className = 'px-4 py-2 rounded-full bg-[#191A1C] text-white text-xs font-bold transition-all shadow-xs';
        if (btnRating) btnRating.className = 'px-4 py-2 rounded-full border border-neutral-border bg-white text-xs font-semibold text-neutral-dark hover:bg-neutral-50 transition-all';
      }

      showGenericToast(type === 'rating' ? '⭐ 별점 높은순으로 정렬되었습니다.' : '🕒 최신순으로 정렬되었습니다.', '📊');
    }
