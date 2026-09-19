    function updateProfileInputCounts() {
      const nickname = document.getElementById('profile-edit-nickname')?.value || '';
      const bio = document.getElementById('profile-edit-bio')?.value || '';
      const nicknameCount = document.getElementById('profile-nick-count');
      const bioCount = document.getElementById('profile-bio-count');
      if (nicknameCount) nicknameCount.textContent = `${nickname.length}/20자`;
      if (bioCount) bioCount.textContent = `${bio.length}/50자`;
    }

    async function openEditProfileModal() {
      const ds = window.donDwaeDataService;
      if (!ds?.supabase) {
        showGenericToast('프로필 서버 연결을 확인해 주세요.', '⚠️');
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await ds.supabase.auth.getSession();
        if (sessionError || !session?.user) {
          showGenericToast('로그인 후 프로필을 수정할 수 있습니다.', '🔒');
          navigateTo('login');
          return;
        }

        const profile = await ds.fetchMyPrivateProfile();
        if (!profile) throw new Error('내 프로필을 찾을 수 없습니다.');

        const nicknameInput = document.getElementById('profile-edit-nickname');
        const bioInput = document.getElementById('profile-edit-bio');
        const phoneInput = document.getElementById('profile-edit-phone');
        const emailEl = document.getElementById('profile-edit-email');
        const providerEl = document.getElementById('profile-edit-provider');
        if (nicknameInput) nicknameInput.value = profile.nickname || '';
        if (bioInput) bioInput.value = profile.bio || '';
        if (phoneInput) phoneInput.value = profile.phone || '';
        if (emailEl) emailEl.textContent = profile.email || session.user.email || '이메일 정보 없음';
        if (providerEl) {
          const provider = session.user.app_metadata?.provider || 'email';
          providerEl.textContent = provider === 'google' ? '🌐 구글 계정' : '✉️ 이메일 계정';
        }

        const selectedInterests = new Set(Array.isArray(profile.interests) ? profile.interests : []);
        document.querySelectorAll('#interest-chips-box [data-interest]').forEach(button => {
          setInterestChipSelected(button, selectedInterests.has(button.dataset.interest));
        });
        renderProfileSnsLinks(Array.isArray(profile.sns_links) ? profile.sns_links : []);
        updateProfileInputCounts();

        // 온보딩에서 받은 항목(직업군·성별·연령대·기기·툴 태그)은 별도 모듈이 다룬다.
        const profileFields = window.donDwaeProfileFields;
        if (profileFields) {
          profileFields.bindProfileExtraFields();
          profileFields.renderProfileExtraFields(profile);
        }

        const modal = document.getElementById('edit-profile-modal');
        if (modal) modal.classList.remove('hidden');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to load private profile:', err);
        showGenericToast('프로필 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', '⚠️');
      }
    }

    function closeEditProfileModal() {
      const modal = document.getElementById('edit-profile-modal');
      if (modal) modal.classList.add('hidden');
    }

    function openUserProfileModal(name, badge, coins, avatarText, avatarBg, avatarColor, bio, count, rating) {
      const modal = document.getElementById('view-user-profile-modal');
      if (!modal) return;

      const avatarEl = document.getElementById('view-user-avatar');
      const nameEl = document.getElementById('view-user-name');
      const badgeEl = document.getElementById('view-user-badge');
      const bioEl = document.getElementById('view-user-bio');
      const coinsEl = document.getElementById('view-user-coins');
      const countEl = document.getElementById('view-user-count');
      const ratingEl = document.getElementById('view-user-rating');

      if (avatarEl) {
        avatarEl.textContent = avatarText || name.charAt(0);
        avatarEl.style.backgroundColor = avatarBg || '#E5D7B7';
        avatarEl.style.color = avatarColor || '#5C4A21';
      }
      if (nameEl) nameEl.textContent = name;
      if (badgeEl) badgeEl.textContent = badge;
      if (bioEl) bioEl.textContent = bio || '활동 중인 크리에이터';
      if (coinsEl) coinsEl.textContent = coins;
      if (countEl) countEl.textContent = count || '0건';
      if (ratingEl) ratingEl.textContent = '⭐ ' + (rating || '5.0');

      modal.classList.remove('hidden');
    }

    function closeUserProfileModal() {
      const modal = document.getElementById('view-user-profile-modal');
      if (modal) modal.classList.add('hidden');
    }

    function setInterestChipSelected(btn, isSelected) {
      if (!btn) return;
      const label = btn.dataset.interest || btn.textContent.replace(/^✓\s*/, '').trim();
      btn.dataset.interest = label;
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.className = isSelected
        ? 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#B4E380] text-[#1E3E0B] transition-all'
        : 'px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-all';
      btn.textContent = `${isSelected ? '✓ ' : ''}${label}`;
    }

    function toggleInterestChip(btn) {
      if (!btn) return;
      setInterestChipSelected(btn, btn.getAttribute('aria-pressed') !== 'true');
    }

    function createSnsLinkRow(value = '') {
      const div = document.createElement('div');
      div.className = 'flex items-center gap-2 animate-in fade-in duration-150';

      const label = document.createElement('span');
      label.className = 'px-3 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-600 text-xs font-bold shrink-0 flex items-center gap-1';
      label.textContent = '🔗 링크';

      const input = document.createElement('input');
      input.type = 'url';
      input.placeholder = 'https://';
      input.value = value;
      input.dataset.profileSnsLink = '';
      input.className = 'flex-1 p-2.5 rounded-xl border border-neutral-300 text-neutral-800 font-semibold outline-none focus:border-primary text-xs';

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs';
      removeButton.textContent = '✕';
      removeButton.addEventListener('click', () => div.remove());

      div.append(label, input, removeButton);
      return div;
    }

    function addSnsLinkInput() {
      const container = document.getElementById('sns-links-container');
      if (!container) return;
      if (container.querySelectorAll('[data-profile-sns-link]').length >= 5) {
        showGenericToast('SNS 링크는 최대 5개까지 등록할 수 있습니다.', '🔗');
        return;
      }
      container.appendChild(createSnsLinkRow());
    }

    window.saveProfileChangesLocal = function (newNick, newBio, showToast = false) {
      const mypageNick = document.getElementById('mypage-user-nickname');
      const mypageBio = document.getElementById('mypage-user-bio');
      if (mypageNick) mypageNick.textContent = newNick;
      if (mypageBio) mypageBio.textContent = newBio;

      const homeGreeting = document.getElementById('home-greeting-title');
      const headerNick = document.getElementById('header-user-nickname');
      const sidebarNick = document.getElementById('post-creator-name-sidebar');
      const sidebarBio = document.getElementById('post-creator-bio-sidebar');

      document.querySelectorAll('[data-user-nickname]').forEach(el => {
        el.textContent = newNick;
      });

      if (homeGreeting) homeGreeting.textContent = `안녕하세요, ${newNick}님! 👋`;
      if (headerNick) headerNick.textContent = `${newNick} ▾`;
      if (sidebarNick) sidebarNick.textContent = newNick;
      if (sidebarBio && newBio) sidebarBio.textContent = newBio;

      if (showToast) {
        showGenericToast('✨ 프로필 정보가 성공적으로 수정되었습니다!', '👤');
        closeEditProfileModal();
      }
    };

    async function saveProfileChanges() {
      const nickInput = document.getElementById('profile-edit-nickname');
      const bioInput = document.getElementById('profile-edit-bio');
      const saveButton = document.getElementById('btn-save-profile');

      const newNick = nickInput ? nickInput.value.trim() : '';
      const newBio = bioInput ? bioInput.value.trim() : '';
      const interests = [...document.querySelectorAll('#interest-chips-box [data-interest][aria-pressed="true"]')]
        .map(button => button.dataset.interest);
      const snsLinks = [...document.querySelectorAll('[data-profile-sns-link]')]
        .map(input => input.value);

      if (!newNick) {
        alert('닉네임을 입력해 주세요.');
        return;
      }

      // 온보딩과 같은 규칙으로 검사한다. 사용자가 고칠 수 있는 문구를 그대로 보여 준다.
      let extraFields = {};
      try {
        extraFields = window.donDwaeProfileFields?.collectProfileExtraFields() || {};
      } catch (err) {
        showGenericToast(err.message, '⚠️');
        return;
      }

      const ds = window.donDwaeDataService;
      if (!ds?.supabase) {
        showGenericToast('프로필 서버 연결을 확인해 주세요.', '⚠️');
        return;
      }

      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = '저장 중...';
      }

      try {
        const { data: { session }, error } = await ds.supabase.auth.getSession();
        if (error || !session?.user) {
          showGenericToast('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.', '⚠️');
          navigateTo('login');
          return;
        }
        await ds.updateMyPrivateProfile({
          nickname: newNick,
          bio: newBio,
          interests,
          snsLinks,
          ...extraFields
        });
        window.saveProfileChangesLocal(newNick, newBio, true);
        console.log('[Don Dwae DB] Private profile updated for the active session.');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to save private profile:', err);
        showGenericToast(resolveFriendlyError(err, 'USER_PROFILE_SAVE_FAILED').formatted, '⚠️');
        return;
      } finally {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = '저장하기';
        }
      }

      // Refresh explore feed & detail view so creator nickname updates everywhere
      if (window.donDwaeDataService && typeof window.donDwaeDataService.fetchExploreProjects === 'function') {
        const liveProjects = await ds.fetchExploreProjects();
        if (liveProjects && liveProjects.length > 0) {
          window.renderLiveProjectsToFeed(liveProjects);
        }
      }
      if (typeof currentPostId !== 'undefined' && currentPostId) {
        const dbProj = await ds.fetchProjectById(currentPostId);
        if (dbProj) window.renderDBProjectToDetail(dbProj);
      }
    }
