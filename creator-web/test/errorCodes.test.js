import test from 'node:test';
import assert from 'node:assert/strict';
import { ERROR_CODES, toUserFriendlyError } from '../src/errorCodes.js';

test('에러코드 모듈은 필수 도메인별 ID 체계를 모두 선언한다', () => {
  assert.equal(ERROR_CODES.AUTH_INVALID_CREDENTIALS.id, 'AUTH-001');
  assert.equal(ERROR_CODES.PRJ_REQUIRED_FIELD_MISSING.id, 'PRJ-001');
  assert.equal(ERROR_CODES.PART_ALREADY_APPLIED.id, 'PART-001');
  assert.equal(ERROR_CODES.COIN_INSUFFICIENT.id, 'COIN-001');
  assert.equal(ERROR_CODES.USER_INVALID_LINKS.id, 'USER-001');
  assert.equal(ERROR_CODES.SYS_NETWORK_ERROR.id, 'SYS-001');
});

test('Supabase 영문 인증 오류를 한국어 메시지와 AUTH-xxx 코드로 변환한다', () => {
  const err1 = toUserFriendlyError({ code: 'invalid_credentials', message: 'Invalid login credentials' });
  assert.equal(err1.id, 'AUTH-001');
  assert.equal(err1.message, '이메일 또는 비밀번호가 올바르지 않습니다.');
  assert.equal(err1.formatted, '[AUTH-001] 이메일 또는 비밀번호가 올바르지 않습니다.');

  const err2 = toUserFriendlyError({ message: 'User already registered' });
  assert.equal(err2.id, 'AUTH-003');
  assert.equal(err2.message, '이미 가입된 이메일 계정입니다. 로그인해 주세요.');

  const err3 = toUserFriendlyError({ message: 'Email not confirmed' });
  assert.equal(err3.id, 'AUTH-002');
  assert.equal(err3.message, '이메일 인증을 먼저 완료해 주세요.');

  const err4 = toUserFriendlyError({ message: 'Password should be at least 6 characters' });
  assert.equal(err4.id, 'AUTH-004');
});

test('브라우저 영문 네트워크 오류(Failed to fetch)를 SYS-001로 변환한다', () => {
  const err = toUserFriendlyError(new TypeError('Failed to fetch'));
  assert.equal(err.id, 'SYS-001');
  assert.equal(err.message, '네트워크 연결이 원활하지 않습니다. 인터넷 상태를 확인해 주세요.');
  assert.equal(err.formatted, '[SYS-001] 네트워크 연결이 원활하지 않습니다. 인터넷 상태를 확인해 주세요.');
});

test('데이터베이스 RLS 권한 오류를 SYS-002로 변환한다', () => {
  const err = toUserFriendlyError({ message: 'new row violates row-level security policy for table "projects"' });
  assert.equal(err.id, 'SYS-002');
  assert.equal(err.message, '데이터베이스 접근 권한이 없습니다. 다시 로그인해 주세요.');
});

test('이미 한국어로 작성된 커스텀 메시지는 메시지를 보존하면서 fallback ID를 부여한다', () => {
  const err = toUserFriendlyError(new Error('프로젝트 제목을 입력해 주세요.'), 'PRJ_REQUIRED_FIELD_MISSING');
  assert.equal(err.id, 'PRJ-001');
  assert.equal(err.message, '프로젝트 제목을 입력해 주세요.');
  assert.equal(err.formatted, '[PRJ-001] 프로젝트 제목을 입력해 주세요.');
});

test('알 수 없는 영문 오류는 SYS-999 한국어 메시지로 안전하게 보호한다', () => {
  const err = toUserFriendlyError({ message: 'Unknown internal crash in upstream worker thread' });
  assert.equal(err.id, 'SYS-999');
  assert.equal(err.message, '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  assert.equal(err.formatted, '[SYS-999] 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
});
