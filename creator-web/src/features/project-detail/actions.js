    function setDetailParticipationCta(state = 'fresh', projectId = currentPostId, rewardCoin = 0) {
      const ctaBtn = document.getElementById('btn-participate-test');
      const ctaIcon = document.getElementById('btn-participate-test-icon');
      const ctaText = document.getElementById('btn-participate-test-text');
      if (!ctaBtn) return;

      const baseClass = 'w-full py-4 px-4 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2';
      ctaBtn.hidden = false;
      ctaBtn.classList.remove('hidden');

      setDetailParticipationNotice(state);

      if (state === 'completed') {
        // 리뷰까지 마친 뒤에는 참여 대신 서비스를 다시 둘러볼 수 있게 전환한다.
        const publicUrl = getProjectPublicUrl(projectId);
        if (publicUrl) {
          ctaBtn.disabled = false;
          ctaBtn.onclick = () => openPublicServiceUrl(projectId);
          ctaBtn.className = `${baseClass} bg-white border-2 border-[#2F6517] text-[#2F6517] hover:bg-[#F4F9EE] active:scale-[0.98] shadow-xs cursor-pointer`;
          if (ctaIcon) ctaIcon.textContent = '↗';
          if (ctaText) ctaText.textContent = '서비스 구경하기';
          return;
        }
        ctaBtn.disabled = true;
        ctaBtn.onclick = null;
        ctaBtn.className = `${baseClass} bg-neutral-200 text-neutral-500 cursor-not-allowed`;
        if (ctaIcon) ctaIcon.textContent = '✓';
        if (ctaText) ctaText.textContent = '참여완료 · 리뷰 제출 완료';
        return;
      }

      if (state === 'review-needed') {
        ctaBtn.disabled = false;
        ctaBtn.onclick = () => resumeProjectReview(projectId);
        ctaBtn.className = `${baseClass} bg-[#18181B] hover:bg-neutral-800 active:scale-[0.98] text-white shadow-card cursor-pointer`;
        if (ctaIcon) ctaIcon.textContent = '✍️';
        if (ctaText) ctaText.textContent = `리뷰 작성하기${rewardCoin ? ` · 완료 시 +${Number(rewardCoin).toLocaleString()} 돼지코인` : ''}`;
        return;
      }

      ctaBtn.disabled = false;
      ctaBtn.onclick = startMissionParticipation;
      ctaBtn.className = `${baseClass} bg-[#2F6517] hover:bg-[#25500F] active:scale-[0.98] text-white shadow-card cursor-pointer`;
      if (ctaIcon) ctaIcon.textContent = '🚀';
      if (ctaText) ctaText.textContent = '미션 참여하기';
    }

    function handleBrokenProjectThumbnail(image) {
      if (!image) return;

      if (image.id === 'thumbnail-img-preview') {
        image.removeAttribute('src');
        image.classList.add('hidden');
        document.getElementById('btn-remove-thumbnail')?.classList.add('hidden');
        return;
      }

      const isCard = image.dataset.thumbnailVariant === 'card';
      const fallback = document.createElement('div');
      fallback.className = isCard
        ? 'w-full h-full bg-blue-50/70 flex flex-col items-center justify-center gap-1 text-center'
        : 'w-full min-h-[220px] rounded-xl bg-[#F9FBEC] border border-[#DCE4B8] flex flex-col items-center justify-center gap-2 px-6 text-center';
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', '등록된 서비스 이미지가 없어 기본 미리보기를 표시합니다.');

      const icon = document.createElement('span');
      icon.className = isCard ? 'text-xl' : 'text-3xl';
      icon.textContent = '🖼️';

      const message = document.createElement('span');
      message.className = isCard
        ? 'text-[11px] font-bold text-blue-900'
        : 'text-xs font-extrabold text-[#2F6517]';
      message.textContent = isCard ? '서비스 미리보기' : '등록된 서비스 이미지를 불러올 수 없습니다.';

      fallback.append(icon, message);
      image.replaceWith(fallback);
    }

    function switchPostDetailTab(tabKey) {
      const tabOverview = document.getElementById('tab-content-overview');
      const tabMission = document.getElementById('tab-content-mission');
      const tabReviews = document.getElementById('tab-content-reviews');

      const btnOverview = document.getElementById('tab-btn-overview');
      const btnMission = document.getElementById('tab-btn-mission');
      const btnReviews = document.getElementById('tab-btn-reviews');

      if (!tabOverview || !tabMission || !tabReviews) return;

      // Hide all tab contents
      tabOverview.classList.add('hidden');
      tabMission.classList.add('hidden');
      tabReviews.classList.add('hidden');

      // Reset button styles
      [btnOverview, btnMission, btnReviews].forEach(btn => {
        if (btn) {
          btn.className = 'flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50';
        }
      });

      // Active selected tab
      if (tabKey === 'overview') {
        tabOverview.classList.remove('hidden');
        if (btnOverview) btnOverview.className = 'flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-[#FAFBF5] text-[#2F6517] border border-[#E2E8D3] shadow-2xs';
      } else if (tabKey === 'mission') {
        tabMission.classList.remove('hidden');
        if (btnMission) btnMission.className = 'flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-[#FAFBF5] text-[#2F6517] border border-[#E2E8D3] shadow-2xs';
      } else if (tabKey === 'reviews') {
        tabReviews.classList.remove('hidden');
        if (btnReviews) btnReviews.className = 'flex-1 py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 bg-[#FAFBF5] text-[#2F6517] border border-[#E2E8D3] shadow-2xs';
      }
    }

    function setMissionPreviewCard(publicUrl, { projectId = currentPostId, serviceName = '' } = {}) {
      const missionCardLabel = document.getElementById('post-mission-card-label');
      const missionTypeBadge = document.getElementById('post-mission-type-badge');
      const missionServiceRow = document.getElementById('post-mission-service-row');
      const missionServiceName = document.getElementById('post-mission-service-name');
      const missionCardSubtext = document.getElementById('post-mission-card-subtext');
      const missionCardBtn = document.getElementById('post-mission-card-btn');
      const missionCardBtnText = document.getElementById('post-mission-card-btn-text');
      const hasPublicUrl = Boolean(publicUrl);
      const displayName = resolveMissionServiceName(projectId, serviceName);

      if (missionCardLabel) missionCardLabel.textContent = '서비스 미리보기';
      // URL을 제목처럼 노출하던 자리에는 서비스명을 보여준다.
      if (missionServiceName) missionServiceName.textContent = displayName;
      if (missionServiceRow) missionServiceRow.classList.toggle('hidden', !displayName);
      if (missionTypeBadge) {
        missionTypeBadge.textContent = hasPublicUrl
          ? '서비스 구경용 · 참여 등록 안 됨'
          : '연결된 서비스 없음';
        missionTypeBadge.className = hasPublicUrl
          ? 'text-xs font-bold text-[#2F6517]'
          : 'text-xs font-bold text-neutral-500';
      }
      if (missionCardSubtext) {
        missionCardSubtext.textContent = hasPublicUrl
          ? '* 우측 버튼을 누르면 새 탭에서 서비스를 둘러볼 수 있습니다. 미션 참여와 리워드 지급은 참여하기 버튼에서 시작해 주세요.'
          : '* 둘러볼 수 있는 서비스가 아직 등록되지 않았습니다. 미션 참여는 참여하기 버튼에서 시작해 주세요.';
      }
      if (missionCardBtnText) {
        missionCardBtnText.textContent = hasPublicUrl
          ? '↗ 서비스 구경하기'
          : '구경할 서비스 없음';
      }
      if (missionCardBtn) {
        missionCardBtn.onclick = hasPublicUrl ? () => openPublicServiceUrl(projectId) : null;
        missionCardBtn.disabled = !hasPublicUrl;
        missionCardBtn.classList.toggle('opacity-50', !hasPublicUrl);
        missionCardBtn.classList.toggle('cursor-not-allowed', !hasPublicUrl);
        missionCardBtn.classList.toggle('cursor-pointer', hasPublicUrl);
      }
    }

    function showGoalAchievedModal(proj) {
      isFeedbackGoalCompleted = true;
      const target = proj?.target_count || (myCreatedTest ? myCreatedTest.targetCount : 30);
      window.lastCompletedGoalProjectId = proj?.id || currentPostId;

      const modalTarget1 = document.getElementById('modal-target-recruits-1');
      const modalTarget2 = document.getElementById('modal-target-recruits-2');
      const toastTarget = document.getElementById('toast-target-recruits');
      if (modalTarget1) modalTarget1.textContent = `${target}명`;
      if (modalTarget2) modalTarget2.textContent = String(target);
      if (toastTarget) toastTarget.textContent = String(target);

      const modal = document.getElementById('goal-achieved-modal');
      if (modal) {
        modal.classList.remove('hidden');
      }
    }

    function triggerGoalCompletion(proj) {
      showGoalAchievedModal(proj);
    }

    function closeGoalAchievedModal() {
      const modal = document.getElementById('goal-achieved-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
      if (window.lastCompletedGoalProjectId) {
        openPostDetail(window.lastCompletedGoalProjectId);
        switchPostDetailTab('reviews');
      }
    }

    function openNotifyModal() {
      const modal = document.getElementById('notify-testers-modal');
      if (modal) modal.classList.remove('hidden');
    }

    function closeNotifyModal() {
      const modal = document.getElementById('notify-testers-modal');
      if (modal) modal.classList.add('hidden');
    }

    function sendUpdateNotification() {
      closeNotifyModal();

      // Show Success Toast
      const toast = document.getElementById('update-toast');
      if (toast) {
        toast.style.zIndex = '99999';
        toast.classList.remove('translate-x-32', 'opacity-0', 'pointer-events-none');
        toast.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');

        setTimeout(() => {
          dismissUpdateToast();
        }, 6000);
      }
    }

    function dismissUpdateToast() {
      const toast = document.getElementById('update-toast');
      if (toast) {
        toast.classList.add('translate-x-32', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
      }
    }

    async function openPostDetail(postId = 'moneylog') {
      currentPostId = postId;
      try {
        localStorage.setItem('dondwae_current_view', 'post');
        localStorage.setItem('dondwae_current_post_id', postId);
      } catch (e) {}
      navigateTo('post');
      updateDetailBookmarkUI(postId);

      if (window.donDwaeDataService && typeof window.donDwaeDataService.fetchProjectById === 'function') {
        try {
          const dbProj = await window.donDwaeDataService.fetchProjectById(postId);
          if (dbProj) {
            window.renderDBProjectToDetail(dbProj);
            return;
          }
        } catch (err) {
          console.warn('[openPostDetail] DB fetch notice:', err);
        }
      }

      renderPreviewProjectDetail(postId);

      setMissionPreviewCard(getProjectPublicUrl(postId), { projectId: postId });

      if (postId !== 'my-created-test' && postId !== 'my-test') {
        renderDetailLoginInfo({ login_required: false });
      } else if (myCreatedTest) {
        renderDetailLoginInfo(myCreatedTest);
      }

      renderDetailReviews(postId, myCreatedTest);

      switchPostDetailTab('overview');
      navigateTo('post');
    }
