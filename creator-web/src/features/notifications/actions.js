    function formatRelativeTime(dateStr) {
      const now = new Date();
      const date = new Date(dateStr);
      const diffSec = Math.floor((now - date) / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return '방금 전';
      if (diffMin < 60) return `${diffMin}분 전`;
      if (diffHour < 24) return `${diffHour}시간 전`;
      if (diffDay === 1) return '어제';
      if (diffDay < 7) return `${diffDay}일 전`;
      return `${Math.floor(diffDay / 7)}주 전`;
    }

    function getNotificationTargetActionText(item) {
      switch (item.type) {
        case 'review_new': return '테스트 결과 상세화면으로 이동 ›';
        case 'reply': return '피드백 테스트 활동(내 서재) 화면으로 이동 ›';
        case 'approval': return item.is_rejected ? '등록한 서비스 글 수정화면으로 이동 ›' : '등록한 서비스 글 상세화면으로 이동 ›';
        case 'recommend': return '서비스 글 상세화면으로 이동 ›';
        case 'shop_new': return '돼코상점 구경가기 ›';
        case 'app_update': return '서비스 글 상세화면으로 이동 ›';
        default: return '관련 화면으로 이동 ›';
      }
    }

    function handleNotificationItemClick(notifId, relatedId) {
      // Mark as read
      const item = (window.notificationsData || []).find(n => n.id === notifId);
      if (item) item.is_read = true;
      renderNotificationsUI();

      // Navigate based on related_id
      if (relatedId === 'market') {
        navigateTo('market');
      } else if (relatedId === 'feedback') {
        openLatestFeedbackReport();
      } else if (relatedId === 'moneylog' || relatedId === 'prototype' || relatedId === 'my-created-test' || relatedId === 'diary') {
        openPostDetail(relatedId);
      } else if (relatedId === 'saas') {
        openPostDetail('saas');
      } else {
        navigateTo('explore');
      }
    }

    function deleteNotification(event, notifId) {
      event.stopPropagation();
      const list = window.notificationsData || [];
      const idx = list.findIndex(n => n.id === notifId);
      if (idx !== -1) {
        list.splice(idx, 1);
        renderNotificationsUI();
        showGenericToast('알림이 목록에서 삭제되었습니다.', '🗑️');
      }
    }

    function toggleNotificationSetting() {
      isNotificationEnabled = !isNotificationEnabled;
      localStorage.setItem('don_dwae_notification_enabled', isNotificationEnabled ? 'true' : 'false');
      updateNotificationToggleUI();
      if (typeof showGenericToast === 'function') {
        showGenericToast(isNotificationEnabled ? '알림 수신이 활성화되었습니다.' : '알림 수신이 일시정지되었습니다.', isNotificationEnabled ? '🔔' : '🔕');
      }
    }

    function markAllNotificationsAsRead() {
      (window.notificationsData || []).forEach(n => n.is_read = true);
      renderNotificationsUI();
      showGenericToast('모든 알림을 읽음으로 표시했습니다.', '✓');
    }
