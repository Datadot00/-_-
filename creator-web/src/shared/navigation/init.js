    function initializeNavigationEvents() {
      document.addEventListener('click', event => {
        if (!event.target.closest('[data-top-myinfo-wrapper]')) closeTopMyInfoNavigation();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeTopMyInfoNavigation();
      });
    }

    function restoreNavigationState() {
      const savedView = localStorage.getItem('dondwae_current_view');
      const savedPostId = localStorage.getItem('dondwae_current_post_id');
      const pendingEditingProjectId = getActiveProjectEditId();
      if (savedView && savedView !== 'landing' && savedView !== 'login') {
        if (savedView === 'post' && savedPostId && typeof openPostDetail === 'function') {
          openPostDetail(savedPostId);
        } else {
          navigateTo(savedView, {
            preserveProjectEdit: savedView === 'create' && Boolean(pendingEditingProjectId)
          });
        }
      } else {
        navigateTo('landing');
      }

      if (savedView === 'create' && pendingEditingProjectId) {
        setTimeout(async () => {
          const restored = await openEditPostModal(pendingEditingProjectId);
          if (!restored) {
            // 편집 대상을 못 불러왔으면 편집 맥락을 지운다. 남겨두면 등록 화면이
            // 편집 흐름으로 오인돼 게이팅을 건너뛴다.
            clearProjectEditContext();
            navigateTo('create');
          }
        }, 0);
      }
    }
