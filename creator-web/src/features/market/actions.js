    function normalizeMarketCategory(rawCat) {
      const c = String(rawCat || '').toLowerCase();
      if (c.includes('prompt') || c.includes('프롬프트')) return 'prompt';
      if (c.includes('notion') || c.includes('노션')) return 'notion';
      if (c.includes('guide') || c.includes('가이드') || c.includes('툴') || c.includes('세팅')) return 'guide';
      if (c.includes('research') || c.includes('부업') || c.includes('리서치') || c.includes('펀딩') || c.includes('이모티콘')) return 'research';
      return c || 'prompt';
    }

    function filterMarketCategory(cat, btn) {
      document.querySelectorAll('.market-filter-btn').forEach(b => {
        b.className = 'market-filter-btn px-4 py-2 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors text-xs font-semibold';
      });
      if (btn) {
        btn.className = 'market-filter-btn px-4 py-2 rounded-full bg-primary font-bold text-neutral-dark shadow-2xs text-xs';
      }

      const items = document.querySelectorAll('.market-item-card');
      items.forEach(item => {
        const itemCat = item.getAttribute('data-market-category');
        const normalized = normalizeMarketCategory(itemCat);
        if (cat === 'all' || itemCat === cat || normalized === cat) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    }

    async function executeExchange() {
      if (!selectedMarketProduct) return;
      if (userCoinBalance < selectedMarketProduct.price) {
        showGenericToast(resolveFriendlyError('COIN_INSUFFICIENT', 'COIN_INSUFFICIENT').formatted, '⚠️');
        return;
      }
      const actionButton = document.getElementById('btn-exchange-action');
      if (actionButton) {
        actionButton.disabled = true;
        actionButton.textContent = '교환 처리 중...';
      }

      try {
        const result = await window.donDwaeDataService.exchangeMarketplaceItem(selectedMarketProduct.id);
        window.setUserCoinBalance(Number(result.wallet_total || 0));
        selectMarketProduct(
          selectedMarketProduct.id,
          selectedMarketProduct.name,
          selectedMarketProduct.price,
          selectedMarketProduct.category,
          selectedMarketProduct.icon
        );
        const voucherNotice = result.voucher_code ? ` 발급 코드: ${result.voucher_code}` : '';
        showGenericToast(`🎁 [${result.item_name}] 교환 완료!${voucherNotice}`, '🎉');

        const { data: { session } } = await window.donDwaeDataService.supabase.auth.getSession();
        if (session?.user) {
          const [wallet, transactions, exchanges] = await Promise.all([
            window.donDwaeDataService.fetchUserWallet(session.user.id),
            window.donDwaeDataService.fetchCoinTransactions(session.user.id),
            window.donDwaeDataService.fetchUserExchanges(session.user.id)
          ]);
          window.renderMyCoinData(wallet, transactions, exchanges);
        }
      } catch (err) {
        console.error('[Don Dwae DB] Transactional marketplace exchange failed:', err);
        showGenericToast(resolveFriendlyError(err, 'COIN_TRANSACTION_FAILED').formatted, '⚠️');
      } finally {
        if (actionButton) actionButton.disabled = false;
        selectMarketProduct(
          selectedMarketProduct.id,
          selectedMarketProduct.name,
          selectedMarketProduct.price,
          selectedMarketProduct.category,
          selectedMarketProduct.icon
        );
      }
    }
