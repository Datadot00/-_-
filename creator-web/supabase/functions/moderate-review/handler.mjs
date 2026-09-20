import { normalizePayload, collectText, ReviewError, POLICY_VERSION } from './policy.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
};

async function readPayload(request) {
  // Bound actual bytes even if the caller omits or lies about Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ReviewError('REVIEW_INVALID_INPUT', 400);
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3100000) {
      await reader.cancel();
      throw new ReviewError('REVIEW_INVALID_INPUT', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return normalizePayload(JSON.parse(new TextDecoder().decode(bytes))); }
  catch (error) {
    if (error instanceof ReviewError) throw error;
    throw new ReviewError('REVIEW_INVALID_INPUT', 400);
  }
}

export function createReviewHandler({ authenticate, beginAttempt, finishAttempt, submitReview, moderate }) {
  return async request => {
    const respond = (body, status = 200) => Response.json(body, { status, headers: corsHeaders });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return respond({ code: 'METHOD_NOT_ALLOWED' }, 405);
    let attemptId;
    let finished = false;
    try {
      const authorization = request.headers.get('authorization') || '';
      if (!/^Bearer \S+$/i.test(authorization)) throw new ReviewError('AUTH_REQUIRED', 401);
      const user = await authenticate(authorization);
      if (!user?.id) throw new ReviewError('AUTH_REQUIRED', 401);
      const payload = await readPayload(request);
      collectText(payload.p_answers); // Bound nesting before reserving an attempt.
      attemptId = await beginAttempt(user.id, payload, POLICY_VERSION);
      const result = await moderate(payload.p_answers);
      await finishAttempt(attemptId, result);
      finished = true;
      if (result.decision !== 'pass') {
        throw new ReviewError(result.decision === 'revise' ? 'REVIEW_MODERATION_REJECTED' : 'REVIEW_MODERATION_UNCERTAIN', 422, result.categories);
      }
      const data = await submitReview(authorization, payload, attemptId);
      return respond(data);
    } catch (error) {
      if (attemptId && !finished) {
        try { await finishAttempt(attemptId, { decision: 'error', categories: [], model: 'unavailable' }); } catch { /* retry remains blocked */ }
      }
      const known = error instanceof ReviewError;
      return respond({
        code: known ? error.code : 'REVIEW_MODERATION_UNAVAILABLE',
        categories: known ? error.categories : [],
        ...(attemptId ? { request_id: attemptId } : {})
      }, known ? error.status : 503);
    }
  };
}
