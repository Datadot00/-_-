    function renderMyProjectCollection(tabKey = currentMyProjectTab) {
      const list = document.getElementById('myproj-cards-list');
      if (!list) return;
      currentMyProjectTab = tabKey;
      const sourceProjects = window.myProjectCollections[tabKey] || [];
      const sortedParticipatedProjects = tabKey === 'participated'
        ? sortParticipatedProjectsByReviewState(sourceProjects)
        : [];
      const projects = tabKey === 'participated'
        ? sortedParticipatedProjects.filter(project => (
            currentParticipatedReviewTab === 'pending'
              ? !isParticipationCompleted(project)
              : isParticipationCompleted(project)
          ))
        : sourceProjects;
      if (tabKey === 'participated') updateParticipatedReviewTabs(sourceProjects);
      const emptyLabels = {
        registered: ['등록된 프로젝트가 없습니다', '새 프로젝트를 등록하고 사용자의 목소리를 들어보세요.'],
        participated: currentParticipatedReviewTab === 'pending'
          ? ['리뷰 작성 대기 프로젝트가 없습니다', '미뤄둔 리뷰가 생기면 이곳에서 바로 이어서 작성할 수 있어요.']
          : ['완료한 프로젝트가 없습니다', '리뷰 제출을 완료한 프로젝트가 이곳에 모입니다.'],
        scraped: ['스크랩한 프로젝트가 없습니다', '관심 있는 프로젝트를 스크랩하면 이곳에서 다시 볼 수 있습니다.']
      };

      if (projects.length === 0) {
        const [title, description] = emptyLabels[tabKey] || emptyLabels.registered;
        const hasOtherParticipatedProjects = tabKey === 'participated' && sourceProjects.length > 0;
        const emptyAction = hasOtherParticipatedProjects
          ? `switchParticipatedReviewTab('${currentParticipatedReviewTab === 'pending' ? 'completed' : 'pending'}')`
          : `navigateTo('${tabKey === 'registered' ? 'create' : 'explore'}')`;
        const emptyActionLabel = hasOtherParticipatedProjects
          ? (currentParticipatedReviewTab === 'pending' ? '완료 프로젝트 보기' : '리뷰 작성 대기 보기')
          : (tabKey === 'registered' ? '+ 프로젝트 등록하기' : '전체 프로젝트 보기');
        list.innerHTML = `
          <div id="myproj-empty-state" class="py-14 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-neutral-300 p-6 shadow-xs">
            <div class="w-14 h-14 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-2xl mb-3">📂</div>
            <h4 class="text-sm font-extrabold text-neutral-dark mb-1">${title}</h4>
            <p class="text-xs text-neutral-400 font-medium max-w-xs mb-4">${description}</p>
            <button onclick="${emptyAction}"
              class="px-4 py-2 rounded-xl bg-[#B4E380] hover:bg-[#A3D96D] text-[#1E3E0B] font-black text-xs transition-all shadow-xs">
              ${emptyActionLabel}
            </button>
          </div>`;
        return;
      }

      list.innerHTML = projects.map(project => renderMyProjectCard(project, tabKey)).join('') + `
        <div id="myproj-empty-state" class="hidden py-14 flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-neutral-300 p-6 shadow-xs">
          <div class="w-14 h-14 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-2xl mb-3">📂</div>
          <h4 class="text-sm font-extrabold text-neutral-dark mb-1">조건에 맞는 프로젝트가 없습니다</h4>
          <p class="text-xs text-neutral-400 font-medium">다른 진행 상태를 선택해 주세요.</p>
        </div>`;
    }

    function renderSupportTickets(tickets = []) {
      const list = document.getElementById('support-ticket-list');
      if (!list) return;
      if (!tickets.length) {
        list.innerHTML = '<div class="py-10 text-center text-xs text-neutral-400">등록한 문의가 없습니다.</div>';
        return;
      }

      const categoryLabels = { account: '계정/로그인', project: '프로젝트', coin: '돼지코인/교환', bug: '오류 신고', other: '기타' };
      const statusLabels = { open: '접수', in_progress: '확인 중', answered: '답변 완료', closed: '종료' };
      list.innerHTML = tickets.map(ticket => `
        <article class="rounded-xl border border-neutral-200 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded bg-neutral-100 text-[10px] font-bold text-neutral-600">${categoryLabels[ticket.category] || '기타'}</span>
                <span class="px-2 py-0.5 rounded bg-[#F2F7EC] text-[10px] font-extrabold text-[#2F6517]">${statusLabels[ticket.status] || ticket.status}</span>
              </div>
              <h4 class="text-sm font-extrabold text-neutral-dark mt-2">${escapeHtml(ticket.subject)}</h4>
              <p class="text-xs text-neutral-500 mt-1 whitespace-pre-wrap">${escapeHtml(ticket.message)}</p>
            </div>
            <time class="text-[10px] text-neutral-400 whitespace-nowrap">${new Date(ticket.created_at).toLocaleDateString('ko-KR')}</time>
          </div>
          ${ticket.admin_reply ? `<div class="mt-3 rounded-lg bg-[#FAFBF7] border border-[#E9EEDC] p-3"><p class="text-[10px] font-extrabold text-[#2F6517] mb-1">고객센터 답변</p><p class="text-xs text-neutral-600 whitespace-pre-wrap">${escapeHtml(ticket.admin_reply)}</p></div>` : ''}
        </article>`).join('');
    }

    async function loadSupportTickets() {
      const ds = window.donDwaeDataService;
      const list = document.getElementById('support-ticket-list');
      if (!ds?.supabase || !list) return;
      list.innerHTML = '<p class="py-10 text-center text-xs text-neutral-400">문의 내역을 불러오는 중입니다.</p>';
      try {
        const { data: { session } } = await ds.supabase.auth.getSession();
        if (!session?.user) {
          list.innerHTML = '<p class="py-10 text-center text-xs text-neutral-400">로그인 후 문의 내역을 확인할 수 있습니다.</p>';
          return;
        }
        renderSupportTickets(await ds.fetchMySupportTickets(session.user.id));
      } catch (err) {
        console.error('[Don Dwae DB] Failed to load support tickets:', err);
        list.innerHTML = '<p class="py-10 text-center text-xs text-red-500">문의 내역을 불러오지 못했습니다.</p>';
      }
    }


    function renderMyDashboardStats(stats, registeredProjects, participatedProjects, scrapedProjects) {
          const regCountEl = document.getElementById('mypage-reg-count');
          const partCountEl = document.getElementById('mypage-part-count');
          const scrapCountEl = document.getElementById('mypage-scrap-count');
          if (regCountEl) regCountEl.textContent = stats.registeredCount;
          if (partCountEl) partCountEl.textContent = stats.participatedCount;
          if (scrapCountEl) scrapCountEl.textContent = stats.scrapCount;

          // Populate overview cards & tab count badges from DB stats
          const ovPartEl = document.getElementById('mypage-overview-part-count');
          const ovRegEl = document.getElementById('mypage-overview-reg-count');
          const ovActiveSubEl = document.getElementById('mypage-overview-active-sub');
          const tabRegBadge = document.getElementById('myproj-registered-count-badge');
          const tabPartBadge = document.getElementById('myproj-part-count-badge');
          const filterAllCountEl = document.getElementById('myproj-filter-all-count');
          const filterActiveCountEl = document.getElementById('myproj-filter-active-count');
          const filterCompletedCountEl = document.getElementById('myproj-filter-completed-count');
          const totalCountEl = document.getElementById('myproj-total-count');
          const scrapedCountEl = document.getElementById('myproj-scraped-count');
          const activeProjectCount = registeredProjects.filter(project => normalizeMyProjectStatus(project.status) === 'active').length;
          const completedProjectCount = registeredProjects.filter(project => normalizeMyProjectStatus(project.status) === 'completed').length;

          if (ovPartEl) ovPartEl.textContent = stats.participatedCount;
          if (ovRegEl) ovRegEl.textContent = stats.registeredCount;
          if (ovActiveSubEl) ovActiveSubEl.textContent = `모집 진행중 ${activeProjectCount}건`;
          if (tabRegBadge) tabRegBadge.textContent = registeredProjects.length;
          if (tabPartBadge) {
            const pendingReviewCount = participatedProjects.filter(project => !isParticipationCompleted(project)).length;
            tabPartBadge.textContent = `리뷰 대기 ${pendingReviewCount}`;
          }
          if (scrapedCountEl) scrapedCountEl.textContent = scrapedProjects.length;
          if (totalCountEl) totalCountEl.textContent = `총 ${registeredProjects.length}개`;
          if (filterAllCountEl) filterAllCountEl.textContent = registeredProjects.length;
          if (filterActiveCountEl) filterActiveCountEl.textContent = activeProjectCount;
          if (filterCompletedCountEl) filterCompletedCountEl.textContent = completedProjectCount;

    }
