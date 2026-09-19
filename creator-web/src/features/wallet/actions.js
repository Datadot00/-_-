    function updateAllCoinDisplays() {
      const valStr = userCoinBalance.toLocaleString();
      const valWithC = `${valStr} C`;

      const elIds = [
        'user-coin-badge',
        'post-user-coin-badge',
        'market-header-coin',
        'market-user-coin-display',
        'exchange-user-coin',
        'mypage-metric-coin',
        'mypage-section-coin',
        'mypage-widget-coin',
        'step3-user-coin-balance'
      ];

      elIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          if (id === 'step3-user-coin-balance') {
            el.textContent = `보유: ${valStr} 돼지코인`;
          } else if (id === 'user-coin-badge' || id === 'market-user-coin-display' || id === 'mypage-metric-coin' || id === 'mypage-section-coin') {
            el.textContent = valStr;
          } else {
            el.textContent = valWithC;
          }
        }
      });

      document.querySelectorAll('[data-sidebar-coin]').forEach(el => {
        el.textContent = valWithC;
      });
      document.querySelectorAll('[data-wallet-balance]').forEach(el => {
        el.textContent = valWithC;
      });

      if (typeof calculateTotalCost === 'function') {
        calculateTotalCost();
      }
    }

    window.setUserCoinBalance = function (amount) {
      const parsed = Number(amount);
      userCoinBalance = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      updateAllCoinDisplays();
    };
