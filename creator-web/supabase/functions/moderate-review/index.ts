import { createClient } from 'npm:@supabase/supabase-js@2.115.0';
import { createReviewHandler } from './handler.mjs';
import { moderateAnswers, DEFAULT_MODEL, ReviewError } from './policy.mjs';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function userClient(authorization: string) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function databaseError(error: { message?: string }) {
  const message = error.message || '';
  if (message.includes('review moderation rate limit')) return new ReviewError('REVIEW_MODERATION_RATE_LIMIT', 429);
  if (message.includes('already submitted')) return new ReviewError('PART_ALREADY_APPLIED', 409);
  if (message.includes('active participation not found')) return new ReviewError('REVIEW_PARTICIPATION_REQUIRED', 403);
  if (/quiz answers|quiz answer|quiz configuration/.test(message)) return new ReviewError('PART_QUIZ_FAILED', 400);
  if (message.includes('screenshot is required')) return new ReviewError('PART_SCREENSHOT_REQUIRED', 400);
  if (message.includes('screenshot URL is invalid')) return new ReviewError('PART_SCREENSHOT_TOO_LARGE', 400);
  return new ReviewError('REVIEW_MODERATION_UNAVAILABLE');
}

Deno.serve(createReviewHandler({
  async authenticate(authorization: string) {
    const { data, error } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (error) throw new ReviewError('AUTH_REQUIRED', 401);
    return data.user;
  },
  async beginAttempt(userId: string, payload: object, policyVersion: string) {
    const { data, error } = await admin.rpc('begin_review_moderation', {
      p_user_id: userId, p_payload: payload, p_policy_version: policyVersion
    });
    if (error) throw databaseError(error);
    return data;
  },
  async finishAttempt(attemptId: string, result: { decision: string; categories: string[]; model: string }) {
    const { error } = await admin.rpc('finish_review_moderation', {
      p_attempt_id: attemptId, p_decision: result.decision, p_categories: result.categories, p_model: result.model
    });
    if (error) throw databaseError(error);
  },
  async submitReview(authorization: string, payload: object, attemptId: string) {
    const { data, error } = await userClient(authorization).rpc('submit_project_review', {
      ...payload, p_moderation_id: attemptId
    });
    if (error) throw databaseError(error);
    return data;
  },
  moderate: (answers: object) => moderateAnswers(answers, {
    apiKey: Deno.env.get('POTENS_API_KEY'),
    model: Deno.env.get('POTENS_REVIEW_MODEL') || DEFAULT_MODEL
  })
}));
