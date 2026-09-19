    function showMypageSectionOnly(sectionKey = 'profile') {
      const profileSec = document.getElementById('mypage-profile-section');
      const profileExtraSec1 = document.getElementById('mypage-profile-banner');
      const profileExtraSec2 = document.getElementById('mypage-profile-cards');
      const projectsSec = document.getElementById('mypage-projects-section');
      const marketSec = document.getElementById('mypage-market-section');
      const supportSec = document.getElementById('mypage-support-section');

      if (profileSec) profileSec.classList.add('hidden');
      if (profileExtraSec1) profileExtraSec1.classList.add('hidden');
      if (profileExtraSec2) profileExtraSec2.classList.add('hidden');
      if (projectsSec) projectsSec.classList.add('hidden');
      if (marketSec) marketSec.classList.add('hidden');
      if (supportSec) {
        supportSec.classList.add('hidden');
        supportSec.classList.remove('flex');
      }

      const breadcrumbLabel = document.getElementById('mypage-breadcrumb-current');

      if (sectionKey === 'profile') {
        if (profileSec) profileSec.classList.remove('hidden');
        if (profileExtraSec1) profileExtraSec1.classList.remove('hidden');
        if (profileExtraSec2) profileExtraSec2.classList.remove('hidden');
        if (breadcrumbLabel) breadcrumbLabel.textContent = '프로필';
      } else if (sectionKey === 'my-projects' || sectionKey === 'my-projects-section' || sectionKey === 'projects') {
        if (projectsSec) projectsSec.classList.remove('hidden');
        if (breadcrumbLabel) breadcrumbLabel.textContent = '내 프로젝트';
      } else if (sectionKey === 'coins') {
        if (marketSec) marketSec.classList.remove('hidden');
        if (breadcrumbLabel) breadcrumbLabel.textContent = '돼지코인내역 & 적립';
      } else if (sectionKey === 'support') {
        if (supportSec) {
          supportSec.classList.remove('hidden');
          supportSec.classList.add('flex');
        }
        if (breadcrumbLabel) breadcrumbLabel.textContent = '고객센터';
      }
    }

    function navigateToMypageSection(sectionId, sectionKey = 'profile') {
      isMyInfoSidebarExpanded = true;
      currentMypageSection = sectionKey;

      navigateTo('mypage');
      showMypageSectionOnly(sectionKey);

      updateServiceSidebarNavigation('mypage', sectionKey);
      updateServiceTopNavigation('mypage', sectionKey);

      const mainScroll = document.getElementById('mypage-main-scroll');
      if (mainScroll) mainScroll.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });

      if (sectionKey === 'support') loadSupportTickets();
    }

    function updatePendingReviewBadge() {
      const pendingCount = (window.myProjectCollections?.participated || [])
        .filter(project => !isParticipationCompleted(project)).length;
      const badge = document.getElementById('myproj-part-count-badge');
      if (badge) badge.textContent = `리뷰 대기 ${pendingCount}`;
    }

    function sortParticipatedProjectsByReviewState(projects = []) {
      return [...projects].sort((first, second) => (
        Number(isParticipationCompleted(first)) - Number(isParticipationCompleted(second))
      ));
    }

    function updateParticipatedReviewTabs(projects = []) {
      const pendingCount = projects.filter(project => !isParticipationCompleted(project)).length;
      const completedCount = projects.length - pendingCount;
      const pendingCountEl = document.getElementById('myproj-review-pending-count');
      const completedCountEl = document.getElementById('myproj-review-completed-count');
      const pendingButton = document.getElementById('myproj-review-tab-pending');
      const completedButton = document.getElementById('myproj-review-tab-completed');
      const activeClass = 'px-4 py-2 rounded-xl bg-white shadow-xs text-xs font-extrabold transition-all flex items-center gap-2';
      const inactiveClass = 'px-4 py-2 rounded-xl text-neutral-500 hover:text-neutral-800 text-xs font-bold transition-all flex items-center gap-2';

      if (pendingCountEl) pendingCountEl.textContent = pendingCount;
      if (completedCountEl) completedCountEl.textContent = completedCount;
      if (pendingButton) {
        pendingButton.className = currentParticipatedReviewTab === 'pending'
          ? `${activeClass} text-[#7A4B00]`
          : inactiveClass;
      }
      if (completedButton) {
        completedButton.className = currentParticipatedReviewTab === 'completed'
          ? `${activeClass} text-emerald-700`
          : inactiveClass;
      }
    }

    function switchParticipatedReviewTab(tabKey) {
      if (!['pending', 'completed'].includes(tabKey)) return;
      currentParticipatedReviewTab = tabKey;
      renderMyProjectCollection('participated');
    }

    async function deleteRegisteredProject(btn, projectId) {
      if (!confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n삭제된 프로젝트는 복구할 수 없습니다.')) return;
      const ds = window.donDwaeDataService;
      try {
        const success = await ds.deleteProjectRecord(projectId);
        if (!success) throw new Error('프로젝트 삭제에 실패했습니다.');

        window.myProjectCollections.registered = (window.myProjectCollections.registered || []).filter(p => p.id !== projectId);
        window.myProjectCollections.scraped = (window.myProjectCollections.scraped || []).filter(p => p.id !== projectId);
        window.myProjectCollections.participated = (window.myProjectCollections.participated || []).filter(p => p.id !== projectId);

        const tabRegBadge = document.getElementById('myproj-registered-count-badge');
        const filterAllCountEl = document.getElementById('myproj-filter-all-count');
        const totalCountEl = document.getElementById('myproj-total-count');
        const ovRegEl = document.getElementById('mypage-overview-reg-count');
        const count = window.myProjectCollections.registered.length;

        if (tabRegBadge) tabRegBadge.textContent = count;
        if (filterAllCountEl) filterAllCountEl.textContent = count;
        if (totalCountEl) totalCountEl.textContent = `총 ${count}개`;
        if (ovRegEl) ovRegEl.textContent = count;

        renderMyProjectCollection('registered');
        showGenericToast('프로젝트가 성공적으로 삭제되었습니다.', '🗑️');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to delete project:', err);
        showGenericToast(err?.message || '프로젝트 삭제 실패', '⚠️');
      }
    }

    async function deleteScrapedItem(btn, projectId) {
      const ds = window.donDwaeDataService;
      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        if (!session?.user) throw new Error('로그인이 필요합니다.');
        const removed = await ds.toggleScrap(session.user.id, projectId, true);
        if (!removed) throw new Error('스크랩 해제에 실패했습니다.');
        window.myProjectCollections.scraped = window.myProjectCollections.scraped.filter(project => project.id !== projectId);
        const badge = document.getElementById('myproj-scraped-count');
        if (badge) badge.textContent = window.myProjectCollections.scraped.length;
        renderMyProjectCollection('scraped');
        showGenericToast('스크랩 항목이 해제되었습니다.', '🔖');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to remove scrap:', err);
        showGenericToast(err?.message || '스크랩 해제에 실패했습니다.', '⚠️');
      }
    }

    function switchMyProjectTab(tabKey) {
      const tabs = {
        registered: document.getElementById('myproj-tab-registered'),
        participated: document.getElementById('myproj-tab-participated'),
        scraped: document.getElementById('myproj-tab-scraped')
      };

      const filterBar = document.getElementById('myproj-filter-bar');
      const participatedReviewTabs = document.getElementById('myproj-participated-review-tabs');
      if (filterBar) filterBar.classList.toggle('hidden', tabKey !== 'registered');
      if (participatedReviewTabs) {
        participatedReviewTabs.classList.toggle('hidden', tabKey !== 'participated');
        participatedReviewTabs.classList.toggle('flex', tabKey === 'participated');
      }
      renderMyProjectCollection(tabKey);
      if (tabKey === 'registered') filterMyProjects('all');

      Object.keys(tabs).forEach(k => {
        if (!tabs[k]) return;
        if (k === tabKey) {
          tabs[k].className = 'px-4 py-2 rounded-xl text-xs font-extrabold bg-[#191A1C] text-white shadow-xs flex items-center gap-2 transition-all';
        } else {
          tabs[k].className = 'px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-2 transition-all';
        }
      });
    }

    function filterMyProjects(filterType) {
      const cards = document.querySelectorAll('.myproj-card');
      let visibleCount = 0;

      cards.forEach(card => {
        const status = card.dataset.status;
        if (filterType === 'all' || status === filterType) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      const emptyState = document.getElementById('myproj-empty-state');
      if (emptyState) {
        if (visibleCount === 0) {
          emptyState.classList.remove('hidden');
          emptyState.classList.add('flex');
        } else {
          emptyState.classList.add('hidden');
          emptyState.classList.remove('flex');
        }
      }

      const filters = {
        all: document.getElementById('myproj-filter-all'),
        active: document.getElementById('myproj-filter-active'),
        completed: document.getElementById('myproj-filter-completed')
      };

      Object.keys(filters).forEach(f => {
        if (!filters[f]) return;
        if (f === filterType) {
          filters[f].className = 'px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#B4E380] text-[#1E3E0B] transition-all';
        } else {
          filters[f].className = 'px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-all';
        }
      });
    }

    function scrollToMypageMarket() {
      navigateToMypageSection('mypage-market-section', 'coins');
    }

    async function submitSupportTicket(event) {
      event?.preventDefault();
      const ds = window.donDwaeDataService;
      const submitButton = document.getElementById('support-ticket-submit');
      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        if (!session?.user) {
          showGenericToast('로그인 후 문의를 등록할 수 있습니다.', '🔒');
          navigateTo('login');
          return;
        }
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = '등록 중...';
        }
        await ds.createSupportTicket(session.user.id, {
          category: document.getElementById('support-ticket-category')?.value,
          subject: document.getElementById('support-ticket-subject')?.value,
          message: document.getElementById('support-ticket-message')?.value
        });
        document.getElementById('support-ticket-form')?.reset();
        await loadSupportTickets();
        showGenericToast('문의가 등록되었습니다.', '🎧');
      } catch (err) {
        console.error('[Don Dwae DB] Failed to create support ticket:', err);
        showGenericToast(resolveFriendlyError(err, 'USER_TICKET_SAVE_FAILED').formatted, '⚠️');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = '문의 등록하기';
        }
      }
    }
