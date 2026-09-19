    function initializeInterviewerController() {
      const controller = document.getElementById('interviewer-controller');
      if (!controller || !isInterviewerControllerEnabled()) return;

      controller.hidden = false;
      controller.classList.add('flex');
    }

    function initializeViewControllerEvents() {
      window.addEventListener('keydown', (e) => {
        if (!isInterviewerControllerEnabled()) return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        const keyMap = {
          '1': 'landing',
          '2': 'explore',
          '3': 'create',
          '4': 'post',
          '5': 'abtest',
          '6': 'feedback',
          '7': 'market',
          '8': 'mypage'
        };

        if (keyMap[e.key]) {
          navigateTo(keyMap[e.key]);
        } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
          toggleSwitcherPanel();
        }
      });
    }
