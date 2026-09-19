    function getServiceSidebarNavigationMarkup() {
      return `
        <button type="button" data-sidebar-item="all-projects"
          onclick="navigateTo('explore'); return false;"
          class="${sidebarTopItemBaseClass} ${sidebarTopItemInactiveClass}">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
          <span>전체 프로젝트</span>
        </button>

        <button type="button" data-sidebar-item="market"
          onclick="navigateTo('market'); return false;"
          class="${sidebarTopItemBaseClass} ${sidebarTopItemInactiveClass}">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 10h18M5 10l1-5h12l1 5m-14 0v9h14v-9M9 14h6v5" />
          </svg>
          <span>돼코상점</span>
        </button>

        <div class="flex flex-col gap-1">
          <button type="button" data-sidebar-item="my-info" aria-expanded="false"
            onclick="toggleMyInfoSidebar()"
            class="${sidebarTopItemBaseClass} ${sidebarTopItemInactiveClass}">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" />
            </svg>
            <span class="flex-1">내정보</span>
            <svg data-sidebar-chevron class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div data-sidebar-submenu class="hidden ml-6 pl-3 border-l border-[#D5DCBF] flex flex-col gap-0.5"
            aria-label="내정보 하위 메뉴">
            <button type="button" data-sidebar-subitem="profile"
              onclick="navigateToMypageSection('mypage-profile-section', 'profile'); return false;"
              class="${sidebarSubItemBaseClass} ${sidebarSubItemInactiveClass}">
              <span>프로필</span>
            </button>
            <button type="button" data-sidebar-subitem="my-projects"
              onclick="navigateToMypageSection('mypage-projects-section', 'my-projects'); return false;"
              class="${sidebarSubItemBaseClass} ${sidebarSubItemInactiveClass}">
              <span>내 프로젝트</span>
            </button>
            <button type="button" data-sidebar-subitem="coins"
              onclick="navigateToMypageSection('mypage-market-section', 'coins'); return false;"
              class="${sidebarSubItemBaseClass} ${sidebarSubItemInactiveClass}">
              <span>돼지코인내역&amp;적립</span>
              <span data-sidebar-coin class="text-[10px] font-bold text-primary-dark whitespace-nowrap"></span>
            </button>
            <button type="button" data-sidebar-subitem="support"
              onclick="navigateToMypageSection('mypage-support-section', 'support'); return false;"
              class="${sidebarSubItemBaseClass} ${sidebarSubItemInactiveClass}">
              <span>고객센터</span>
            </button>
          </div>
        </div>

        <button type="button" data-sidebar-item="notifications"
          onclick="navigateTo('notifications'); return false;"
          class="${sidebarTopItemBaseClass} ${sidebarTopItemInactiveClass}">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z" />
          </svg>
          <span>알림</span>
        </button>
      `;
    }

    function renderServiceSidebarNavigations() {
      const markup = getServiceSidebarNavigationMarkup();
      document.querySelectorAll('[data-service-sidebar-nav]').forEach(nav => {
        nav.innerHTML = markup;
      });
      updateServiceSidebarNavigation(currentViewKey);
    }

    function getServiceTopNavigationMarkup() {
      return `
        <button type="button" data-top-nav-item="all-projects"
          onclick="navigateTo('explore'); return false;"
          class="${topNavItemBaseClass} ${topNavItemInactiveClass}">
          <span>전체 프로젝트</span>
        </button>

        <button type="button" data-top-nav-item="market"
          onclick="navigateTo('market'); return false;"
          class="${topNavItemBaseClass} ${topNavItemInactiveClass}">
          <span>돼코상점</span>
        </button>

        <div data-top-myinfo-wrapper class="relative">
          <button type="button" data-top-nav-item="my-info" data-top-myinfo-trigger aria-expanded="false"
            onclick="toggleTopMyInfoNavigation(event)"
            class="${topNavItemBaseClass} ${topNavItemInactiveClass}">
            <span>내정보</span>
            <svg data-top-myinfo-chevron class="w-3.5 h-3.5 transition-transform duration-200" fill="none"
              stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div data-top-myinfo-menu
            class="hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-card z-50"
            aria-label="내정보 하위 메뉴">
            <button type="button" data-top-nav-subitem="profile"
              onclick="navigateToMypageSection('mypage-profile-section', 'profile'); return false;"
              class="${topNavSubItemBaseClass} ${topNavSubItemInactiveClass}">
              <span>프로필</span>
            </button>
            <button type="button" data-top-nav-subitem="my-projects"
              onclick="navigateToMypageSection('mypage-projects-section', 'my-projects'); return false;"
              class="${topNavSubItemBaseClass} ${topNavSubItemInactiveClass}">
              <span>내 프로젝트</span>
            </button>
            <button type="button" data-top-nav-subitem="coins"
              onclick="navigateToMypageSection('mypage-market-section', 'coins'); return false;"
              class="${topNavSubItemBaseClass} ${topNavSubItemInactiveClass}">
              <span>돼지코인내역&amp;적립</span>
            </button>
            <button type="button" data-top-nav-subitem="support"
              onclick="navigateToMypageSection('mypage-support-section', 'support'); return false;"
              class="${topNavSubItemBaseClass} ${topNavSubItemInactiveClass}">
              <span>고객센터</span>
            </button>
          </div>
        </div>

        <button type="button" data-top-nav-item="notifications"
          onclick="navigateTo('notifications'); return false;"
          class="${topNavItemBaseClass} ${topNavItemInactiveClass}">
          <span>알림</span>
        </button>
      `;
    }

    function renderServiceTopNavigations() {
      const markup = getServiceTopNavigationMarkup();
      document.querySelectorAll('[data-service-top-nav]').forEach(nav => {
        nav.innerHTML = markup;
      });
      updateServiceTopNavigation(currentViewKey);
    }
