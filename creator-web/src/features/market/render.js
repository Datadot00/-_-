    function selectMarketProduct(id, name, price, category, icon) {
      selectedMarketProduct = { id, name, price, category, icon };

      // Highlight card
      document.querySelectorAll('.market-item-card').forEach(c => {
        c.classList.remove('ring-2', 'ring-[#2F6517]', 'border-primary');
        const badge = c.querySelector('[data-selected-market-badge]');
        if (badge) badge.remove();
      });

      const targetCard = document.querySelector(`[data-market-item="${id}"]`);
      if (targetCard) {
        targetCard.classList.add('ring-2', 'ring-[#2F6517]', 'border-primary');
        const activeBadge = document.createElement('span');
        activeBadge.dataset.selectedMarketBadge = 'true';
        activeBadge.className = 'absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#2F6517] text-white text-[10px] font-extrabold shadow-xs flex items-center gap-1';
        activeBadge.textContent = '✓ 현재 선택됨';
        targetCard.appendChild(activeBadge);
      }

      // Update right exchange panel
      const nameEl = document.getElementById('selected-product-name');
      const costEl = document.getElementById('selected-product-cost');
      const iconEl = document.getElementById('selected-product-icon');
      const deductEl = document.getElementById('exchange-deduct-coin');
      const remainEl = document.getElementById('exchange-remain-coin');

      if (nameEl) nameEl.textContent = name;
      if (costEl) costEl.textContent = `${price.toLocaleString()} C`;
      if (iconEl) iconEl.textContent = icon;
      if (deductEl) deductEl.textContent = `- ${price.toLocaleString()} C`;

      const remain = userCoinBalance - price;
      if (remainEl) {
        remainEl.textContent = `${remain.toLocaleString()} C`;
        if (remain < 0) {
          remainEl.className = 'text-lg font-extrabold text-red-600';
        } else {
          remainEl.className = 'text-lg font-extrabold text-[#2F6517]';
        }
      }

      const actionBtn = document.getElementById('btn-exchange-action');
      if (actionBtn) {
        if (remain < 0) {
          actionBtn.disabled = true;
          actionBtn.className = 'w-full py-3.5 px-4 rounded-xl bg-neutral-200 text-neutral-400 font-bold text-sm cursor-not-allowed';
          actionBtn.textContent = '돼지코인이 부족합니다';
        } else {
          actionBtn.disabled = false;
          actionBtn.className = 'w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.98] text-neutral-dark font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 border border-primary-dark/20';
          actionBtn.innerHTML = '<span>✓</span> 교환 완료하기';
        }
      }
    }

    function renderMarketProducts(marketItems) {
      if (marketItems && marketItems.length > 0) {
          const grid = document.getElementById('market-product-grid');
          if (grid) {
            grid.innerHTML = marketItems.map((item, idx) => `
              <div data-market-item="${item.id}" data-market-category="${normalizeMarketCategory(item.category)}"
                onclick="selectMarketProduct(decodeURIComponent('${encodeURIComponent(item.id)}'), decodeURIComponent('${encodeURIComponent(item.name)}'), ${Number(item.price_coins)}, decodeURIComponent('${encodeURIComponent(item.category || '상품')}'), decodeURIComponent('${encodeURIComponent(item.icon || '🎁')}'))"
                class="market-item-card ${idx === 0 ? 'ring-2 ring-[#2F6517] border-primary' : 'border-neutral-200'} bg-white rounded-2xl border p-4 shadow-subtle hover:shadow-card hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between group relative">
                ${idx === 0 ? '<span class="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#2F6517] text-white text-[10px] font-extrabold shadow-xs flex items-center gap-1">✓ 현재 선택됨</span>' : ''}
                <div>
                  <div class="relative w-full h-32 rounded-xl bg-[#F8FAFC] border border-neutral-100 flex items-center justify-center mb-3">
                    <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">${item.stock_count > 0 ? 'In-stock' : '품절'}</span>
                    <span class="text-4xl">${item.icon || '🎁'}</span>
                  </div>
                  <span class="text-[11px] text-neutral-400 font-medium">${item.category || '상품'}</span>
                  <h3 class="text-xs font-bold text-neutral-dark mb-2 group-hover:text-primary-dark transition-colors line-clamp-1">
                    ${escapeHtml(item.name)}
                  </h3>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-neutral-100 mt-2">
                  <span class="text-sm font-extrabold text-neutral-dark">${Number(item.price_coins || 0).toLocaleString()} C</span>
                  <span class="text-[11px] font-bold ${idx === 0 ? 'text-[#2F6517] bg-primary/20 px-2 py-0.5 rounded' : 'text-neutral-500 group-hover:text-primary-dark'}">
                    ${idx === 0 ? '교환 가능' : '선택하기 >'}
                  </span>
                </div>
              </div>
            `).join('');
            const firstItem = marketItems[0];
            if (firstItem) {
              selectMarketProduct(firstItem.id, firstItem.name, Number(firstItem.price_coins), firstItem.category, firstItem.icon || '🎁');
            }
          }
        }
    }
