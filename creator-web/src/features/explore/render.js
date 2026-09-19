    function renderExploreFeedState(state = 'loading') {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;

      grid.dataset.feedStatus = state;
      grid.setAttribute('aria-busy', String(state === 'loading'));
      if (state === 'loading') {
        grid.innerHTML = '';
        return;
      }

      const isError = state === 'error';
      const icon = isError ? '⚠️' : '📭';
      const title = isError
        ? '프로젝트를 불러오지 못했어요'
        : '현재 모집 중인 프로젝트가 없어요';
      const description = isError
        ? '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
        : '새 프로젝트가 등록되면 이곳에 바로 표시됩니다.';
      const action = isError
        ? `<button type="button" onclick="window.initSupabaseLiveDB()"
            class="mt-5 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-[#27272A] text-white font-bold text-xs shadow-xs transition-all">
            다시 불러오기
          </button>`
        : '';

      grid.innerHTML = `
        <div id="feed-${state}-state"
          class="col-span-1 md:col-span-2 lg:col-span-3 py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-neutral-300 p-8 shadow-xs">
          <div class="w-16 h-16 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-3xl mb-4 shadow-inner">${icon}</div>
          <h3 class="text-base font-black text-neutral-dark mb-1">${title}</h3>
          <p class="text-xs text-neutral-500 font-medium max-w-sm leading-relaxed">${description}</p>
          ${action}
        </div>`;
    }

    function appendFilteredFeedEmptyState(grid) {
      grid.insertAdjacentHTML('beforeend', `
        <div id="feed-empty-state"
          class="hidden col-span-1 md:col-span-2 lg:col-span-3 py-16 flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-neutral-300 p-8 shadow-xs">
          <div class="w-16 h-16 rounded-full bg-[#FAFBF7] border border-[#E9EEDC] flex items-center justify-center text-3xl mb-4 shadow-inner">🔍</div>
          <h3 class="text-base font-black text-neutral-dark mb-1">조건에 맞는 프로젝트가 없어요</h3>
          <p class="text-xs text-neutral-500 font-medium max-w-sm mb-5 leading-relaxed">검색어나 카테고리 필터를 변경해 보세요.</p>
          <button type="button" onclick="filterFeed('all'); if(document.getElementById('header-search-input')) document.getElementById('header-search-input').value='';"
            class="px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-[#27272A] text-white font-bold text-xs shadow-xs transition-all">
            전체 프로젝트 보기
          </button>
        </div>`);
    }

    async function loadSlotThumbnail(slot) {
      const projectId = slot.dataset.thumbnailSlot;
      if (!projectId || slot.dataset.thumbnailState) return;
      slot.dataset.thumbnailState = 'loading';

      const ds = window.donDwaeDataService;
      if (!ds || typeof ds.fetchProjectThumbnail !== 'function') {
        slot.dataset.thumbnailState = 'skipped';
        return;
      }

      const url = await ds.fetchProjectThumbnail(projectId);
      if (!url) {
        // No thumbnail stored: keep the text placeholder already rendered.
        slot.dataset.thumbnailState = 'empty';
        return;
      }

      const alt = slot.dataset.thumbnailAlt || '프로젝트';
      slot.classList.remove('p-3', 'flex', 'flex-col', 'justify-between');
      slot.innerHTML = `
        <img src="${escapeHtml(url)}" onerror="handleBrokenProjectThumbnail(this)"
          data-thumbnail-variant="card" loading="lazy" decoding="async"
          class="w-full h-full object-cover" alt="${escapeHtml(alt)} 미리보기" />`;
      slot.dataset.thumbnailState = 'ready';
    }

    window.renderLiveProjectsToFeed = function(projects) {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid || !Array.isArray(projects)) return;

      window.liveExploreProjects = projects;
      if (projects.length === 0) {
        renderExploreFeedState('empty');
        return;
      }

      grid.dataset.feedStatus = 'ready';
      grid.setAttribute('aria-busy', 'false');
      grid.innerHTML = '';
      projects.forEach(project => grid.appendChild(createFeedProjectCard(project)));
      appendFilteredFeedEmptyState(grid);
      observePendingThumbnails(grid);
    };
