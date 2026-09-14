import { normalizeAccountState } from './accountRouting.js';

const COMPLETE_ONBOARDING_RPC = 'complete_my_onboarding';

export const ONBOARDING_LIMITS = Object.freeze({
  nicknameMin: 1,
  nicknameMax: 20,
  bioMax: 50,
  interestsMin: 1,
  interestsMax: 5,
  interestMax: 50,
  snsLinksMax: 5,
  snsLinkMax: 2048
});

function requireRpcClient(client) {
  if (typeof client?.rpc !== 'function') {
    throw new Error('Supabase RPC client is not configured.');
  }
}

function createOnboardingError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasCaseInsensitiveDuplicate(values) {
  const seen = new Set();
  return values.some(value => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

/**
 * Mirrors the validation inside complete_my_onboarding so the form can report
 * a specific Korean message instead of surfacing a raw Postgres error.
 */
export function prepareOnboardingPayload(input = {}) {
  const nickname = toTrimmedString(input.nickname);
  if (
    nickname.length < ONBOARDING_LIMITS.nicknameMin
    || nickname.length > ONBOARDING_LIMITS.nicknameMax
  ) {
    throw createOnboardingError(
      'onboarding_nickname_invalid',
      `닉네임은 1자 이상 ${ONBOARDING_LIMITS.nicknameMax}자 이하로 입력해 주세요.`
    );
  }

  const bio = toTrimmedString(input.bio);
  if (bio.length > ONBOARDING_LIMITS.bioMax) {
    throw createOnboardingError(
      'onboarding_bio_invalid',
      `한 줄 소개는 ${ONBOARDING_LIMITS.bioMax}자 이하로 입력해 주세요.`
    );
  }

  const interests = (Array.isArray(input.interests) ? input.interests : [])
    .map(toTrimmedString)
    .filter(Boolean);
  if (
    interests.length < ONBOARDING_LIMITS.interestsMin
    || interests.length > ONBOARDING_LIMITS.interestsMax
  ) {
    throw createOnboardingError(
      'onboarding_interests_invalid',
      `관심분야는 1개 이상 ${ONBOARDING_LIMITS.interestsMax}개 이하로 선택해 주세요.`
    );
  }
  if (interests.some(interest => interest.length > ONBOARDING_LIMITS.interestMax)) {
    throw createOnboardingError(
      'onboarding_interests_invalid',
      `관심분야는 각 ${ONBOARDING_LIMITS.interestMax}자 이하만 등록할 수 있습니다.`
    );
  }
  if (hasCaseInsensitiveDuplicate(interests)) {
    throw createOnboardingError(
      'onboarding_interests_invalid',
      '관심분야가 중복되었습니다. 서로 다른 항목을 선택해 주세요.'
    );
  }

  // 빈 입력칸은 등록하지 않은 것으로 보고 조용히 버린다.
  const snsLinks = (Array.isArray(input.snsLinks) ? input.snsLinks : [])
    .map(toTrimmedString)
    .filter(Boolean);
  if (snsLinks.length > ONBOARDING_LIMITS.snsLinksMax) {
    throw createOnboardingError(
      'onboarding_sns_links_invalid',
      `SNS 링크는 최대 ${ONBOARDING_LIMITS.snsLinksMax}개까지 등록할 수 있습니다.`
    );
  }
  if (snsLinks.some(link => !/^https?:\/\/\S+$/i.test(link))) {
    throw createOnboardingError(
      'onboarding_sns_links_invalid',
      'SNS 링크는 http:// 또는 https:// 주소만 등록할 수 있습니다.'
    );
  }
  if (snsLinks.some(link => link.length > ONBOARDING_LIMITS.snsLinkMax)) {
    throw createOnboardingError(
      'onboarding_sns_links_invalid',
      'SNS 링크 주소가 너무 깁니다.'
    );
  }
  if (hasCaseInsensitiveDuplicate(snsLinks)) {
    throw createOnboardingError(
      'onboarding_sns_links_invalid',
      '같은 SNS 링크가 중복되었습니다.'
    );
  }

  const acceptedDocumentIds = [...new Set(
    (Array.isArray(input.acceptedDocumentIds) ? input.acceptedDocumentIds : [])
      .map(toTrimmedString)
      .filter(Boolean)
  )];

  return {
    p_nickname: nickname,
    p_interests: interests,
    p_bio: bio,
    p_sns_links: snsLinks,
    p_accepted_document_ids: acceptedDocumentIds
  };
}

/**
 * Completes onboarding and returns the refreshed account routing state so the
 * caller can continue to the next step without a second round trip.
 */
export async function completeMyOnboarding(client, input = {}) {
  requireRpcClient(client);

  const rpcPayload = prepareOnboardingPayload(input);
  const { data, error } = await client.rpc(COMPLETE_ONBOARDING_RPC, rpcPayload);
  if (error) throw error;

  return normalizeAccountState(data);
}
