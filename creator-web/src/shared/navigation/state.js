    const views = {
      'landing': { title: '랜딩 페이지 (SCR-01)' },
      'login': { title: '로그인 페이지' },
      'explore': { title: '메인 피드/대시보드 (SCR-05)' },
      'create': { title: '테스트 등록 폼 (SCR-15)' },
      'post': { title: '테스트 상세 (제작자 뷰)' },
      'vote-progress': { title: '시안 투표 진행' },
      'feedback': { title: '피드백 결과 분석 (SCR-16/17)' },
      'market': { title: '돼코상점' },
      'mypage': { title: '마이페이지' },
      'notifications': { title: '알림 목록' },
      'notification-settings': { title: '알림 수신 설정' }
    };

    let currentViewKey = 'landing';

    const VIEW_HISTORY_LIMIT = 20;

    const viewHistory = [];

    let isMyInfoSidebarExpanded = false;

    let isTopMyInfoExpanded = false;

    const sidebarTopItemBaseClass = 'flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left';

    const sidebarTopItemActiveClass = 'bg-primary font-bold text-neutral-dark shadow-sm';

    const sidebarTopItemInactiveClass = 'font-medium text-[#576348] hover:bg-white/60 hover:text-neutral-dark';

    const sidebarSubItemBaseClass = 'flex w-full items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors text-left text-[13px]';

    const sidebarSubItemActiveClass = 'bg-white/80 text-[#2F6517] font-extrabold shadow-2xs';

    const sidebarSubItemInactiveClass = 'text-[#687458] font-medium hover:bg-white/60 hover:text-neutral-dark';

    const topNavItemBaseClass = 'flex items-center gap-1.5 py-2 border-b-2 transition-colors whitespace-nowrap';

    const topNavItemActiveClass = 'border-primary text-primary-dark font-extrabold';

    const topNavItemInactiveClass = 'border-transparent text-[#576348] font-semibold hover:text-neutral-dark';

    const topNavSubItemBaseClass = 'flex w-full items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left text-xs transition-colors';

    const topNavSubItemActiveClass = 'bg-[#F2F7EC] text-primary-dark font-extrabold';

    const topNavSubItemInactiveClass = 'text-neutral-600 font-medium hover:bg-neutral-50 hover:text-neutral-dark';
