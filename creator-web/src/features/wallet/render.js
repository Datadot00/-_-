    window.renderMyCoinData = function (wallet, transactions = [], exchanges = []) {
      const totalBalance = Number(wallet?.earned_coins || 0) + Number(wallet?.paid_coins || 0);
      window.setUserCoinBalance(totalBalance);

      const now = new Date();
      const monthlyEarned = transactions
        .filter(item => {
          const createdAt = new Date(item.created_at);
          return Number(item.amount) > 0
            && createdAt.getFullYear() === now.getFullYear()
            && createdAt.getMonth() === now.getMonth();
        })
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const completedExchanges = exchanges.filter(item => item.status === 'completed').length;

      const monthlyEl = document.getElementById('mypage-monthly-earned');
      const monthlyCaption = document.getElementById('mypage-monthly-earned-caption');
      const exchangeEl = document.getElementById('mypage-exchange-count');
      const exchangeCaption = document.getElementById('mypage-exchange-caption');
      if (monthlyEl) monthlyEl.textContent = `+${monthlyEarned.toLocaleString()}`;
      if (monthlyCaption) monthlyCaption.textContent = monthlyEarned > 0 ? '이번 달 실제 적립 합계' : '이번 달 적립 내역 없음';
      if (exchangeEl) exchangeEl.textContent = completedExchanges;
      if (exchangeCaption) exchangeCaption.textContent = completedExchanges > 0 ? '완료된 실제 교환 내역' : '교환 내역 없음';

      const list = document.getElementById('mypage-coin-transactions-list');
      if (!list) return;
      if (!transactions.length) {
        list.innerHTML = '<p class="py-8 text-center text-xs text-neutral-400">아직 적립 또는 사용한 돼지코인 내역이 없습니다.</p>';
        return;
      }

      const typeLabels = {
        reward_earned: '피드백 리워드',
        shop_purchase: '상점 교환',
        project_funding: '프로젝트 리워드 예치',
        refund: '환불',
        bonus: '보너스'
      };
      list.innerHTML = transactions.slice(0, 20).map(item => {
        const amount = Number(item.amount || 0);
        const positive = amount >= 0;
        const label = typeLabels[item.type] || item.description || '돼지코인 변동';
        const date = item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '-';
        return `
          <div class="py-3 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-bold text-neutral-700 truncate">${escapeHtml(label)}</p>
              <p class="text-[10px] text-neutral-400 mt-0.5">${date} · ${item.coin_type === 'paid' ? '충전 돼지코인' : '적립 돼지코인'}</p>
            </div>
            <span class="text-sm font-black ${positive ? 'text-[#2F6517]' : 'text-red-600'}">${positive ? '+' : ''}${amount.toLocaleString()} C</span>
          </div>`;
      }).join('');
    };
