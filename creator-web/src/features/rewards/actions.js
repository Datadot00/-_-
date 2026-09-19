    function openWelcomeBonusModal(amount = 500) {
      const bonusNum = Number(amount || 500);
      const modal = document.getElementById('welcome-bonus-modal');
      const amountText = document.getElementById('welcome-bonus-amount-text');
      if (amountText) amountText.textContent = bonusNum.toLocaleString();
      if (modal) modal.classList.remove('hidden');

      // 알림함에 축하 알림 추가
      try {
        window.notificationsData = window.notificationsData || [];
        const hasNotif = window.notificationsData.some(n => n.id === 'welcome-bonus-gating');
        if (!hasNotif) {
          window.notificationsData.unshift({
            id: 'welcome-bonus-gating',
            type: 'coin',
            title: '🎁 3회 게이팅 완료 보너스 지급!',
            message: `다른 창업자의 서비스를 3회 이상 검증하여 초반 가입 보너스로 +${bonusNum.toLocaleString()} 돼지코인이 지급되었습니다. 이제 프로젝트를 등록해보세요!`,
            is_read: false,
            created_at: new Date().toISOString()
          });
          if (typeof renderNotificationsUI === 'function') renderNotificationsUI();
        }
      } catch (e) {
        console.warn('[Welcome Bonus] Notification registration warning:', e);
      }
    }

    window.openWelcomeBonusModal = openWelcomeBonusModal;

    function closeWelcomeBonusModal() {
      const modal = document.getElementById('welcome-bonus-modal');
      if (modal) modal.classList.add('hidden');
    }

    window.closeWelcomeBonusModal = closeWelcomeBonusModal;
