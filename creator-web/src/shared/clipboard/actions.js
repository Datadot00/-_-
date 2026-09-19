    window.copyTextToClipboard = function(text, successMsg = '클립보드에 복사되었습니다.') {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showGenericToast(successMsg, '📋');
        }).catch(() => {
          fallbackCopyText(text, successMsg);
        });
      } else {
        fallbackCopyText(text, successMsg);
      }
    };

    function fallbackCopyText(text, successMsg) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showGenericToast(successMsg, '📋');
      } catch (err) {
        showGenericToast('복사에 실패했습니다.', '⚠️');
      }
      document.body.removeChild(textarea);
    }
