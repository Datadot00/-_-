    function toggleGatingBypassMode() {
      isGatingBypassActive = !isGatingBypassActive;
      const btn = document.getElementById('btn-toggle-gating-bypass');
      if (btn) {
        if (isGatingBypassActive) {
          btn.textContent = 'ON';
          btn.className = 'px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all bg-[#2F6517] text-white shadow-xs cursor-pointer';
          showGenericToast('🛡️ [3회 게이팅 충족] 상태가 ON으로 활성화되었습니다!', '✅');
        } else {
          btn.textContent = 'OFF';
          btn.className = 'px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all bg-neutral-200 text-neutral-600 shadow-2xs border border-neutral-300 cursor-pointer';
          showGenericToast('🛡️ [3회 게이팅 충족] 상태가 OFF로 변경되었습니다.', 'ℹ️');
        }
      }
    }

    function isInterviewerControllerEnabled(hostname = window.location.hostname) {
      return ['localhost', '127.0.0.1', '::1'].includes(hostname);
    }

    function toggleSwitcherPanel() {
      const panel = document.getElementById('switcher-panel');
      isSwitcherOpen = !isSwitcherOpen;
      if (isSwitcherOpen) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    }
