    function showGenericToast(msg, icon = '✨') {
      const toast = document.getElementById('generic-toast');
      const text = document.getElementById('generic-toast-text');
      const iconEl = document.getElementById('generic-toast-icon');
      if (toast && text) {
        let displayMsg = msg;
        if (typeof msg === 'object') {
          displayMsg = resolveFriendlyError(msg).formatted;
        } else if (typeof msg === 'string') {
          const trimmed = msg.trim();
          const hasKorean = /[가-힣]/.test(trimmed);
          const isPureEnglish = /^[a-zA-Z0-9_\s\.\:\-\'\"\(\)\,\!\?\/]+$/.test(trimmed) && trimmed.length >= 4;
          if (!hasKorean && isPureEnglish) {
            displayMsg = resolveFriendlyError(trimmed).formatted;
          }
        }
        text.textContent = displayMsg;
        if (iconEl) iconEl.textContent = icon;
        toast.style.zIndex = '99999';
        toast.classList.remove('-translate-y-20', 'opacity-0', 'pointer-events-none');
        toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

        setTimeout(() => {
          toast.classList.add('-translate-y-20', 'opacity-0', 'pointer-events-none');
          toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        }, 2800);
      }
    }
