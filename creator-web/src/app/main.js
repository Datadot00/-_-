// ========================================================
// DON-DWAE (돈돼) Main Entry Point & Supabase Realtime Integration
// Reference: SCHEMA_DESIGN.md
// ========================================================

import * as dataService from '../shared/data/dataService.js';
import { ERROR_CODES, toUserFriendlyError } from '../shared/errors/errorCodes.js';
import * as profileFields from '../features/profile/profileFieldsUi.js';

// 기존 HTML 버튼과 기능별 일반 스크립트가 사용하는 데이터 서비스 연결.
if (typeof window !== 'undefined') {
  window.donDwaeDataService = dataService;
  window.DonDwaeErrorCodes = ERROR_CODES;
  window.toUserFriendlyError = toUserFriendlyError;
  // features/profile의 프로필 수정 화면에서 사용한다.
  window.donDwaeProfileFields = profileFields;
}

// 실제 데이터 초기화는 app/data-sync.js의 initSupabaseLiveDB 한 곳에서 담당한다.
// 여기서 다시 조회하면 첫 진입 때 프로필·지갑·상점 요청이 중복된다.
