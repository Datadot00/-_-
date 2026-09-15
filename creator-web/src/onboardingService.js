import { normalizeAccountState } from './accountRouting.js';

const COMPLETE_ONBOARDING_RPC = 'complete_my_onboarding';

export const ONBOARDING_LIMITS = Object.freeze({
  nicknameMin: 1,
  nicknameMax: 20,
  bioMax: 50,
  jobGroupMax: 50,
  interestsMin: 1,
  interestsMax: 5,
  interestMax: 50,
  toolTagsMax: 10,
  toolTagMax: 40,
  snsLinksMax: 5,
  snsLinkMax: 2048
});

/**
 * 성별·연령대·기기는 자유 입력이 아니라 정해진 값만 저장하므로,
 * DB CHECK 제약과 같은 목록을 한곳에 두고 화면과 검증이 함께 참조한다.
 */
export const ONBOARDING_GENDERS = Object.freeze(['male', 'female']);
export const ONBOARDING_AGE_RANGES = Object.freeze([
  '10s', '20s', '30s', '40s', '50s', '60s_plus'
]);
export const ONBOARDING_DEVICES = Object.freeze(['ios', 'android', 'mac', 'windows']);

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
 * 단계별 위저드가 해당 단계의 입력만 즉시 검증할 수 있도록 필드 단위로 나눠 둔다.
 * prepareOnboardingPayload 가 이 함수들을 그대로 조합하므로 규칙은 한 곳에만 존재한다.
 */
export function validateNickname(value) {
  const nickname = toTrimmedString(value);
  if (
    nickname.length < ONBOARDING_LIMITS.nicknameMin
    || nickname.length > ONBOARDING_LIMITS.nicknameMax
  ) {
    throw createOnboardingError(
      'onboarding_nickname_invalid',
      `닉네임은 1자 이상 ${ONBOARDING_LIMITS.nicknameMax}자 이하로 입력해 주세요.`
    );
  }
  return nickname;
}

export function validateBio(value) {
  const bio = toTrimmedString(value);
  if (bio.length > ONBOARDING_LIMITS.bioMax) {
    throw createOnboardingError(
      'onboarding_bio_invalid',
      `한 줄 소개는 ${ONBOARDING_LIMITS.bioMax}자 이하로 입력해 주세요.`
    );
  }
  return bio;
}

/** 직업군은 선택 입력이라 빈 값을 그대로 허용하고, 길이만 서버와 같은 기준으로 본다. */
export function validateJobGroup(value) {
  const jobGroup = toTrimmedString(value);
  if (jobGroup.length > ONBOARDING_LIMITS.jobGroupMax) {
    throw createOnboardingError(
      'onboarding_job_group_invalid',
      `직업군은 ${ONBOARDING_LIMITS.jobGroupMax}자 이하로 입력해 주세요.`
    );
  }
  return jobGroup;
}

export function validateGender(value) {
  const gender = toTrimmedString(value);
  if (!ONBOARDING_GENDERS.includes(gender)) {
    throw createOnboardingError('onboarding_gender_invalid', '성별을 선택해 주세요.');
  }
  return gender;
}

export function validateAgeRange(value) {
  const ageRange = toTrimmedString(value);
  if (!ONBOARDING_AGE_RANGES.includes(ageRange)) {
    throw createOnboardingError('onboarding_age_range_invalid', '연령대를 선택해 주세요.');
  }
  return ageRange;
}

/** 주 사용기기는 선택 항목이라 아무것도 고르지 않은 빈 배열을 그대로 허용한다. */
export function validateDevices(value) {
  const devices = (Array.isArray(value) ? value : [])
    .map(toTrimmedString)
    .filter(Boolean);

  if (devices.some(device => !ONBOARDING_DEVICES.includes(device))) {
    throw createOnboardingError(
      'onboarding_devices_invalid',
      '주 사용기기는 목록에 있는 기기만 선택할 수 있습니다.'
    );
  }
  if (hasCaseInsensitiveDuplicate(devices)) {
    throw createOnboardingError(
      'onboarding_devices_invalid',
      '같은 기기가 중복 선택되었습니다.'
    );
  }
  return devices;
}

/**
 * 모집글의 기술 태그(projects.tech_tags)와 같은 형태로 다듬는다.
 * 같은 규칙이어야 "이 툴을 써 본 테스터" 조건으로 서로 맞춰 볼 수 있다.
 */
export function normalizeToolTag(value) {
  return String(value ?? '')
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ONBOARDING_LIMITS.toolTagMax);
}

/** 다뤄본 툴·관심 기술은 선택 항목이라 아무것도 없는 빈 배열을 그대로 허용한다. */
export function validateToolTags(value) {
  const toolTags = (Array.isArray(value) ? value : [])
    .map(normalizeToolTag)
    .filter(Boolean);

  if (toolTags.length > ONBOARDING_LIMITS.toolTagsMax) {
    throw createOnboardingError(
      'onboarding_tool_tags_invalid',
      `툴·기술 태그는 최대 ${ONBOARDING_LIMITS.toolTagsMax}개까지 추가할 수 있습니다.`
    );
  }
  if (hasCaseInsensitiveDuplicate(toolTags)) {
    throw createOnboardingError(
      'onboarding_tool_tags_invalid',
      '같은 툴·기술 태그가 중복되었습니다.'
    );
  }
  return toolTags;
}

export function validateInterests(value) {
  const interests = (Array.isArray(value) ? value : [])
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
  return interests;
}

export function validateSnsLinks(value) {
  // 빈 입력칸은 등록하지 않은 것으로 보고 조용히 버린다.
  const snsLinks = (Array.isArray(value) ? value : [])
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
  return snsLinks;
}

/**
 * Mirrors the validation inside complete_my_onboarding so the form can report
 * a specific Korean message instead of surfacing a raw Postgres error.
 */
export function prepareOnboardingPayload(input = {}) {
  // 기존 단일 폼과 같은 순서로 검사해 먼저 걸리는 오류 문구가 달라지지 않게 한다.
  const nickname = validateNickname(input.nickname);
  const bio = validateBio(input.bio);
  const jobGroup = validateJobGroup(input.jobGroup);
  const gender = validateGender(input.gender);
  const ageRange = validateAgeRange(input.ageRange);
  const devices = validateDevices(input.devices);
  const toolTags = validateToolTags(input.toolTags);
  const interests = validateInterests(input.interests);
  const snsLinks = validateSnsLinks(input.snsLinks);

  return {
    p_nickname: nickname,
    p_interests: interests,
    p_bio: bio,
    p_job_group: jobGroup,
    p_gender: gender,
    p_age_range: ageRange,
    p_devices: devices,
    p_tool_tags: toolTags,
    p_sns_links: snsLinks
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
