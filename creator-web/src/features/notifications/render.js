    function getNotificationTypeIconHTML(item) {
      switch (item.type) {
        case 'review_new':
          return `
            <div class="w-10 h-10 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <span class="text-base">📝</span>
            </div>
          `;
        case 'reply':
          return `
            <div class="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
              <span class="text-base">💬</span>
            </div>
          `;
        case 'approval':
          if (item.is_rejected) {
            return `
              <div class="w-10 h-10 rounded-full bg-[#FEE2E2] border border-[#FCA5A5] flex items-center justify-center shrink-0">
                <span class="text-base">⚠️</span>
              </div>
            `;
          }
          return `
            <div class="w-10 h-10 rounded-full bg-[#DCFCE7] border border-[#86EFAC] flex items-center justify-center shrink-0">
              <span class="text-base">✅</span>
            </div>
          `;
        case 'recommend':
          return `
            <div class="w-10 h-10 rounded-full bg-[#FAF5FF] border border-[#E9D5FF] flex items-center justify-center shrink-0">
              <span class="text-base">✨</span>
            </div>
          `;
        case 'shop_new':
          return `
            <div class="w-10 h-10 rounded-full bg-[#FCE7F3] border border-[#FBCFE8] flex items-center justify-center shrink-0">
              <span class="text-base">🛍️</span>
            </div>
          `;
        case 'app_update':
          return `
            <div class="w-10 h-10 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] flex items-center justify-center shrink-0">
              <span class="text-base">🔄</span>
            </div>
          `;
        default:
          return `
            <div class="w-10 h-10 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center shrink-0">
              <span class="text-base">🔔</span>
            </div>
          `;
      }
    }

    function updateNotificationToggleUI() {
      const btn = document.getElementById('btn-notification-toggle');
      const thumb = document.getElementById('notification-toggle-thumb');
      const statusText = document.getElementById('notification-toggle-status-text');
      const liveBadge = document.getElementById('notification-live-sync-badge');

      if (!btn || !thumb || !statusText) return;

      if (isNotificationEnabled) {
        btn.setAttribute('aria-checked', 'true');
        btn.className = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#2F6517] transition-colors duration-200 ease-in-out focus:outline-none';
        thumb.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5';
        statusText.textContent = 'ON';
        statusText.className = 'text-xs font-extrabold text-[#2F6517] w-7 text-center';
        if (liveBadge) {
          liveBadge.className = 'flex items-center gap-1.5 text-xs text-[#2F6517] font-semibold bg-[#F0F7E8] px-3 py-1 rounded-full border border-[#D8E6C8]';
          liveBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#2F6517] animate-pulse"></span> 실시간 수신 활성';
        }
      } else {
        btn.setAttribute('aria-checked', 'false');
        btn.className = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-neutral-300 transition-colors duration-200 ease-in-out focus:outline-none';
        thumb.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0';
        statusText.textContent = 'OFF';
        statusText.className = 'text-xs font-extrabold text-neutral-400 w-7 text-center';
        if (liveBadge) {
          liveBadge.className = 'flex items-center gap-1.5 text-xs text-neutral-500 font-semibold bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200';
          liveBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-neutral-400"></span> 수신 일시정지';
        }
      }
    }

    function renderNotificationsUI() {
      updateNotificationToggleUI();
      const container = document.getElementById('notifications-list-container');
      const badge = document.getElementById('unread-count-badge');
      if (!container) return;

      const list = window.notificationsData || [];
      const unreadCount = list.filter(n => !n.is_read).length;
      if (badge) badge.textContent = String(unreadCount);

      if (list.length === 0) {
        // Empty State (귀여운 돼지 일러스트)
        container.innerHTML = `
          <div class="bg-white rounded-[24px] border border-neutral-200 p-12 text-center flex flex-col items-center justify-center gap-4 shadow-subtle min-h-[380px]">
            <div class="w-32 h-32 mb-2 flex items-center justify-center">
              <img src="/images/mascots/mascot-hungry.png" alt="돈돼 마스코트" class="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <h3 class="text-xl font-extrabold text-neutral-dark">아직 받은 알림이 없어요</h3>
            <p class="text-xs text-neutral-400 font-medium leading-relaxed max-w-sm">
              새로운 서비스 검증 참여 소식이나 테스터 피드백이 도착하면 실시간으로 알려드릴게요!
            </p>
            <button onclick="navigateTo('explore')" class="mt-2 px-6 py-3 rounded-xl bg-primary text-neutral-dark font-extrabold text-xs shadow-xs hover:bg-primary-hover transition-all">
              다른 테스트 탐색하러 가기
            </button>
          </div>
        `;
        return;
      }

      // Group into '오늘' vs '지난 일주일'
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const todayList = [];
      const pastWeekList = [];

      list.forEach(item => {
        const itemTime = new Date(item.created_at).getTime();
        if (itemTime >= todayStart) {
          todayList.push(item);
        } else {
          pastWeekList.push(item);
        }
      });

      let html = '';

      // 1. Today Section
      if (todayList.length > 0) {
        html += `
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-[#2F6517] bg-[#F2F7EC] px-2.5 py-1 rounded-md">오늘</span>
              <div class="flex-1 h-px bg-neutral-200/80"></div>
            </div>
            <div class="flex flex-col gap-3">
              ${todayList.map(item => createNotificationCardHTML(item)).join('')}
            </div>
          </div>
        `;
      }

      // 2. Past Week Section
      if (pastWeekList.length > 0) {
        html += `
          <div class="flex flex-col gap-3 mt-2">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">지난 일주일</span>
              <div class="flex-1 h-px bg-neutral-200/80"></div>
            </div>
            <div class="flex flex-col gap-3">
              ${pastWeekList.map(item => createNotificationCardHTML(item)).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = html;
    }

    function createNotificationCardHTML(item) {
      const isUnread = !item.is_read;
      const bgClass = isUnread ? 'bg-[#F6FAEF] border-[#D9EA80] shadow-card' : 'bg-white border-neutral-200/80 shadow-subtle';
      const iconHTML = getNotificationTypeIconHTML(item);
      const actionText = getNotificationTargetActionText(item);
      const relTime = formatRelativeTime(item.created_at);

      return `
        <article onclick="handleNotificationItemClick('${item.id}', '${item.related_id}')"
          class="rounded-[20px] border p-5 transition-all duration-200 cursor-pointer hover:border-primary/80 hover:-translate-y-0.5 relative group ${bgClass}">
          <div class="flex items-start gap-4">

            <!-- Unread Green Dot + Icon -->
            <div class="relative shrink-0 flex items-center">
              ${isUnread ? '<span class="w-2.5 h-2.5 rounded-full bg-[#2F6517] absolute -left-3 top-4"></span>' : ''}
              ${iconHTML}
            </div>

            <!-- Content Area -->
            <div class="flex-1 min-w-0 pr-6">
              <div class="flex items-center justify-between gap-2 mb-1">
                <h4 class="text-sm font-extrabold text-neutral-dark leading-snug line-clamp-1 group-hover:text-primary-dark transition-colors">
                  ${item.title}
                </h4>
                <span class="text-xs text-neutral-400 font-medium shrink-0">${relTime}</span>
              </div>

              <p class="text-xs text-neutral-600 leading-relaxed font-medium mb-2.5">
                ${item.is_rejected ? `<span class="text-red-600 font-bold">사유: </span>` : ''}${item.content}
              </p>

              <span class="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F6517] group-hover:underline">
                <span>${actionText}</span>
              </span>
            </div>

            <!-- Individual Close (X) Button -->
            <button type="button" onclick="deleteNotification(event, '${item.id}')"
              class="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="삭제">
              ✕
            </button>
          </div>
        </article>
      `;
    }
