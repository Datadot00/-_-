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
    console.warn('[dataService] fetchUserProfile failed, fallback to local:', err.message);
    return null;
  }
}

/**
 * Update user profile
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

// ========================================================
// 2. Projects & Tests Operations
// ========================================================

/**
 * Fetch all active projects for explore feed
 */
export async function fetchExploreProjects() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users (nickname, avatar_url)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchExploreProjects failed:', err.message);
    return null;
  }
}

/**
 * Fetch a single project by ID from 'projects'
 */
export async function fetchProjectById(projectId) {
  if (!supabase || !projectId) return null;
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users (nickname, avatar_url)
      `)
      .eq('id', projectId)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchProjectById failed:', err.message);
    return null;
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

// ========================================================
// 3. Participations & Reviews Operations
// ========================================================

/**
 * Apply for test participation (Handles 50:50 A/B blind assignment)
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

// ========================================================
// 4. Wallet & Marketplace Operations
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

/**
 * Fetch reviews for a project (enforces RLS for private reviews)
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
 * Fetch dual wallet balance ('earned_coins' & 'paid_coins')
 */
export async function fetchUserWallet(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('coin_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[dataService] fetchUserWallet failed:', err.message);
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
 * Fetch user scraps (bookmarks)
 */
export async function fetchUserScraps(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('scraps')
      .select(`
        *,
        projects (*)
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
 * Fetch user notifications
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

