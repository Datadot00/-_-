    function refreshFeedPersonalState(projectId) {
      const normalizedId = String(projectId || '');
      const project = (window.liveExploreProjects || [])
        .find(item => String(item.id || '') === normalizedId);
      const card = [...document.querySelectorAll('.feed-card[data-card-id]')]
        .find(item => String(item.dataset.cardId || '') === normalizedId);
      if (!project || !card) return;

      const state = getProjectPersonalState(project);
      card.dataset.personalState = state;
      const badgeSlot = card.querySelector('[data-feed-personal-status]');
      if (badgeSlot) badgeSlot.innerHTML = renderProjectPersonalBadge(state, normalizedId);
    }

    function filterFeed(category, btnElement) {
      // 1. Highlight clicked filter button
      document.querySelectorAll('.feed-filter-btn').forEach(btn => {
        btn.className = 'feed-filter-btn px-4 py-2 rounded-full bg-white border border-[#E5E7EB] text-[#52525B] hover:bg-neutral-50 hover:text-neutral-dark transition-all shrink-0 flex items-center gap-1.5 font-semibold text-xs';
      });
      if (btnElement) {
        btnElement.className = 'feed-filter-btn px-4 py-2 rounded-full bg-[#18181B] text-white shadow-2xs shrink-0 transition-all font-bold text-xs flex items-center gap-1.5';
      }

      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll('.feed-card'));
      let visibleCount = 0;

      if (category === 'all') {
        cards.forEach(card => {
          card.style.display = 'flex';
          visibleCount++;
        });
      } else {
        cards.forEach(card => {
          const cardCat = card.getAttribute('data-category');
          if (cardCat === category) {
            card.style.display = 'flex';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });
      }

      // Empty State Handling
      const emptyState = document.getElementById('feed-empty-state');
      if (emptyState) {
        if (visibleCount === 0) {
          emptyState.classList.remove('hidden');
          emptyState.classList.add('flex');
        } else {
          emptyState.classList.add('hidden');
          emptyState.classList.remove('flex');
        }
      }
    }

    function searchFeed(query) {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll('.feed-card'));
      const q = (query || '').trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      const emptyState = document.getElementById('feed-empty-state');
      if (emptyState) {
        if (visibleCount === 0) {
          emptyState.classList.remove('hidden');
          emptyState.classList.add('flex');
        } else {
          emptyState.classList.add('hidden');
          emptyState.classList.remove('flex');
        }
      }
    }

    function sortFeed(sortKey) {
      const grid = document.getElementById('dashboard-cards-grid');
      if (!grid) return;
      const cards = Array.from(grid.querySelectorAll('.feed-card'));

      cards.sort((a, b) => {
        if (sortKey === 'reward') {
          // 높은 보상순 (descending)
          const rA = parseInt(a.getAttribute('data-reward') || '0', 10);
          const rB = parseInt(b.getAttribute('data-reward') || '0', 10);
          return rB - rA;
        } else if (sortKey === 'time') {
          // 소요시간 적은 순 (ascending)
          const tA = parseFloat(a.getAttribute('data-time') || '999');
          const tB = parseFloat(b.getAttribute('data-time') || '999');
          return tA - tB;
        } else if (sortKey === 'recommended') {
          // 추천순 (descending)
          const recA = parseInt(a.getAttribute('data-recommended') || '0', 10);
          const recB = parseInt(b.getAttribute('data-recommended') || '0', 10);
          return recB - recA;
        } else if (sortKey === 'latest') {
          // 등록순 (latest date first)
          const dA = a.getAttribute('data-date') || '';
          const dB = b.getAttribute('data-date') || '';
          return dB.localeCompare(dA);
        } else if (sortKey === 'deadline') {
          // 마감순 (deadline closest first)
          const dlA = parseInt(a.getAttribute('data-deadline') || '999', 10);
          const dlB = parseInt(b.getAttribute('data-deadline') || '999', 10);
          return dlA - dlB;
        }
        return 0;
      });

      cards.forEach(card => grid.appendChild(card));

      const toastMessages = {
        reward: '💰 높은 보상순으로 정렬되었습니다.',
        time: '⏱ 소요시간 적은 순으로 정렬되었습니다.',
        recommended: '👍 개인 맞춤 추천순으로 정렬되었습니다.',
        latest: '🆕 최신 등록순으로 정렬되었습니다.',
        deadline: '🔥 마감 임박순으로 정렬되었습니다.'
      };
      if (toastMessages[sortKey]) {
        showGenericToast(toastMessages[sortKey], '✨');
      }
    }

    function observePendingThumbnails(grid) {
      const slots = grid.querySelectorAll('[data-thumbnail-slot]');
      if (!slots.length) return;

      if (!('IntersectionObserver' in window)) {
        slots.forEach(loadSlotThumbnail);
        return;
      }

      if (!thumbnailObserver) {
        thumbnailObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            loadSlotThumbnail(entry.target);
          });
        }, { rootMargin: '200px' });
      }

      slots.forEach(slot => thumbnailObserver.observe(slot));
    }
