// ========================================================
// DON-DWAE (돈돼) Main Entry Point & Supabase Realtime Integration
// Reference: SCHEMA_DESIGN.md
// ========================================================

import * as dataService from './dataService.js';
import { ERROR_CODES, toUserFriendlyError } from './errorCodes.js';
import * as profileFields from './profileFieldsUi.js';

// Expose DataService & ErrorCodes to Window for Inline Event Handlers in index.html
if (typeof window !== 'undefined') {
  window.donDwaeDataService = dataService;
  window.DonDwaeErrorCodes = ERROR_CODES;
  window.toUserFriendlyError = toUserFriendlyError;
  // 내 정보 수정 모달은 index.html 인라인 스크립트에서 호출한다.
  window.donDwaeProfileFields = profileFields;
}

/**
 * Initialize Supabase Live Sync on Page Load
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Don Dwae] Initializing Live Data Layer with Supabase...');

  if (!dataService.supabase) {
    console.warn('[Don Dwae] Supabase client not initialized.');
    return;
  }

  try {
    const { data: { session } } = await dataService.supabase.auth.getSession();
    if (session && session.user) {
      const profile = await dataService.fetchUserProfile(session.user.id);
      if (profile && typeof window.updateProfileUI === 'function') {
        window.updateProfileUI(profile);
      }

      const wallet = await dataService.fetchUserWallet(session.user.id);
      if (wallet && typeof window.setUserCoinBalance === 'function') {
        window.setUserCoinBalance(wallet.earned_coins + wallet.paid_coins);
      }
    }

    const marketItems = await dataService.fetchMarketplaceItems();
    if (marketItems && marketItems.length > 0) {
      console.log(`[Don Dwae] Loaded ${marketItems.length} active items from Supabase Marketplace.`);
    }
  } catch (err) {
    console.warn('[Don Dwae] Live sync initialization notice:', err.message);
  }
});
