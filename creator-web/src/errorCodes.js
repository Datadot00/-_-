/**
 * Don Dwae (돈 돼?) 서비스 통합 에러코드 및 한국어 에러 메시지 사전
 * 
 * 에러코드 체계:
 * - AUTH-xxx: 인증, 로그인, 회원가입, 세션
 * - PRJ-xxx:  프로젝트 등록, 수정, 삭제, 조회
 * - PART-xxx: 테스트 참여, 퀴즈 검증, 리뷰 작성, 스크린샷
 * - COIN-xxx: 돼지코인 결제, 적립, 상점 교환
 * - USER-xxx: 프로필 설정, 고객센터 문의
 * - SYS-xxx:  네트워크, 데이터베이스, 시스템 일반 오류
 */

export const ERROR_CODES = {
  // --- AUTH (인증/계정) ---
  AUTH_INVALID_CREDENTIALS: { id: 'AUTH-001', message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  AUTH_EMAIL_NOT_CONFIRMED: { id: 'AUTH-002', message: '이메일 인증을 먼저 완료해 주세요.' },
  AUTH_USER_ALREADY_EXISTS: { id: 'AUTH-003', message: '이미 가입된 이메일 계정입니다. 로그인해 주세요.' },
  AUTH_WEAK_PASSWORD: { id: 'AUTH-004', message: '비밀번호는 6자 이상이어야 합니다.' },
  AUTH_SESSION_EXPIRED: { id: 'AUTH-005', message: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.' },
  AUTH_RATE_LIMIT: { id: 'AUTH-006', message: '요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.' },
  AUTH_OTP_EXPIRED: { id: 'AUTH-007', message: '인증 링크가 만료되었거나 올바르지 않습니다. 새 링크를 요청해 주세요.' },
  AUTH_REQUIRED: { id: 'AUTH-008', message: '로그인이 필요한 서비스입니다.' },
  AUTH_NOT_CONFIGURED: { id: 'AUTH-009', message: '인증 서비스가 준비되지 않았습니다. 관리자에게 문의해 주세요.' },
  AUTH_VALIDATION_FAILED: { id: 'AUTH-010', message: '입력하신 계정 정보를 다시 확인해 주세요.' },
  AUTH_SAME_PASSWORD: { id: 'AUTH-011', message: '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.' },

  // --- PRJ (프로젝트 등록/관리) ---
  PRJ_REQUIRED_FIELD_MISSING: { id: 'PRJ-001', message: '프로젝트 필수 입력 항목을 모두 작성해 주세요.' },
  PRJ_INVALID_URL: { id: 'PRJ-002', message: '올바른 웹사이트 주소(https://)를 입력해 주세요.' },
  PRJ_ACCOUNT_INFO_INCOMPLETE: { id: 'PRJ-003', message: '테스트용 계정 ID와 비밀번호를 모두 입력하거나 둘 다 비워두세요.' },
  PRJ_PERMISSION_DENIED: { id: 'PRJ-004', message: '해당 프로젝트를 수정하거나 삭제할 권한이 없습니다.' },
  PRJ_NOT_FOUND: { id: 'PRJ-005', message: '프로젝트를 찾을 수 없거나 이미 삭제되었습니다.' },
  PRJ_INVALID_RECRUIT_CONFIG: { id: 'PRJ-006', message: '모집 인원과 마감 일정을 올바르게 지정해 주세요.' },
  PRJ_SAVE_FAILED: { id: 'PRJ-007', message: '프로젝트 저장에 실패했습니다. 다시 시도해 주세요.' },

  // --- PART (참여/미션/리뷰) ---
  PART_ALREADY_APPLIED: { id: 'PART-001', message: '이미 참여를 완료한 테스트입니다.' },
  PART_CREATOR_CANNOT_APPLY: { id: 'PART-002', message: '본인이 등록한 프로젝트에는 참여할 수 없습니다.' },
  PART_RECRUITMENT_CLOSED: { id: 'PART-003', message: '모집이 마감되었거나 종료된 테스트입니다.' },
  PART_QUIZ_FAILED: { id: 'PART-004', message: '검증 퀴즈 답변이 올바르지 않거나 입력되지 않았습니다.' },
  PART_REVIEW_VALIDATION_FAILED: { id: 'PART-005', message: '리뷰 별점 및 필수 질문의 답변을 작성해 주세요.' },
  PART_SCREENSHOT_TOO_LARGE: { id: 'PART-006', message: '스크린샷 이미지는 2MB 이하 파일만 업로드할 수 있습니다.' },
  PART_SUBMISSION_FAILED: { id: 'PART-007', message: '참여 또는 리뷰 제출 처리에 실패했습니다.' },

  // --- COIN (돼지코인/상점) ---
  COIN_INSUFFICIENT: { id: 'COIN-001', message: '보유하신 돼지코인이 부족합니다.' },
  COIN_ITEM_NOT_FOUND: { id: 'COIN-002', message: '존재하지 않거나 품절된 교환 상품입니다.' },
  COIN_TRANSACTION_FAILED: { id: 'COIN-003', message: '돼지코인 결제 및 환전 처리 중 오류가 발생했습니다.' },

  // --- USER (프로필/고객센터) ---
  USER_INVALID_LINKS: { id: 'USER-001', message: 'SNS 링크는 최대 5개까지 유효한 URL로 입력할 수 있습니다.' },
  USER_PROFILE_SAVE_FAILED: { id: 'USER-002', message: '프로필 정보를 저장하지 못했습니다.' },
  USER_INVALID_TICKET: { id: 'USER-003', message: '문의 제목과 내용을 올바르게 입력해 주세요.' },
  USER_TICKET_SAVE_FAILED: { id: 'USER-004', message: '고객센터 문의 등록에 실패했습니다.' },

  // --- SYS (시스템/네트워크) ---
  SYS_NETWORK_ERROR: { id: 'SYS-001', message: '네트워크 연결이 원활하지 않습니다. 인터넷 상태를 확인해 주세요.' },
  SYS_DB_PERMISSION_ERROR: { id: 'SYS-002', message: '데이터베이스 접근 권한이 없습니다. 다시 로그인해 주세요.' },
  SYS_DATA_CONFLICT: { id: 'SYS-003', message: '일시적인 데이터 충돌이 발생했습니다. 다시 시도해 주세요.' },
  SYS_UNKNOWN: { id: 'SYS-999', message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
};

/**
 * 영문 Supabase Auth / PostgREST 코드 및 메시지 정규화 매핑 규칙
 */
const ERROR_RULES = [
  // Network / Fetch
  { pattern: /fetch|network|failed to fetch|NetworkError|load failed/i, code: 'SYS_NETWORK_ERROR' },

  // Auth codes / patterns
  { pattern: /invalid_credentials|Invalid login credentials/i, code: 'AUTH_INVALID_CREDENTIALS' },
  { pattern: /email_not_confirmed|Email not confirmed/i, code: 'AUTH_EMAIL_NOT_CONFIRMED' },
  { pattern: /user_already_exists|email_exists|User already registered/i, code: 'AUTH_USER_ALREADY_EXISTS' },
  { pattern: /weak_password|Password should be at least 6 characters/i, code: 'AUTH_WEAK_PASSWORD' },
  { pattern: /same_password/i, code: 'AUTH_SAME_PASSWORD' },
  { pattern: /rate_limit|over_email_send_rate_limit|over_request_rate_limit|too many requests/i, code: 'AUTH_RATE_LIMIT' },
  { pattern: /otp_expired|access_denied|flow_state_expired|token has expired/i, code: 'AUTH_OTP_EXPIRED' },
  { pattern: /session_expired|session_missing|JWT expired|invalid JWT/i, code: 'AUTH_SESSION_EXPIRED' },
  { pattern: /auth_not_configured/i, code: 'AUTH_NOT_CONFIGURED' },
  { pattern: /auth_required|로그인이 필요/i, code: 'AUTH_REQUIRED' },

  // Database / Postgres / PostgREST
  { pattern: /row-level security|permission denied|PGRST301/i, code: 'SYS_DB_PERMISSION_ERROR' },
  { pattern: /duplicate key|unique constraint/i, code: 'SYS_DATA_CONFLICT' },
  { pattern: /PGRST116|no rows returned/i, code: 'PRJ_NOT_FOUND' },

  // Coins / Wallet
  { pattern: /insufficient_funds|not enough coin|코인이 부족/i, code: 'COIN_INSUFFICIENT' },

  // Participation
  { pattern: /already_applied|이미 참여/i, code: 'PART_ALREADY_APPLIED' },
  { pattern: /creator_cannot_apply/i, code: 'PART_CREATOR_CANNOT_APPLY' },
  { pattern: /closed_project|모집이 마감/i, code: 'PART_RECRUITMENT_CLOSED' }
];

/**
 * 모든 에러 객체/문자열을 한국어 표준 메시지와 에러코드 ID로 변환합니다.
 * @param {Error|Object|string} error - 원시 에러 객체 또는 문자열
 * @param {string} [fallbackKey='SYS_UNKNOWN'] - 매칭 실패 시 기본 에러 키
 * @returns {{ id: string, message: string, formatted: string, raw: any }}
 */
export function toUserFriendlyError(error, fallbackKey = 'SYS_UNKNOWN') {
  if (!error) {
    const defaultDef = ERROR_CODES[fallbackKey] || ERROR_CODES.SYS_UNKNOWN;
    return {
      id: defaultDef.id,
      message: defaultDef.message,
      formatted: `[${defaultDef.id}] ${defaultDef.message}`,
      raw: error
    };
  }

  // 1. 이미 포맷팅된 Don Dwae 에러 객체인 경우
  if (typeof error === 'object' && error.__isDonDwaeError) {
    return error;
  }

  // 2. 에러 객체의 코드나 메시지 문자열 수집
  const errorCode = typeof error === 'object' ? String(error.code || '') : '';
  const errorMsg = typeof error === 'object' ? String(error.message || '') : String(error || '');
  const combined = `${errorCode} ${errorMsg}`.trim();

  // 3. 직접 ERROR_CODES 키와 일치하는 경우
  if (ERROR_CODES[errorCode]) {
    const def = ERROR_CODES[errorCode];
    return {
      id: def.id,
      message: def.message,
      formatted: `[${def.id}] ${def.message}`,
      raw: error
    };
  }

  // 4. 패턴 매칭 규칙 검사
  for (const rule of ERROR_RULES) {
    if (rule.pattern.test(combined)) {
      const def = ERROR_CODES[rule.code] || ERROR_CODES.SYS_UNKNOWN;
      return {
        id: def.id,
        message: def.message,
        formatted: `[${def.id}] ${def.message}`,
        raw: error
      };
    }
  }

  // 5. 이미 한국어로 작성된 커스텀 에러 메시지인 경우 (한글이 포함되어 있고 영문 기술 에러가 아님)
  const koreanCharCount = (errorMsg.match(/[가-힣]/g) || []).length;
  if (koreanCharCount >= 3 && !/[a-zA-Z]{6,}/.test(errorMsg)) {
    const fallbackDef = ERROR_CODES[fallbackKey] || ERROR_CODES.SYS_UNKNOWN;
    return {
      id: fallbackDef.id,
      message: errorMsg,
      formatted: `[${fallbackDef.id}] ${errorMsg}`,
      raw: error
    };
  }

  // 6. 폴백: 기본 한국어 메시지와 ID 부여
  const fallbackDef = ERROR_CODES[fallbackKey] || ERROR_CODES.SYS_UNKNOWN;
  return {
    id: fallbackDef.id,
    message: fallbackDef.message,
    formatted: `[${fallbackDef.id}] ${fallbackDef.message}`,
    raw: error
  };
}

// 브라우저 전역 객체 바인딩 (인라인 스크립트 호환용)
if (typeof window !== 'undefined') {
  window.DonDwaeErrorCodes = ERROR_CODES;
  window.toUserFriendlyError = toUserFriendlyError;
}
