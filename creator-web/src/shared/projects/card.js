// Project card variants share one source; each keeps its existing layout and actions.

    function createFeedProjectCard(p) {
        const card = document.createElement('article');
        card.setAttribute('data-category', p.category || 'product');
        card.setAttribute('data-reward', p.reward_coin ?? 500);
        card.setAttribute('data-time', p.duration || '3분');
        card.setAttribute('data-date', p.created_at ? p.created_at.split('T')[0] : '');
        card.setAttribute('data-card-id', p.id);
        card.className = 'feed-card bg-white rounded-2xl border border-[#E5E7EB] shadow-subtle hover:shadow-card hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group relative';
        card.onclick = () => openPostDetail(p.id);

        const remaining = Math.max(0, (p.target_count || 10) - (p.current_count || 0));
        const categoryLabels = {
          product: '프로덕트',
          prototype: '프로토타입',
          vote: '투표',
          survey: '설문조사'
        };
        const categoryLabel = categoryLabels[p.category] || '프로덕트';
        const creatorNick = p.users?.nickname || '크리에이터';
        // The list query intentionally omits thumbnail_url so login stays fast.
        // A direct URL renders immediately; anything else is fetched lazily.
        const thumbnailUrl = /^https?:\/\//i.test(String(p.thumbnail_url || ''))
          ? String(p.thumbnail_url)
          : '';
        const needsLazyThumbnail = !thumbnailUrl && p.thumbnail_url !== null;
        const personalState = getProjectPersonalState(p);
        card.setAttribute('data-personal-state', personalState);

        const isAlreadyScraped = (window.myProjectCollections?.scraped || []).some(sp => String(sp.id) === String(p.id));
        const bookmarkClass = isAlreadyScraped
          ? 'is-saved text-[#2F6517] bg-[#EBF7E3] border-[#A9DD82]'
          : 'text-neutral-400 hover:text-neutral-700 border-neutral-200';
        const bookmarkFill = isAlreadyScraped ? 'currentColor' : 'none';
        const bookmarkStroke = isAlreadyScraped ? 'currentColor' : 'currentColor';
        const bookmarkTitle = isAlreadyScraped ? '스크랩 해제' : '스크랩 저장';

        card.innerHTML = `
          <div class="relative bg-[#EFF6FF] border-b border-[#F0F2F5] p-3">
            <div class="w-full h-40 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs overflow-hidden ${thumbnailUrl ? '' : 'p-3 flex flex-col justify-between'}"
              ${needsLazyThumbnail ? `data-thumbnail-slot="${escapeHtml(String(p.id))}" data-thumbnail-alt="${escapeHtml(p.service_name || p.title || '프로젝트')}"` : ''}>
              ${thumbnailUrl ? `
                <img src="${escapeHtml(thumbnailUrl)}" onerror="handleBrokenProjectThumbnail(this)" data-thumbnail-variant="card" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${escapeHtml(p.service_name || p.title || '프로젝트')} 미리보기" />
              ` : `
                <div class="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-100 pb-1">
                  <span class="font-bold text-neutral-700">${p.service_name || p.title}</span>
                  <span class="text-blue-600 font-bold">${categoryLabel}</span>
                </div>
                <div class="flex items-center justify-center flex-1 bg-blue-50/50 rounded my-1 text-center">
                  <span class="text-xs font-bold text-blue-900">${p.service_name || '서비스 테스트'}</span>
                </div>
              `}
            </div>
            <div data-feed-personal-status class="absolute inset-x-5 bottom-5 z-10 flex items-center">
              ${renderProjectPersonalBadge(personalState, p.id)}
            </div>
            <div class="absolute top-5 left-5 flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs border border-neutral-200 text-neutral-700 text-[11px] font-bold">
                ${categoryLabel} · ${p.duration || '3분'}
              </span>
              <span class="px-2.5 py-1 rounded-full bg-[#B4E380] text-[#1E3E0B] text-[11px] font-extrabold flex items-center gap-1 shadow-2xs">
                <span>🪙</span> +${p.reward_coin ?? 500} C
              </span>
            </div>
            <button type="button" onclick="toggleBookmark(event, this, '${p.id}')"
              class="bookmark-flag-btn absolute top-5 right-5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white flex items-center justify-center shadow-2xs transition-all border z-10 ${bookmarkClass}"
              title="${bookmarkTitle}">
              <svg class="w-4 h-4 pointer-events-none transition-all duration-150 active:scale-90" fill="${bookmarkFill}" stroke="${bookmarkStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </button>
          </div>
          <div class="p-5 flex flex-col flex-1 justify-between gap-4">
            <h3 class="text-sm sm:text-base font-bold text-neutral-dark line-clamp-2 leading-snug group-hover:text-primary-dark transition-colors">
              ${p.title}
            </h3>
            <div class="flex items-center justify-between text-xs border-t border-dashed border-neutral-200 pt-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">● ${remaining}명 남음</span>
                <span class="text-neutral-400 text-[11px]">(${p.current_count || 0}/${p.target_count || 10} 모집)</span>
              </div>
              <span class="text-neutral-400 text-[11px]">⏱ ${p.duration || '3분'}</span>
            </div>
          </div>
          <div class="px-5 py-3 bg-[#FAFBF7] border-t border-[#E5E7EB] flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-pink-100 text-[10px] flex items-center justify-center">🐷</div>
              <span class="font-medium text-neutral-700">${creatorNick}</span>
            </div>
            <div class="flex items-center gap-3 text-neutral-400 text-[11px]">
              <span class="font-bold text-emerald-600">진행 중</span>
            </div>
          </div>
        `;
        return card;
    }

    function renderMyProjectCard(project, tabKey) {
        const id = String(project.id || '');
        const title = escapeHtml(project.title || project.service_name || '제목 없는 프로젝트');
        const category = escapeHtml(project.category || '프로젝트');
        const platform = escapeHtml((project.platform || 'web').toUpperCase());
        const currentCount = Number(project.current_count) || 0;
        const targetCount = Math.max(1, Number(project.target_count) || 1);
        const progress = Math.min(100, Math.round((currentCount / targetCount) * 100));
        const status = normalizeMyProjectStatus(project.status);
        const statusLabel = status === 'completed' ? '진행완료' : '진행중';
        const personalState = tabKey === 'registered'
          ? 'owned'
          : tabKey === 'participated'
            ? (isParticipationCompleted(project) ? 'completed' : 'review-needed')
            : '';
        const createdDate = project.created_at ? new Date(project.created_at).toLocaleDateString('ko-KR') : '-';
        const ownerActions = tabKey === 'registered'
          ? `<div class="flex items-center gap-1">
              <button type="button" onclick="openEditPostModal('${id}')" class="p-1.5 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors" title="수정">✏️</button>
              <button type="button" onclick="deleteRegisteredProject(this, '${id}')" class="p-1.5 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors text-neutral-400" title="삭제">🗑️</button>
             </div>`
          : '';
        // 참여한 프로젝트는 이미 참여 목록에 남으므로 스크랩이 따로 필요하지 않다.
        const scrapAction = tabKey === 'scraped'
          ? `<button type="button" onclick="deleteScrapedItem(this, '${id}')" class="px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer">스크랩 해제</button>`
          : '';
        const reviewAction = tabKey === 'participated'
          ? isParticipationCompleted(project)
            ? `<span class="px-3 py-2 text-xs font-extrabold text-emerald-700">✓ 리뷰 제출 완료</span>`
            : `<button type="button" onclick="resumeProjectReview('${id}')" class="px-4 py-2 rounded-xl bg-[#18181B] hover:bg-neutral-800 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer">✍️ 리뷰 작성하러 가기</button>`
          : '';

        return `
          <article class="myproj-card bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col gap-4 transition-all hover:shadow-subtle" data-status="${status}">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4 min-w-0">
                <div class="relative w-20 h-20 rounded-2xl bg-[#E8F5E9] border border-[#C8E6C9] overflow-hidden flex flex-col items-center justify-center shrink-0">
                  ${project.thumbnail_url
                    ? `<img src="${escapeHtml(project.thumbnail_url)}" onerror="handleBrokenProjectThumbnail(this)" data-thumbnail-variant="card" loading="lazy" decoding="async" class="w-full h-full object-cover" alt="${title} 썸네일" />`
                    : `<span class="text-xl">📱</span><span class="text-[9px] font-black text-white bg-[#43A047] px-1 rounded mt-1">${platform}</span>`}
                  ${personalState ? `
                    <span class="absolute inset-x-1 bottom-1 rounded-md ${personalState === 'owned' ? 'bg-[#DFF6C5] text-[#234D10] border-[#9BCB68]' : personalState === 'review-needed' ? 'bg-[#FFF7D6] text-[#7A4B00] border-[#F0C75E]' : 'bg-[#18181B]/90 text-white border-white/30'} border px-1 py-0.5 text-center text-[9px] font-black shadow-sm backdrop-blur-sm">
                      ${personalState === 'owned' ? '내 프로젝트' : personalState === 'review-needed' ? '✍ 리뷰 필요' : '✓ 참여완료'}
                    </span>` : ''}
                </div>
                <div class="flex flex-col gap-1.5 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap text-xs">
                    <span class="px-2.5 py-0.5 rounded-full bg-[#B4E380] text-[#1E3E0B] font-extrabold text-[11px]">● ${statusLabel}</span>
                    <span class="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-bold">[${category}]</span>
                    <span class="text-[11px] text-neutral-400 font-medium">📅 ${createdDate}</span>
                  </div>
                  <h3 class="text-base font-extrabold text-neutral-dark hover:text-primary-dark cursor-pointer truncate" onclick="openPostDetail('${id}')">${title}</h3>
                  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs pt-1">
                    <span class="font-bold text-neutral-700">참여 <strong>${currentCount}/${targetCount}명</strong></span>
                    <div class="w-28 h-2 bg-neutral-100 rounded-full overflow-hidden"><div class="h-full bg-[#B4E380]" style="width:${progress}%"></div></div>
                    <span class="font-extrabold text-emerald-700 text-[11px]">${progress}%</span>
                    <span class="font-black text-[#D97706] text-xs">🪙 ${Number(project.reward_coin ?? 0).toLocaleString()} C / 명</span>
                  </div>
                </div>
              </div>
              <div>${ownerActions}</div>
            </div>
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              ${scrapAction}
              <button onclick="openPostDetail('${id}')" class="px-4 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold">상세 화면</button>
              ${reviewAction}
              ${tabKey === 'registered' ? `<button onclick="openFeedbackReport('${id}')" class="px-4 py-2 rounded-xl bg-[#191A1C] hover:bg-neutral-800 text-white text-xs font-bold">결과 및 피드백</button>` : ''}
            </div>
          </article>`;
    }

    function renderPublishedProjectCard(createdId, sName, sDesc, sUrl, rCoin, tCount, techTags) {
      const grid = document.getElementById('dashboard-cards-grid');
      if (grid) {
        const oldCard = document.getElementById('newly-published-card');
        if (oldCard) oldCard.remove();

        const newCard = document.createElement('article');
        newCard.id = 'newly-published-card';
        newCard.setAttribute('data-category', 'product');
        newCard.setAttribute('data-reward', String(rCoin));
        newCard.onclick = () => openPostDetail(createdId);
        newCard.innerHTML = `
          <div class="h-32 bg-gradient-to-br from-primary/30 to-[#B4E380]/40 flex flex-col items-center justify-center p-4 text-center relative border-b border-primary/20">
            <span class="text-3xl mb-1 filter drop-shadow-xs">🎉</span>
            <span class="text-sm font-extrabold text-neutral-dark">${sName}</span>
            <span class="text-[11px] text-neutral-muted mt-1 font-mono">${sUrl || (currentMainCategory === 'vote' ? '돈돼 내부 투표' : '연결 URL 없음')}</span>
            <div class="mt-3 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span class="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/30 text-primary-dark font-extrabold">
                내가 등록한 테스트 (실시간 모집 중)
              </span>
              </div>
            </div>

            <!-- Bookmark Flag Button -->
            <button
              type="button"
              onclick="toggleBookmark(event, this)"
              class="bookmark-flag-btn absolute top-5 right-5 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-neutral-400 hover:text-neutral-700 transition-all border border-neutral-200 z-10"
              title="스크랩 저장"
            >
              <svg class="w-4 h-4 pointer-events-none transition-all duration-150 active:scale-90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            </button>

            <div class="absolute top-5 left-5 flex items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-md bg-primary text-[#1F450B] text-[11px] font-extrabold shadow-2xs">
                [내가 등록함]
              </span>
              <span class="px-2 py-1 rounded-md bg-white/90 text-neutral-dark text-[11px] font-bold">
                [${myCreatedTest.testType}]
              </span>
            </div>
          </div>

          <div class="p-5 flex flex-col flex-1 justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <h3 class="text-[16px] font-extrabold text-neutral-dark line-clamp-1 group-hover:text-primary-dark transition-colors">
                  ${sName} - ${sDesc}
                </h3>
                <span class="px-2.5 py-1 rounded-full bg-[#191A1C] text-white text-[11px] font-extrabold shrink-0 shadow-2xs">
                  🪙 ${rCoin} 돼지코인
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 text-xs text-neutral-muted mb-4 font-normal">
                ${techTags.slice(0, 3).map(t => `<span class="bg-neutral-100 px-2 py-0.5 rounded text-[10px]">#${t}</span>`).join('')}
                <span class="text-[10px] text-primary-dark font-bold">#내프로젝트</span>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between text-xs font-semibold text-neutral-dark mb-1.5">
                <span>모집 현황: 0/${tCount}명</span>
                <span class="text-primary-dark font-extrabold">0% 달성</span>
              </div>
              <div class="w-full h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full" style="width: 4%;"></div>
              </div>
            </div>
          </div>

          <div class="px-5 py-3.5 border-t border-[#F4F4F5] flex items-center justify-between text-xs bg-[#FCFDFC]">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded-full bg-[#2F6517] text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">나</div>
              <span class="font-bold text-neutral-dark">바이브코더123 (나)</span>
            </div>
            <span class="font-bold text-primary-dark flex items-center gap-1">
              <span>상세보기</span> <span>→</span>
            </span>
          </div>
        `;
        grid.insertBefore(newCard, grid.firstChild);
      }
    }
