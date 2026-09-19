    function updateServiceSidebarNavigation(viewKey, mypageSection = currentMypageSection) {
      const activeTopItem = viewKey === 'explore'
        ? 'all-projects'
        : viewKey === 'market'
          ? 'market'
          : viewKey === 'notifications'
            ? 'notifications'
            : ['mypage', 'feedback'].includes(viewKey)
              ? 'my-info'
              : null;
      const activeSubItem = viewKey === 'feedback'
        ? 'my-projects'
        : viewKey === 'mypage'
          ? mypageSection
          : null;

      document.querySelectorAll('[data-sidebar-item]').forEach(item => {
        const isActive = item.dataset.sidebarItem === activeTopItem;
        item.className = `${sidebarTopItemBaseClass} ${isActive ? sidebarTopItemActiveClass : sidebarTopItemInactiveClass}`;
        if (isActive) {
          item.setAttribute('aria-current', 'page');
        } else {
          item.removeAttribute('aria-current');
        }
      });

      document.querySelectorAll('[data-sidebar-subitem]').forEach(item => {
        const isActive = item.dataset.sidebarSubitem === activeSubItem;
        item.className = `${sidebarSubItemBaseClass} ${isActive ? sidebarSubItemActiveClass : sidebarSubItemInactiveClass}`;
        if (isActive) {
          item.setAttribute('aria-current', 'location');
        } else {
          item.removeAttribute('aria-current');
        }
      });

      updateMyInfoSidebarDisclosure();
    }

    function updateMyInfoSidebarDisclosure() {
      document.querySelectorAll('[data-sidebar-item="my-info"]').forEach(button => {
        button.setAttribute('aria-expanded', String(isMyInfoSidebarExpanded));
      });

      document.querySelectorAll('[data-sidebar-submenu]').forEach(submenu => {
        submenu.classList.toggle('hidden', !isMyInfoSidebarExpanded);
      });

      document.querySelectorAll('[data-sidebar-chevron]').forEach(chevron => {
        chevron.classList.toggle('rotate-180', isMyInfoSidebarExpanded);
      });
    }

    function toggleMyInfoSidebar() {
      isMyInfoSidebarExpanded = !isMyInfoSidebarExpanded;
      updateMyInfoSidebarDisclosure();
    }

    function showSidebarFeatureNotice(label, icon) {
      showGenericToast(`${label} 화면은 다음 작업에서 연결할 예정입니다.`, icon);
    }

    function updateServiceTopNavigation(viewKey, mypageSection = currentMypageSection) {
      const activeTopItem = ['explore', 'post'].includes(viewKey)
        ? 'all-projects'
        : viewKey === 'market'
          ? 'market'
          : viewKey === 'notifications'
            ? 'notifications'
            : ['mypage', 'feedback', 'create'].includes(viewKey)
              ? 'my-info'
              : null;
      const activeSubItem = ['feedback', 'create'].includes(viewKey)
        ? 'my-projects'
        : viewKey === 'mypage'
          ? mypageSection
          : null;

      document.querySelectorAll('[data-top-nav-item]').forEach(item => {
        const isActive = item.dataset.topNavItem === activeTopItem;
        item.className = `${topNavItemBaseClass} ${isActive ? topNavItemActiveClass : topNavItemInactiveClass}`;
        if (isActive) {
          item.setAttribute('aria-current', 'page');
        } else {
          item.removeAttribute('aria-current');
        }
      });

      document.querySelectorAll('[data-top-nav-subitem]').forEach(item => {
        const isActive = item.dataset.topNavSubitem === activeSubItem;
        item.className = `${topNavSubItemBaseClass} ${isActive ? topNavSubItemActiveClass : topNavSubItemInactiveClass}`;
        if (isActive) {
          item.setAttribute('aria-current', 'location');
        } else {
          item.removeAttribute('aria-current');
        }
      });

      updateTopMyInfoNavigationDisclosure();
    }

    function updateTopMyInfoNavigationDisclosure() {
      document.querySelectorAll('[data-top-myinfo-trigger]').forEach(button => {
        button.setAttribute('aria-expanded', String(isTopMyInfoExpanded));
      });
      document.querySelectorAll('[data-top-myinfo-menu]').forEach(menu => {
        menu.classList.toggle('hidden', !isTopMyInfoExpanded);
      });
      document.querySelectorAll('[data-top-myinfo-chevron]').forEach(chevron => {
        chevron.classList.toggle('rotate-180', isTopMyInfoExpanded);
      });
    }

    function toggleTopMyInfoNavigation(event) {
      if (event) event.stopPropagation();
      isTopMyInfoExpanded = !isTopMyInfoExpanded;
      updateTopMyInfoNavigationDisclosure();
    }

    function closeTopMyInfoNavigation() {
      if (!isTopMyInfoExpanded) return;
      isTopMyInfoExpanded = false;
      updateTopMyInfoNavigationDisclosure();
    }

    function showTopNavigationFeatureNotice(label, icon) {
      closeTopMyInfoNavigation();
      showSidebarFeatureNotice(label, icon);
    }

    function navigateTo(viewKey, { preserveProjectEdit = false, isBack = false } = {}) {
      // 자격 확인 전에는 폼을 건드리지 않는다. 작성 중이던 내용이 날아가면 안 된다.
      if (viewKey === 'create' && !preserveProjectEdit && !isProjectEditMode
        && !window.userHasPassedGating) {
        ensureProjectGatingPassed().then(passed => {
          if (passed) {
            navigateTo('create', { isBack });
            return;
          }
          // 사유와 진행률은 서약 모달의 차단 뷰가 보여준다.
          openPledgeModal();
        });
        return;
      }

      if (viewKey === 'create') {
        if (!preserveProjectEdit) {
          resetCreateProjectForm();
        } else if (!isProjectEditMode) {
          resetCreateProjectForm();
        }
        goToStep(1);
      } else if (isProjectEditMode) {
        clearProjectEditContext();
      }
      if (!views[viewKey]) return;

      // 뒤로 가기로 온 이동은 이력에 다시 쌓지 않는다.
      if (!isBack && currentViewKey && currentViewKey !== viewKey) {
        viewHistory.push(currentViewKey);
        if (viewHistory.length > VIEW_HISTORY_LIMIT) viewHistory.shift();
      }
      currentViewKey = viewKey;

      if (viewKey !== 'landing' && viewKey !== 'login') {
        try {
          localStorage.setItem('dondwae_current_view', viewKey);
        } catch (e) {}
      } else if (viewKey === 'landing') {
        try {
          localStorage.setItem('dondwae_current_view', 'landing');
        } catch (e) {}
      }

      Object.keys(views).forEach(key => {
        const el = document.getElementById(`view-${key}`);
        if (el) {
          el.classList.add('hidden');
          el.classList.remove('view-enter');
        }
      });

      const targetEl = document.getElementById(`view-${viewKey}`);
      if (targetEl) {
        targetEl.classList.remove('hidden');
        requestAnimationFrame(() => {
          targetEl.classList.add('view-enter');
        });
      }

      if (viewKey === 'notifications') {
        renderNotificationsUI();
      }

      if (viewKey === 'mypage') {
        showMypageSectionOnly(currentMypageSection || 'profile');
      }
      if (['mypage', 'feedback'].includes(viewKey)) {
        isMyInfoSidebarExpanded = true;
      } else if (['explore', 'market'].includes(viewKey)) {
        isMyInfoSidebarExpanded = false;
      }
      isTopMyInfoExpanded = false;
      updateServiceSidebarNavigation(viewKey);
      updateServiceTopNavigation(viewKey);

      // Update Switcher Button Highlights
      document.querySelectorAll('[data-view-btn]').forEach(btn => {
        const key = btn.getAttribute('data-view-btn');
        if (key === viewKey) {
          btn.classList.add('bg-primary/25', 'text-neutral-dark', 'font-bold');
        } else {
          btn.classList.remove('bg-primary/25', 'text-neutral-dark', 'font-bold');
        }
      });

      const badge = document.getElementById('current-view-badge');
      if (badge) {
        badge.textContent = views[viewKey].title;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Feedback dashboard goal completion modal only triggers when real reviews arrive on my project
    }

    function navigateBack(fallbackViewKey = 'explore') {
      while (viewHistory.length > 0) {
        const previousViewKey = viewHistory.pop();
        if (previousViewKey && previousViewKey !== currentViewKey && views[previousViewKey]) {
          navigateTo(previousViewKey, { isBack: true });
          return;
        }
      }
      navigateTo(fallbackViewKey, { isBack: true });
    }
