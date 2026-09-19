    window.updateHeaderAuthUI = function(isLoggedIn) {
      window.isUserLoggedIn = !!isLoggedIn;
      const loginBtn = document.getElementById('btn-header-login');
      const logoutBtn = document.getElementById('btn-header-logout');
      if (loginBtn && logoutBtn) {
        if (isLoggedIn) {
          loginBtn.classList.add('hidden');
          logoutBtn.classList.remove('hidden');
        } else {
          loginBtn.classList.remove('hidden');
          logoutBtn.classList.add('hidden');
        }
      }

      const homeGreeting = document.getElementById('home-greeting-title');
      if (homeGreeting) {
        if (!isLoggedIn) {
          homeGreeting.textContent = '안녕하세요! 👋';
        } else {
          const currentNick = document.getElementById('mypage-user-nickname')?.textContent || '옹에';
          homeGreeting.textContent = `안녕하세요, ${currentNick}님! 👋`;
        }
      }

      const landingLoginBtn = document.getElementById('btn-landing-login');
      const landingLogoutBtn = document.getElementById('btn-landing-logout');
      if (landingLoginBtn && landingLogoutBtn) {
        if (isLoggedIn) {
          landingLoginBtn.classList.add('hidden');
          landingLogoutBtn.classList.remove('hidden');
        } else {
          landingLoginBtn.classList.remove('hidden');
          landingLogoutBtn.classList.add('hidden');
        }
      }

      const exploreLoginBtn = document.getElementById('btn-explore-login');
      const exploreLogoutBtn = document.getElementById('btn-explore-logout');
      if (exploreLoginBtn && exploreLogoutBtn) {
        if (isLoggedIn) {
          exploreLoginBtn.classList.add('hidden');
          exploreLogoutBtn.classList.remove('hidden');
        } else {
          exploreLoginBtn.classList.remove('hidden');
          exploreLogoutBtn.classList.add('hidden');
        }
      }
    };
