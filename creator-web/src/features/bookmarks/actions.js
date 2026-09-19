    async function toggleBookmark(event, btnElement, projectId) {
      event.stopPropagation();
      const isSaved = btnElement.classList.contains('is-saved');
      const svg = btnElement.querySelector('svg');

      if (!isSaved) {
        btnElement.classList.add('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
        btnElement.classList.remove('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
        btnElement.setAttribute('title', '스크랩 해제');
        if (svg) {
          svg.setAttribute('fill', 'currentColor');
          svg.setAttribute('stroke', 'currentColor');
        }
        userScrapCount++;
        showGenericToast('📌 프로젝트가 스크랩에 저장되었습니다! 마이페이지에서 확인하실 수 있습니다.', '🚩');

        // Supabase DB 및 마이페이지 컬렉션 연동
        if (projectId) {
          const ds = window.donDwaeDataService;
          if (ds) {
            try {
              const { data: { session } } = await ds.supabase.auth.getSession();
              if (session?.user) {
                await ds.toggleScrap(session.user.id, projectId, false);
                const targetProj = (window.liveExploreProjects || []).find(p => String(p.id) === String(projectId));
                if (targetProj && window.myProjectCollections) {
                  window.myProjectCollections.scraped = window.myProjectCollections.scraped || [];
                  if (!window.myProjectCollections.scraped.some(p => String(p.id) === String(projectId))) {
                    window.myProjectCollections.scraped.unshift(targetProj);
                  }
                }
              }
            } catch (err) {
              console.warn('[toggleBookmark] DB sync failed:', err);
            }
          }
        }
      } else {
        btnElement.classList.remove('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
        btnElement.classList.add('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
        btnElement.setAttribute('title', '스크랩 저장');
        if (svg) {
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
        }
        userScrapCount = Math.max(0, userScrapCount - 1);
        showGenericToast('스크랩 저장이 취소되었습니다.', '🗑️');

        if (projectId) {
          const ds = window.donDwaeDataService;
          if (ds) {
            try {
              const { data: { session } } = await ds.supabase.auth.getSession();
              if (session?.user) {
                await ds.toggleScrap(session.user.id, projectId, true);
                if (window.myProjectCollections?.scraped) {
                  window.myProjectCollections.scraped = window.myProjectCollections.scraped.filter(p => String(p.id) !== String(projectId));
                }
              }
            } catch (err) {
              console.warn('[toggleBookmark] DB remove failed:', err);
            }
          }
        }
      }

      // Update MyPage counter if visible
      const scrapEl = document.getElementById('mypage-scrap-count');
      const myprojScrapedBadge = document.getElementById('myproj-scraped-count');
      const actualCount = window.myProjectCollections?.scraped ? window.myProjectCollections.scraped.length : userScrapCount;
      if (scrapEl) scrapEl.textContent = actualCount;
      if (myprojScrapedBadge) myprojScrapedBadge.textContent = actualCount;
    }

    function updateDetailBookmarkUI(postId) {
      const targetId = postId || currentPostId;
      if (!targetId) return;
      const isScrapped = (window.myProjectCollections?.scraped || []).some(p => String(p.id) === String(targetId));
      const titleBtn = document.getElementById('post-title-bookmark-btn');
      const sideBtn = document.getElementById('post-detail-bookmark-btn');
      const sideLabel = document.getElementById('post-detail-bookmark-label');

      [titleBtn, sideBtn].forEach(btn => {
        if (!btn) return;
        const svg = btn.querySelector('svg');
        if (isScrapped) {
          btn.classList.add('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
          btn.classList.remove('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
          btn.setAttribute('title', '스크랩 해제');
          if (svg) {
            svg.setAttribute('fill', 'currentColor');
            svg.setAttribute('stroke', 'currentColor');
          }
        } else {
          btn.classList.remove('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
          btn.classList.add('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
          btn.setAttribute('title', '스크랩 저장');
          if (svg) {
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
          }
        }
      });

      if (sideLabel) {
        sideLabel.textContent = isScrapped ? '저장됨' : '저장';
      }
    }

    window.updateDetailBookmarkUI = updateDetailBookmarkUI;

    async function toggleCurrentDetailBookmark(event) {
      if (event) event.stopPropagation();
      const targetId = currentPostId;
      if (!targetId) return;

      const titleBtn = document.getElementById('post-title-bookmark-btn');
      const sideBtn = document.getElementById('post-detail-bookmark-btn');
      const activeBtn = sideBtn || titleBtn;
      if (!activeBtn) return;

      await toggleBookmark(event, activeBtn, targetId);
      updateDetailBookmarkUI(targetId);

      // 전체 프로젝트 피드 카드에 동일한 항목이 있다면 동기화
      const feedCard = document.querySelector(`[data-card-id="${targetId}"]`);
      if (feedCard) {
        const feedBtn = feedCard.querySelector('.bookmark-flag-btn');
        if (feedBtn) {
          const isNowScrapped = (window.myProjectCollections?.scraped || []).some(p => String(p.id) === String(targetId));
          const svg = feedBtn.querySelector('svg');
          if (isNowScrapped) {
            feedBtn.classList.add('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
            feedBtn.classList.remove('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
            feedBtn.setAttribute('title', '스크랩 해제');
            if (svg) svg.setAttribute('fill', 'currentColor');
          } else {
            feedBtn.classList.remove('is-saved', 'text-[#2F6517]', 'bg-[#EBF7E3]', 'border-[#A9DD82]');
            feedBtn.classList.add('text-neutral-400', 'hover:text-neutral-700', 'border-neutral-200');
            feedBtn.setAttribute('title', '스크랩 저장');
            if (svg) svg.setAttribute('fill', 'none');
          }
        }
      }
    }

    window.toggleCurrentDetailBookmark = toggleCurrentDetailBookmark;
