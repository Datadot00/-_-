    initializeProjectEditingState();

    initializeViewControllerEvents();

    renderServiceSidebarNavigations();

    renderServiceTopNavigations();

    document.addEventListener('DOMContentLoaded', () => {
      initializeNavigationEvents();

      initializeInterviewerController();
      initializeProjectDateDefaults();
      updateAllCoinDisplays();
      updatePledgeModalUI();
      calculateTotalCost();
      renderNotificationsUI();
      // 새로고침 시 이전에 보던 화면 복원, 없으면 랜딩으로 이동
      restoreNavigationState();

      window.initSupabaseLiveDB();
    });
