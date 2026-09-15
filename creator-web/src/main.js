// ========================================================
// DON-DWAE (돈돼) Main Entry Point & Supabase Realtime Integration
// Reference: SCHEMA_DESIGN.md
// ========================================================

import * as dataService from './dataService.js';
import { ERROR_CODES, toUserFriendlyError } from './errorCodes.js';
import * as profileFields from './profileFieldsUi.js';

// Expose DataService & ErrorCodes to Window for Inline Event Handlers in index.html
if (typeof window !== 'undefined') {
  window.donDwaeDataService = dataService;
  window.DonDwaeErrorCodes = ERROR_CODES;
  window.toUserFriendlyError = toUserFriendlyError;
  // 내 정보 수정 모달은 index.html 인라인 스크립트에서 호출한다.
  window.donDwaeProfileFields = profileFields;
}

// 실제 데이터 초기화는 index.html의 initSupabaseLiveDB 한 곳에서 담당한다.
// 여기서 다시 조회하면 첫 진입 때 프로필·지갑·상점 요청이 중복된다.
