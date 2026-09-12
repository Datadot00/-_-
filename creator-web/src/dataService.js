// ========================================================
// DON-DWAE (돈돼) Supabase & Data Service Layer
// Reference: SCHEMA_DESIGN.md
// ========================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://mikswhcchbatrlpetngb.supabase.co';
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const USER_PUBLIC_COLUMNS = [
  'id',
  'nickname',
  'bio',
  'avatar_url',
  'interests',
  'level',
  'rank_badge',
  'has_passed_gating',
  'completed_test_count',
  'created_at',
  'updated_at'
].join(',');

const USER_CARD_COLUMNS = 'nickname,avatar_url';
const USER_DETAIL_COLUMNS = 'id,nickname,bio,avatar_url,level,rank_badge,interests';

export const PROJECT_CARD_COLUMNS = [
  'id',
  'creator_id',
  'title',
  'service_name',
  'thumbnail_url',
  'category',
  'platform',
  'is_ab_test',
  'duration',
  'target_count',
  'current_count',
  'reward_coin',
  'status',
  'created_at'
].join(',');

export const PROJECT_PUBLIC_COLUMNS = [
  'id',
  'creator_id',
  'title',
  'service_name',
  'service_desc',
  'test_notice',
  'thumbnail_url',
  'category',
  'platform',
  'is_ab_test',
  'service_url',
  'ab_url_a',
  'ab_url_b',
  'app_playstore_url',
  'app_appstore_url',
  'external_survey_url',
  'login_required',
  'privacy_items',
  'test_guide',
  'questions',
  'quizzes',
  'verification_method',
  'duration',
  'start_date',
  'end_date',
  'target_count',
  'current_count',
  'reward_coin',
  'total_funded_cost',
  'is_reviews_public',
  'status',
  'tech_tags',
  'target_persona_tags',
  'created_at'
].join(',');

const PROJECT_INCREMENTAL_COLUMNS = ['verification_method', 'target_persona_tags'];

// Keep project reads usable while incremental optional columns are waiting to
// be migrated in a connected development database.
export const PROJECT_PUBLIC_LEGACY_COLUMNS = PROJECT_PUBLIC_COLUMNS
  .split(',')
  .filter(column => !PROJECT_INCREMENTAL_COLUMNS.includes(column))
  .join(',');

function getMissingIncrementalProjectColumn(error) {
  const message = String(error?.message || '');
  const missingColumn = PROJECT_INCREMENTAL_COLUMNS.find(column => message.includes(column));
  if (!missingColumn) return '';
  const looksLikeMissingColumn = error?.code === '42703'
    || error?.code === 'PGRST204'
    || /does not exist|could not find|schema cache/i.test(message);
  return looksLikeMissingColumn ? missingColumn : '';
}

function getProjectColumns(excludedColumns = new Set()) {
  return PROJECT_PUBLIC_COLUMNS
    .split(',')
    .filter(column => !excludedColumns.has(column))
    .join(',');
}

async function runProjectQueryWithColumnFallback(queryFactory) {
  const excludedColumns = new Set();
  let result = { data: null, error: null };
  for (let attempt = 0; attempt <= PROJECT_INCREMENTAL_COLUMNS.length; attempt += 1) {
    result = await queryFactory(getProjectColumns(excludedColumns), excludedColumns);
    const missingColumn = getMissingIncrementalProjectColumn(result.error);
    if (!missingColumn || excludedColumns.has(missingColumn)) return result;
    excludedColumns.add(missingColumn);
  }
  return result;
}

export const REVIEW_VISIBLE_COLUMNS = [
  'id',
  'project_id',
  'user_id',
  'rating',
  'reuse_intention',
  'answers',
  'creator_reply',
  'creator_replied_at',
  'status',
  'created_at'
].join(',');

export const COIN_WALLET_COLUMNS = 'user_id,earned_coins,paid_coins,updated_at';
export const COIN_TRANSACTION_COLUMNS = 'id,user_id,amount,coin_type,type,description,reference_type,reference_id,created_at';
export const MARKETPLACE_EXCHANGE_COLUMNS = 'id,user_id,item_id,spent_coins,status,created_at';
export const MARKETPLACE_ITEM_COLUMNS = 'id,name,category,price_coins,stock_count,icon,is_active';
export const PARTICIPATION_COLUMNS = 'id,project_id,user_id,assigned_variant,status,applied_at,completed_at';
export const NOTIFICATION_COLUMNS = 'id,user_id,type,title,message,target_url,is_read,created_at';
export const SUPPORT_TICKET_COLUMNS = [
  'id',
  'user_id',
  'category',
  'subject',
  'message',
  'status',
  'admin_reply',
  'created_at',
  'updated_at',
  'resolved_at'
].join(',');

const SUPPORT_TICKET_CATEGORIES = new Set(['account', 'project', 'coin', 'bug', 'other']);
const DEFAULT_EXPLORE_PAGE_SIZE = 30;
const MAX_EXPLORE_PAGE_SIZE = 100;

export function sanitizeProjectSearchQuery(value) {
  return String(value ?? '')
    .trim()
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

const USER_MUTABLE_COLUMNS = new Set([
  'nickname',
  'bio',
  'avatar_url',
  'interests'
]);

const PROJECT_MUTABLE_COLUMNS = new Set([
  'title',
  'service_name',
  'service_desc',
  'test_notice',
  'thumbnail_url',
  'category',
  'platform',
  'is_ab_test',
  'ab_url_a',
  'ab_url_b',
  'app_playstore_url',
  'app_appstore_url',
  'external_survey_url',
  'login_required',
  'test_account_id',
  'test_account_pw',
  'privacy_items',
  'test_guide',
  'questions',
  'quizzes',
  'verification_method',
  'duration',
  'start_date',
  'end_date',
  'target_count',
  'reward_coin',
  'total_funded_cost',
  'is_reviews_public',
  'tech_tags',
  'target_persona_tags'
]);

const PROJECT_URL_COLUMNS = [
  'service_url',
  'ab_url_a',
  'ab_url_b',
  'app_playstore_url',
  'app_appstore_url',
  'external_survey_url'
];

/**
 * Keep the browser payload aligned with projects_login_configuration_valid.
 * Existing credentials are never returned by public project reads. During an
 * edit they may therefore be omitted so PostgreSQL preserves the stored pair.
 */
export function prepareProjectLoginConfiguration({
  loginRequired = false,
  testAccountId = '',
  testAccountPassword = '',
  privacyItems = '',
  preserveExistingCredentials = false
} = {}) {
  if (loginRequired !== true) {
    return {
      login_required: false,
      test_account_id: null,
      test_account_pw: null,
      privacy_items: null
    };
  }

  const accountId = typeof testAccountId === 'string' ? testAccountId.trim() : '';
  const accountPassword = typeof testAccountPassword === 'string' ? testAccountPassword.trim() : '';
  const normalizedPrivacyItems = typeof privacyItems === 'string' ? privacyItems.trim() : '';

  if (!normalizedPrivacyItems) {
    throw new Error('로그인이 필요한 테스트는 취급/수집되는 개인정보 항목을 입력해 주세요.');
  }
  if (normalizedPrivacyItems.length > 1000) {
    throw new Error('개인정보 항목은 1,000자 이하로 입력해 주세요.');
  }
  if ((accountId && !accountPassword) || (!accountId && accountPassword)) {
    throw new Error('테스트용 계정 ID와 비밀번호를 모두 입력하거나 둘 다 비워두세요.');
  }
  if (accountId.length > 200 || accountPassword.length > 200) {
    throw new Error('테스트용 계정 ID와 비밀번호는 각각 200자 이하로 입력해 주세요.');
  }

  const configuration = {
    login_required: true,
    privacy_items: normalizedPrivacyItems
  };

  if (accountId && accountPassword) {
    configuration.test_account_id = accountId;
    configuration.test_account_pw = accountPassword;
  } else if (!preserveExistingCredentials) {
    configuration.test_account_id = null;
    configuration.test_account_pw = null;
  }

  return configuration;
}

/**
 * Canonicalize user-entered URLs before they cross the Data API boundary.
 * Empty optional fields become null and schemeless hostnames receive https://.
 */
export function normalizeHttpUrl(rawValue, { required = false } = {}) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) {
    if (required) throw new Error('서비스 URL을 입력해 주세요.');
    return null;
  }

  const explicitScheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (explicitScheme && explicitScheme !== 'http' && explicitScheme !== 'https') {
    throw new Error('URL은 http:// 또는 https:// 주소만 사용할 수 있습니다.');
  }

  const candidate = explicitScheme ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('올바른 URL 형식으로 입력해 주세요.');
  }

  if (!parsed.hostname || parsed.username || parsed.password || candidate.length > 2048) {
    throw new Error('올바른 URL 형식으로 입력해 주세요.');
  }

  return parsed.toString();
}

/**
 * 검증 수단은 선택 사항이다. 선택한다면 퀴즈와 스크린샷 중 하나만 쓴다.
 */
export function prepareProjectVerification(verificationMethod, quizzes = []) {
  const method = ['quiz', 'screenshot'].includes(verificationMethod)
    ? verificationMethod
    : 'none';
  const quizList = Array.isArray(quizzes) ? quizzes : [];
  if (method !== 'quiz') {
    return { verification_method: method, quizzes: [] };
  }
  const cleanedQuizzes = quizList
    .map(quiz => ({
      question: String(quiz?.question || '').trim(),
      answer: String(quiz?.answer || '').trim()
    }))
    .filter(quiz => quiz.question)
    .slice(0, 3);
  if (cleanedQuizzes.length === 0) {
    throw new Error('검증 퀴즈 방식은 퀴즈를 최소 1개 등록해야 합니다.');
  }
  return { verification_method: 'quiz', quizzes: cleanedQuizzes };
}

export function prepareProjectTagList(values = []) {
  const normalizedTags = [];
  const seenTags = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const tag = String(value || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^#+/, '')
      .trim()
      .slice(0, 40);
    const tagKey = tag.toLocaleLowerCase();
    if (!tag || seenTags.has(tagKey)) continue;
    seenTags.add(tagKey);
    normalizedTags.push(tag);
    if (normalizedTags.length >= 10) break;
  }
  return normalizedTags;
}

export function prepareProjectPayload(projectPayload = {}, { forUpdate = false } = {}) {
  const allowedColumns = forUpdate
    ? PROJECT_MUTABLE_COLUMNS
    : new Set(['creator_id', 'service_url', ...PROJECT_MUTABLE_COLUMNS]);
  const payload = Object.fromEntries(
    Object.entries(projectPayload).filter(([column, value]) => (
      allowedColumns.has(column) && value !== undefined
    ))
  );

  for (const column of PROJECT_URL_COLUMNS) {
    if (column in payload) payload[column] = normalizeHttpUrl(payload[column]);
  }

  for (const column of ['title', 'service_name', 'service_desc']) {
    if (column in payload && typeof payload[column] === 'string') {
      payload[column] = payload[column].trim();
    }
    if (!forUpdate && !payload[column]) {
      throw new Error(`${column} 값은 비워둘 수 없습니다.`);
    }
  }

  if (!forUpdate && !payload.creator_id) {
    throw new Error('로그인 사용자 정보가 없어 프로젝트를 등록할 수 없습니다.');
  }

  if ('verification_method' in payload || 'quizzes' in payload) {
    Object.assign(payload, prepareProjectVerification(
      payload.verification_method,
      payload.quizzes
    ));
  }

  for (const tagColumn of ['tech_tags', 'target_persona_tags']) {
    if (tagColumn in payload) payload[tagColumn] = prepareProjectTagList(payload[tagColumn]);
  }

  if (!forUpdate) {
    Object.assign(payload, prepareProjectLoginConfiguration({
      loginRequired: payload.login_required === true,
      testAccountId: payload.test_account_id,
      testAccountPassword: payload.test_account_pw,
      privacyItems: payload.privacy_items
    }));
  } else if (payload.login_required === false) {
    payload.test_account_id = null;
    payload.test_account_pw = null;
    payload.privacy_items = null;
  }

  return payload;
}

export function sanitizeUserProfileUpdates(updateFields = {}) {
  return Object.fromEntries(
    Object.entries(updateFields).filter(([column, value]) => (
      USER_MUTABLE_COLUMNS.has(column) && value !== undefined
    ))
  );
}

export function prepareProfileLinks(values = []) {
  if (!Array.isArray(values)) throw new Error('SNS 링크 목록 형식이 올바르지 않습니다.');

  const normalized = values
    .map(value => normalizeHttpUrl(value))
    .filter(Boolean);
  const uniqueLinks = [...new Set(normalized)];

  if (uniqueLinks.length > 5) throw new Error('SNS 링크는 최대 5개까지 등록할 수 있습니다.');
  return uniqueLinks;
}

export function prepareSupportTicketPayload(ticket = {}) {
  const category = typeof ticket.category === 'string' ? ticket.category.trim() : 'other';
  const subject = typeof ticket.subject === 'string' ? ticket.subject.trim() : '';
  const message = typeof ticket.message === 'string' ? ticket.message.trim() : '';

  if (!SUPPORT_TICKET_CATEGORIES.has(category)) {
    throw new Error('문의 유형이 올바르지 않습니다.');
  }
  if (!subject || subject.length > 100) {
    throw new Error('문의 제목은 1자 이상 100자 이하로 입력해 주세요.');
  }
  if (!message || message.length > 2000) {
    throw new Error('문의 내용은 1자 이상 2,000자 이하로 입력해 주세요.');
  }

  return { category, subject, message };
}

/**
 * 스크린샷 증빙은 외부 링크와 첨부 이미지(data URL)를 모두 받는다.
 */
export function normalizeScreenshotEvidence(rawValue) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) return null;

  if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) {
    if (value.length > 3000000) {
      throw new Error('스크린샷 이미지 용량이 너무 큽니다. 2MB 이하로 첨부해 주세요.');
    }
    return value;
  }
  return normalizeHttpUrl(value);
}

export function prepareReviewRpcPayload(review = {}) {
  const projectId = typeof review.projectId === 'string' ? review.projectId.trim() : '';
  const rating = Number(review.rating);
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('리뷰를 등록할 프로젝트 ID가 올바르지 않습니다.');
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('별점은 1점부터 5점까지 입력할 수 있습니다.');
  }

  const answers = review.answers && typeof review.answers === 'object' ? review.answers : {};
  const quizAnswers = review.quizAnswers && typeof review.quizAnswers === 'object' ? review.quizAnswers : {};
  const screenshotUrl = normalizeScreenshotEvidence(review.screenshotUrl);
  return {
    p_project_id: projectId,
    p_rating: rating,
    p_reuse_intention: review.reuseIntention !== false,
    p_answers: answers,
    p_quiz_answers: quizAnswers,
    p_is_quiz_passed: review.isQuizPassed !== false,
    p_screenshot_url: screenshotUrl
  };
}

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
      .select(USER_PUBLIC_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
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
    const safeUpdateFields = sanitizeUserProfileUpdates(updateFields);
    if (Object.keys(safeUpdateFields).length === 0) return null;

    const { data, error } = await supabase
      .from('users')
      .update(safeUpdateFields)
      .eq('id', userId)
      .select(USER_PUBLIC_COLUMNS)
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
  const { category, platform, searchQuery, sortBy, page = 0, pageSize } = options;
  const safePage = Math.max(0, Math.trunc(Number(page) || 0));
  const hasPagination = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0;
  const safePageSize = Math.min(
    MAX_EXPLORE_PAGE_SIZE,
    Math.max(1, Math.trunc(Number(pageSize) || DEFAULT_EXPLORE_PAGE_SIZE))
  );
  const searchTerm = sanitizeProjectSearchQuery(searchQuery);
  try {
    let query = supabase
      .from('projects')
      .select(`
        ${PROJECT_CARD_COLUMNS},
        users (${USER_CARD_COLUMNS})
      `)
      .eq('is_ab_test', false)
      .neq('category', 'abtest');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }
    if (searchTerm) {
      query = query.ilike('search_text', `%${searchTerm}%`);
    }

    if (sortBy === 'reward') {
      query = query
        .order('reward_coin', { ascending: false })
        .order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
      query = query
        .order('current_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.order('id', { ascending: false });
    if (hasPagination) {
      query = query.range(
        safePage * safePageSize,
        ((safePage + 1) * safePageSize) - 1
      );
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
    const fetchProject = columns => supabase
      .from('projects')
      .select(`
        ${columns},
        users (${USER_DETAIL_COLUMNS})
      `)
      .eq('id', projectId)
      .single();
    const { data, error } = await runProjectQueryWithColumnFallback(fetchProject);
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
      const fetchRegistered = columns => supabase
        .from('projects')
        .select(columns)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });
      const { data, error } = await runProjectQueryWithColumnFallback(fetchRegistered);
      if (error) throw error;
      return data || [];
    } else if (type === 'participated') {
      const fetchParticipated = columns => supabase
        .from('participations')
        .select(`
          ${PARTICIPATION_COLUMNS},
          projects (${columns}, users(${USER_CARD_COLUMNS}))
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });
      const { data, error } = await runProjectQueryWithColumnFallback(fetchParticipated);
      if (error) throw error;
      return (data || []).map(participation => {
        if (!participation.projects) return null;
        return {
          ...participation.projects,
          participation_status: participation.status,
          participation_completed_at: participation.completed_at
        };
      }).filter(Boolean);
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
  if (!supabase) throw new Error('Supabase 연결이 설정되지 않았습니다.');
  const safePayload = prepareProjectPayload(projectPayload);
  const { data, error } = await runProjectQueryWithColumnFallback((columns, excludedColumns) => {
    const compatiblePayload = { ...safePayload };
    excludedColumns.forEach(column => delete compatiblePayload[column]);
    return supabase
      .from('projects')
      .insert([compatiblePayload])
      .select(columns)
      .single();
  });
  if (error) throw error;
  return data;
}

/**
 * Read private profile fields for the active session only.
 * The SECURITY DEFINER RPC checks auth.uid() server-side so email/contact data
 * never has to be granted through the public profile SELECT policy.
 */
export async function fetchMyPrivateProfile() {
  if (!supabase) throw new Error('Supabase 연결이 설정되지 않았습니다.');
  const { data, error } = await supabase
    .rpc('get_my_private_profile')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyPrivateProfile({ nickname, bio = '', interests = [], snsLinks = [] } = {}) {
  if (!supabase) throw new Error('Supabase 연결이 설정되지 않았습니다.');
  const normalizedLinks = prepareProfileLinks(snsLinks);
  const { data, error } = await supabase
    .rpc('update_my_private_profile', {
      p_nickname: typeof nickname === 'string' ? nickname.trim() : '',
      p_bio: typeof bio === 'string' ? bio.trim() : '',
      p_interests: Array.isArray(interests) ? interests : [],
      p_sns_links: normalizedLinks
    })
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update existing project
 */
export async function updateProjectRecord(projectId, updateFields) {
  if (!supabase || !projectId) throw new Error('수정할 프로젝트 정보가 없습니다.');
  const safeUpdateFields = prepareProjectPayload(updateFields, { forUpdate: true });
  if (Object.keys(safeUpdateFields).length === 0) {
    throw new Error('수정할 프로젝트 항목이 없습니다.');
  }
  const { data, error } = await runProjectQueryWithColumnFallback((columns, excludedColumns) => {
    const compatibleUpdateFields = { ...safeUpdateFields };
    excludedColumns.forEach(column => delete compatibleUpdateFields[column]);
    return supabase
      .from('projects')
      .update(compatibleUpdateFields)
      .eq('id', projectId)
      .select(columns)
      .single();
  });
  if (error) throw error;
  return data;
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
      .select('id,project_id,user_id,assigned_variant,status,applied_at,completed_at')
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
 * Atomically apply for a project. Ownership and A/B assignment are decided by
 * the database from the active auth session.
 */
export async function applyParticipation(projectId) {
  if (!supabase || !projectId) throw new Error('참여할 프로젝트 정보가 없습니다.');
  const { data, error } = await supabase.rpc('apply_to_project', { p_project_id: projectId });
  if (error) throw error;
  return data;
}

/**
 * Atomically submit one review, complete participation, and receive the
 * server-priced reward.
 */
export async function submitProjectReview(reviewPayload) {
  if (!supabase) throw new Error('Supabase 연결이 설정되지 않았습니다.');
  const rpcPayload = prepareReviewRpcPayload(reviewPayload);
  const { data, error } = await supabase.rpc('submit_project_review', rpcPayload);
  if (error) throw error;
  return data;
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
      .select(REVIEW_VISIBLE_COLUMNS)
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
        ${REVIEW_VISIBLE_COLUMNS},
        users (${USER_CARD_COLUMNS})
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
      .select(COIN_WALLET_COLUMNS)
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
      .select(COIN_TRANSACTION_COLUMNS)
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
 * Fetch the active user's marketplace exchange history.
 * Voucher codes intentionally stay out of this general-purpose view.
 */
export async function fetchUserExchanges(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('marketplace_exchanges')
      .select(MARKETPLACE_EXCHANGE_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[dataService] fetchUserExchanges failed:', err.message);
    return [];
  }
}

/**
 * Atomically exchange an item at the server-side price and stock.
 */
export async function exchangeMarketplaceItem(itemId) {
  if (!supabase || !itemId) throw new Error('교환할 상품 정보가 없습니다.');
  const { data, error } = await supabase.rpc('exchange_marketplace_item', { p_item_id: itemId });
  if (error) throw error;
  return data;
}

/**
 * Fetch marketplace items
 */
export async function fetchMarketplaceItems() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(MARKETPLACE_ITEM_COLUMNS)
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
    const fetchScraps = columns => supabase
      .from('scraps')
      .select(`
        id,
        user_id,
        project_id,
        created_at,
        projects (${columns}, users(${USER_CARD_COLUMNS}))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const { data, error } = await runProjectQueryWithColumnFallback(fetchScraps);
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
 * Customer support inquiries are owner-scoped by RLS.
 */
export async function fetchMySupportTickets(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('support_tickets')
    .select(SUPPORT_TICKET_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSupportTicket(userId, ticket) {
  if (!supabase || !userId) throw new Error('로그인 후 문의를 등록할 수 있습니다.');
  const safeTicket = prepareSupportTicketPayload(ticket);
  const { data, error } = await supabase
    .from('support_tickets')
    .insert([{ user_id: userId, ...safeTicket }])
    .select(SUPPORT_TICKET_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Notifications operations
 */
export async function fetchUserNotifications(userId) {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
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
        target_url: targetUrl || null,
        is_read: false
      }])
      .select(NOTIFICATION_COLUMNS)
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


