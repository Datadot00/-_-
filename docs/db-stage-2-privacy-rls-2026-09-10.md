# DB 2단계: 개인정보·RLS 보안 강화

## 목표

브라우저에서 사용하는 `anon`·`authenticated` 역할에 필요한 행과 컬럼만 허용하고, 개인정보·테스트 계정·비공개 리뷰 증빙을 Data API에서 차단한다.

## 적용 전 확인

- `anon`과 `authenticated`에 대상 테이블 10개의 `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER` 권한이 일괄 부여돼 있었다.
- 공개 프로필 정책과 결합되어 사용자 이메일 6건을 익명 역할이 조회할 수 있었다.
- 전화번호와 SNS 값은 비어 있었지만 컬럼 접근 권한은 열려 있었다.
- 프로젝트 테스트 계정 값은 비어 있었지만 ID·비밀번호 컬럼 접근 권한은 열려 있었다.
- `marketplace_exchanges`는 RLS만 활성화되고 정책이 없어 Security Advisor 경고가 있었다.

실제 이메일, 전화번호, 계정 비밀번호 등 원문 값은 감사 문서에 기록하지 않았다.

## 완료 체크리스트

- [x] 기존 RLS 정책·테이블 권한·컬럼 권한을 `private` 스키마에 백업
- [x] 대상 공개 테이블 10개의 RLS 활성 상태 확인
- [x] `anon`·`authenticated`의 광범위한 기본 권한 전부 회수
- [x] 익명 사용자는 공개 프로필·게시 프로젝트·활성 상점 항목만 조회하도록 제한
- [x] 이메일·전화번호·SNS 컬럼을 모든 브라우저 역할에서 차단
- [x] 프로젝트 테스트 계정 ID·비밀번호 컬럼을 모든 브라우저 역할에서 차단
- [x] 리뷰 스크린샷·퀴즈 응답·내부 참여 ID 컬럼 차단
- [x] 프로필 변경은 본인 행과 허용 컬럼으로 제한
- [x] 레벨·랭크·완료 횟수 위조 업데이트 차단
- [x] 프로젝트 생성·수정·삭제를 소유자 기준으로 제한
- [x] 비공개 프로젝트는 제작자만 조회하도록 제한
- [x] 참여·리뷰·지갑·코인·스크랩·알림·교환 내역을 소유 관계에 맞게 제한
- [x] `marketplace_exchanges` 본인 조회 정책 추가
- [x] 모든 `auth.uid()` 정책을 init-plan 최적화 형태로 변경
- [x] 중복 프로젝트 SELECT 정책을 단일 정책으로 통합
- [x] 프런트의 사용자·프로젝트·리뷰 `select('*')`를 안전 컬럼 목록으로 교체
- [x] 프런트 업데이트 페이로드에서 허용되지 않은 프로필 필드 제거
- [x] 운영 Data API 익명 허용·차단 테스트 통과
- [x] 운영 DB 로그인 역할 모사 RLS 테스트 통과 후 롤백
- [x] 단위 테스트 12개 통과
- [x] 프로덕션 빌드 통과

## 운영 검증 결과

| 검사 | 결과 |
|---|---:|
| RLS가 꺼진 대상 테이블 | 0 |
| `TRUNCATE`·`TRIGGER`·`REFERENCES` 브라우저 권한 | 0 |
| 개인정보·테스트 계정 SELECT 권한 | 0 |
| 사용자 이메일 익명 API | 401 차단 |
| 사용자 전화번호 익명 API | 401 차단 |
| 테스트 계정 ID·비밀번호 익명 API | 401 차단 |
| 리뷰 스크린샷·퀴즈 응답·참여 ID 익명 API | 401 차단 |
| 공개 프로필·프로젝트·리뷰 표시 API | 200 정상 |
| 타인 프로필 업데이트 | 0행 처리 |
| 타인 지갑 조회 | 0행 |
| 본인 지갑 조회 | 정상 |
| 사용자·프로젝트·지갑 행 수 변화 | 없음 |

권한 차단을 검증하면서 발생한 Postgres `42501` 로그는 의도적으로 금지된 컬럼을 요청해 확인한 테스트 결과다.

## 파일

- 복구 스냅샷: `creator-web/supabase/migrations/20260910084715_privacy_rls_backup.sql`
- 핵심 보안 마이그레이션: `creator-web/supabase/migrations/20260910084745_privacy_rls_hardening.sql`
- 프로젝트 정책 통합: `creator-web/supabase/migrations/20260910085053_consolidate_project_select_policy.sql`
- 리뷰 민감 컬럼 차단: `creator-web/supabase/migrations/20260910085634_restrict_review_sensitive_columns.sql`
- DB 테스트: `creator-web/supabase/tests/privacy_rls.test.sql`
- 프런트 안전 컬럼 정의: `creator-web/src/dataService.js`
- 프런트 단위 테스트: `creator-web/test/dataServiceSecurity.test.js`

## 운영 마이그레이션 기록

- `privacy_rls_backup`
- `privacy_rls_hardening`
- `consolidate_project_select_policy`
- `restrict_review_sensitive_columns`

## 다음 단계로 이관한 항목

- Supabase Auth의 유출 비밀번호 보호 기능은 아직 비활성 상태다.
- 외래 키 인덱스 10개는 성능 최적화 단계에서 추가한다.
- 테스트 계정은 현재 브라우저 역할에서 완전히 차단했다. 참여자에게 제공해야 할 때에는 별도 비공개 테이블 또는 검증된 RPC로 제공한다.
- `quizzes` JSON의 제작자 정답은 개인정보가 아니어서 이번 범위에 포함하지 않았다. 테스트 무결성 단계에서 정답을 서버 검증 구조로 분리한다.
- `has_passed_gating`의 본인 업데이트는 현재 서약 UI 흐름을 유지하기 위해 허용했다. 프로젝트 자격을 서버가 판정하는 단계에서 전용 RPC로 옮긴다.

## 기준 문서

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security)
