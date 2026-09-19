    function resolveFriendlyError(error, defaultKey = 'SYS_UNKNOWN') {
      if (typeof window.toUserFriendlyError === 'function') {
        return window.toUserFriendlyError(error, defaultKey);
      }
      const rawMsg = typeof error === 'object' ? (error?.message || '') : String(error || '');
      const code = typeof error === 'object' ? (error?.code || '') : '';
      const combined = `${code} ${rawMsg}`.toLowerCase();

      if (/network|fetch|load failed/.test(combined)) {
        return { id: 'SYS-001', message: '네트워크 연결이 원활하지 않습니다. 인터넷 상태를 확인해 주세요.', formatted: '[SYS-001] 네트워크 연결이 원활하지 않습니다. 인터넷 상태를 확인해 주세요.' };
      }
      if (/invalid_credentials|login credentials/.test(combined)) {
        return { id: 'AUTH-001', message: '이메일 또는 비밀번호가 올바르지 않습니다.', formatted: '[AUTH-001] 이메일 또는 비밀번호가 올바르지 않습니다.' };
      }
      if (/email_not_confirmed/.test(combined)) {
        return { id: 'AUTH-002', message: '이메일 인증을 먼저 완료해 주세요.', formatted: '[AUTH-002] 이메일 인증을 먼저 완료해 주세요.' };
      }
      if (/user_already_exists|email_exists|already registered/.test(combined)) {
        return { id: 'AUTH-003', message: '이미 가입된 이메일 계정입니다. 로그인해 주세요.', formatted: '[AUTH-003] 이미 가입된 이메일 계정입니다. 로그인해 주세요.' };
      }
      if (/weak_password|at least 6 characters/.test(combined)) {
        return { id: 'AUTH-004', message: '비밀번호는 6자 이상이어야 합니다.', formatted: '[AUTH-004] 비밀번호는 6자 이상이어야 합니다.' };
      }
      if (/row-level security|permission denied/.test(combined)) {
        return { id: 'SYS-002', message: '데이터베이스 접근 권한이 없습니다. 다시 로그인해 주세요.', formatted: '[SYS-002] 데이터베이스 접근 권한이 없습니다. 다시 로그인해 주세요.' };
      }
      if (/insufficient_funds|not enough coin|코인이 부족/.test(combined)) {
        return { id: 'COIN-001', message: '보유하신 돼지코인이 부족합니다.', formatted: '[COIN-001] 보유하신 돼지코인이 부족합니다.' };
      }
      if (/already[_\s]*participat|already_applied|already[_\s]*submitted|이미 참여/.test(combined)) {
        return { id: 'PART-001', message: '이미 참여를 완료한 테스트입니다.', formatted: '[PART-001] 이미 참여를 완료한 테스트입니다.' };
      }
      if (/creator[_\s]*cannot[_\s]*(?:participate|apply)|creator_cannot_apply/.test(combined)) {
        return { id: 'PART-002', message: '본인이 등록한 프로젝트에는 참여할 수 없습니다.', formatted: '[PART-002] 본인이 등록한 프로젝트에는 참여할 수 없습니다.' };
      }
      if (/capacity[_\s]*reached|closed_project|모집이 마감/.test(combined)) {
        return { id: 'PART-003', message: '모집이 마감되었거나 종료된 테스트입니다.', formatted: '[PART-003] 모집이 마감되었거나 종료된 테스트입니다.' };
      }
      if (/quiz answers? (?:are|is) required|quiz answer is incorrect|quiz configuration is invalid|검증 퀴즈/.test(combined)) {
        return { id: 'PART-004', message: '검증 퀴즈 답변이 올바르지 않거나 입력되지 않았습니다.', formatted: '[PART-004] 검증 퀴즈 답변이 올바르지 않거나 입력되지 않았습니다.' };
      }
      if (/screenshot is required/.test(combined)) {
        return { id: 'PART-008', message: '참여 확인용 스크린샷을 첨부해 주세요.', formatted: '[PART-008] 참여 확인용 스크린샷을 첨부해 주세요.' };
      }
      if (/[가-힣]/.test(rawMsg) && rawMsg.length >= 4) {
        return { id: 'SYS-999', message: rawMsg, formatted: `[SYS-999] ${rawMsg}` };
      }
      return { id: 'SYS-999', message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', formatted: '[SYS-999] 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
    }

    window.resolveFriendlyError = resolveFriendlyError;
