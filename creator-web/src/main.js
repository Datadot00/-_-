// ========================================================
// DON-DWAE (돈돼) Main Entry Point & Supabase Realtime Integration
// Reference: SCHEMA_DESIGN.md
// ========================================================

import {
  supabase,
  fetchUserProfile,
  fetchExploreProjects,
  fetchProjectById,
  createProjectRecord,
  updateProjectRecord,
  deleteProjectRecord,
  submitReviewRecord,
  fetchProjectReviews,
  fetchUserWallet,
  fetchMarketplaceItems,
  fetchUserScraps,
  fetchUserNotifications
} from './dataService.js';

// Expose DataService to Window for Inline Event Handlers in index.html
if (typeof window !== 'undefined') {
  window.donDwaeDataService = {
    supabase,
    fetchUserProfile,
    fetchExploreProjects,
    fetchProjectById,
    createProjectRecord,
    updateProjectRecord,
    deleteProjectRecord,
    submitReviewRecord,
    fetchProjectReviews,
    fetchUserWallet,
    fetchMarketplaceItems,
    fetchUserScraps,
    fetchUserNotifications
  };
}

/**
 * Initialize Supabase Live Sync on Page Load
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Don Dwae] Initializing Live Data Layer with Supabase...');

  if (!supabase) {
    console.warn('[Don Dwae] Supabase client not initialized, using local fallback state.');
    return;
  }

  try {
    // 1. Check active Auth Session
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const profile = await fetchUserProfile(session.user.id);
      if (profile && typeof window.updateProfileUI === 'function') {
        window.updateProfileUI(profile);
      }

      const wallet = await fetchUserWallet(session.user.id);
      if (wallet && typeof window.userCoinBalance !== 'undefined') {
        window.userCoinBalance = wallet.earned_coins + wallet.paid_coins;
        if (typeof window.updateAllCoinDisplays === 'function') {
          window.updateAllCoinDisplays();
        }
      }
    }

    // 2. Pre-fetch Explore Feed Projects
    const liveProjects = await fetchExploreProjects();
    if (liveProjects && liveProjects.length > 0) {
      console.log(`[Don Dwae] Loaded ${liveProjects.length} live projects from Supabase DB.`);
    }

    // 3. Pre-fetch Marketplace items
    const marketItems = await fetchMarketplaceItems();
    if (marketItems && marketItems.length > 0) {
      console.log(`[Don Dwae] Loaded ${marketItems.length} active items from Supabase Marketplace.`);
    }
  } catch (err) {
    console.warn('[Don Dwae] Live sync initialization notice:', err.message);
  }
});
