// ========================================================
// DON-DWAE (돈돼) Supabase & Data Service Layer
// Reference: SCHEMA_DESIGN.md
// ========================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mikswhcchbatrlpetngb.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// ========================================================
// 1. User & Profile Data Operations
// ========================================================

/**
 * Fetch current user profile from 'users' table
 */
export async function fetchUserProfile(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchUserProfile failed:', err.message);
    return null;
  }
}

/**
 * Save or update user profile
 */
export async function updateUserProfile(userId, updateFields) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] updateUserProfile error:', err.message);
    return null;
  }
}

/**
 * Fetch user aggregate statistics (completed test count, registered projects, participations)
 */
export async function fetchUserAggregateStats(userId) {
  if (!supabase || !userId) return { registeredCount: 0, participatedCount: 0, scrapCount: 0 };
  try {
    const [regRes, partRes, scrapRes] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('creator_id', userId),
      supabase.from('participations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('scraps').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ]);
    return {
      registeredCount: regRes.count || 0,
      participatedCount: partRes.count || 0,
      scrapCount: scrapRes.count || 0
    };
  } catch (err) {
    console.warn('[dataService] fetchUserAggregateStats error:', err.message);
    return { registeredCount: 0, participatedCount: 0, scrapCount: 0 };
  }
}

// ========================================================
// 2. Projects & Tests Operations
// ========================================================

/**
 * Fetch active projects for explore feed with filters, search, and sorting directly via SQL
 */
export async function fetchExploreProjects(options = {}) {
  if (!supabase) return null;
  const { category, platform, searchQuery, sortBy } = options;
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        users (nickname, avatar_url)
      `);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`title.ilike.${q},service_name.ilike.${q},service_desc.ilike.${q}`);
    }

    if (sortBy === 'reward') {
      query = query.order('reward_coin', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query.order('current_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchExploreProjects failed:', err.message);
    return null;
  }
}

export async function fetchProjectById(projectId) {
  if (!supabase || !projectId) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users (id, email, nickname, bio, avatar_url, level, rank_badge, interests)
      `)
      .eq('id', projectId)
      .single();
    if (error) throw error;

    // Fallback: If joined users is null or missing nickname, fetch directly from users table
    if (data && data.creator_id && (!data.users || !data.users.nickname)) {
      const creatorProfile = await fetchUserProfile(data.creator_id);
      if (creatorProfile) {
        data.users = creatorProfile;
      }
    }
    return data;
  } catch (err) {
    console.warn('[dataService] fetchProjectById failed:', err.message);
    return null;
  }
}

/**
 * Fetch projects created by user or participated in by user
 */
export async function fetchMyProjects(userId, type = 'registered') {
  if (!supabase || !userId) return [];
  try {
    if (type === 'registered') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } else if (type === 'participated') {
      const { data, error } = await supabase
        .from('participations')
        .select(`
          *,
          projects (*, users(nickname, avatar_url))
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => p.projects).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.warn('[dataService] fetchMyProjects failed:', err.message);
    return [];
  }
}

/**
 * Create a new test project in 'projects'
 */
export async function createProjectRecord(projectPayload) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectPayload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] createProjectRecord error:', err.message);
    return null;
  }
}

/**
 * Update existing project
 */
export async function updateProjectRecord(projectId, updateFields) {
  if (!supabase || !projectId) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updateFields)
      .eq('id', projectId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] updateProjectRecord error:', err.message);
    return null;
  }
}

/**
 * Delete project
 */
export async function deleteProjectRecord(projectId) {
  if (!supabase || !projectId) return false;
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dataService] deleteProjectRecord error:', err.message);
    return false;
  }
}

// ========================================================
// 3. Participations & Reviews Operations
// ========================================================

/**
 * Check if user has already participated in project
 */
export async function checkUserParticipation(projectId, userId) {
  if (!supabase || !projectId || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('participations')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] checkUserParticipation error:', err.message);
    return null;
  }
}

/**
 * Apply for test participation & update project count
 */
export async function applyParticipation(projectId, userId, assignedVariant = 'A') {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('participations')
      .insert([{
        project_id: projectId,
        user_id: userId,
        assigned_variant: assignedVariant,
        status: 'applied'
      }])
      .select()
      .single();
    if (error) throw error;

    // Increment current_count on project
    const proj = await fetchProjectById(projectId);
    if (proj) {
      await supabase
        .from('projects')
        .update({ current_count: (proj.current_count || 0) + 1 })
        .eq('id', projectId);
    }
    return data;
  } catch (err) {
    console.error('[dataService] applyParticipation error:', err.message);
    return null;
  }
}

/**
 * Submit feedback / review
 */
export async function submitReviewRecord(reviewPayload) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([reviewPayload])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] submitReviewRecord error:', err.message);
    return null;
  }
}

/**
 * Update review with creator reply
 */
export async function updateCreatorReply(reviewId, creatorReply) {
  if (!supabase || !reviewId) return null;
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        creator_reply: creatorReply,
        creator_replied_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] updateCreatorReply error:', err.message);
    return null;
  }
}

/**
 * Fetch reviews for a project
 */
export async function fetchProjectReviews(projectId) {
  if (!supabase || !projectId) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        users (nickname, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[dataService] fetchProjectReviews failed:', err.message);
    return [];
  }
}

// ========================================================
// 4. Wallet, Marketplace, Scraps & Notifications Operations
// ========================================================

/**
 * Fetch wallet balance
 */
export async function fetchUserWallet(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchUserWallet failed:', err.message);
    return null;
  }
}

/**
 * Fetch coin transaction history
 */
export async function fetchCoinTransactions(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[dataService] fetchCoinTransactions failed:', err.message);
    return [];
  }
}

/**
 * Add coin transaction & update wallet balance
 */
export async function addCoinTransaction(userId, amount, coinType = 'earned', type = 'reward_earned', description = '') {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('coin_transactions')
      .insert([{
        user_id: userId,
        amount,
        coin_type: coinType,
        type,
        description
      }])
      .select()
      .single();
    if (error) throw error;

    // Update Wallet
    const wallet = await fetchUserWallet(userId);
    if (wallet) {
      const field = coinType === 'earned' ? 'earned_coins' : 'paid_coins';
      const updatedBalance = Math.max(0, (wallet[field] || 0) + amount);
      await supabase
        .from('coin_wallets')
        .update({ [field]: updatedBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
    return data;
  } catch (err) {
    console.error('[dataService] addCoinTransaction error:', err.message);
    return null;
  }
}

/**
 * Exchange Marketplace Item
 */
export async function exchangeMarketplaceItem(userId, item) {
  if (!supabase || !userId || !item) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_exchanges')
      .insert([{
        user_id: userId,
        item_id: item.id,
        spent_coins: item.price_coins,
        status: 'completed',
        voucher_code: `DON-${Math.floor(100000 + Math.random() * 900000)}`
      }])
      .select()
      .single();
    if (error) throw error;

    // Deduct coins from wallet & log transaction
    await addCoinTransaction(userId, -item.price_coins, 'earned', 'shop_purchase', `[교환] ${item.name}`);
    return data;
  } catch (err) {
    console.error('[dataService] exchangeMarketplaceItem error:', err.message);
    return null;
  }
}

/**
 * Fetch marketplace items
 */
export async function fetchMarketplaceItems() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchMarketplaceItems failed:', err.message);
    return null;
  }
}

/**
 * Fetch user scraps
 */
export async function fetchUserScraps(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('scraps')
      .select(`
        *,
        projects (*, users(nickname, avatar_url))
      `)
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[dataService] fetchUserScraps failed:', err.message);
    return [];
  }
}

/**
 * Add or remove scrap
 */
export async function toggleScrap(userId, projectId, isScrapped) {
  if (!supabase || !userId || !projectId) return false;
  try {
    if (isScrapped) {
      const { error } = await supabase
        .from('scraps')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', projectId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('scraps')
        .insert([{ user_id: userId, project_id: projectId }]);
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.error('[dataService] toggleScrap error:', err.message);
    return false;
  }
}

/**
 * Notifications operations
 */
export async function fetchUserNotifications(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[dataService] fetchUserNotifications failed:', err.message);
    return [];
  }
}

export async function createNotification(userId, type, title, message, targetUrl = '') {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        target_url: targetUrl,
        is_read: false
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[dataService] createNotification error:', err.message);
    return null;
  }
}

export async function markNotificationRead(notificationId) {
  if (!supabase || !notificationId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dataService] markNotificationRead error:', err.message);
    return false;
  }
}

export async function markAllNotificationsRead(userId) {
  if (!supabase || !userId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dataService] markAllNotificationsRead error:', err.message);
    return false;
  }
}

export async function deleteNotification(notificationId) {
  if (!supabase || !notificationId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dataService] deleteNotification error:', err.message);
    return false;
  }
}


