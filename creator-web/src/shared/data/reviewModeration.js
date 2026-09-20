const CATEGORY_MESSAGES = {
  profanity: '욕설을 삭제하거나 다른 표현으로 수정해 주세요.',
  sexual: '성적 발언을 삭제하거나 수정해 주세요.',
  phone: '휴대전화 번호를 삭제해 주세요.',
  external_solicitation: '외부 방문·가입·연락을 유도하는 내용을 삭제해 주세요. 개별 제안은 제작자가 공개한 SNS의 DM을 이용해 주세요.'
};

export function reviewModerationError(result = {}) {
  const messages = {
    REVIEW_MODERATION_UNAVAILABLE: '검수를 완료하지 못했습니다. 작성 내용은 유지되며, 잠시 후 다시 제출해 주세요.',
    REVIEW_MODERATION_UNCERTAIN: '자동 검수에서 판단하기 어려운 표현이 있습니다. 문맥이 명확하게 수정하거나 고객센터에 문의해 주세요.',
    REVIEW_MODERATION_RATE_LIMIT: '검수 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    REVIEW_INVALID_INPUT: '입력 내용을 확인해 주세요. 리뷰와 문항 답변은 합계 약 12,000자 이내로 작성해 주세요.',
    REVIEW_PARTICIPATION_REQUIRED: '테스트에 먼저 참여한 뒤 리뷰를 제출해 주세요.'
  };
  const categories = Array.isArray(result.categories) ? result.categories.filter(code => CATEGORY_MESSAGES[code]) : [];
  const message = result.code === 'REVIEW_MODERATION_REJECTED'
    ? (categories.map(code => CATEGORY_MESSAGES[code]).join(' ') || '검수 기준에 맞게 내용을 수정해 주세요.')
    : messages[result.code];
  const error = new Error(message || '리뷰를 제출하지 못했습니다. 다시 시도해 주세요.');
  error.code = result.code || 'REVIEW_MODERATION_UNAVAILABLE';
  error.isReviewModerationError = error.code.startsWith('REVIEW_');
  error.requestId = typeof result.request_id === 'string' && /^[a-f0-9-]{36}$/i.test(result.request_id) ? result.request_id : '';
  return error;
}

export async function invokeModeratedReview(client, payload) {
  const { data, error } = await client.functions.invoke('moderate-review', { body: payload });
  if (error) {
    let details;
    try { details = await error.context?.json(); } catch { /* network/non-JSON error */ }
    throw reviewModerationError(details?.code ? details : { code: 'REVIEW_MODERATION_UNAVAILABLE' });
  }
  if (data?.code) throw reviewModerationError(data);
  if (!data?.review_id) throw reviewModerationError();
  return data;
}
