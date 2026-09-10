# DB 1단계: 로그인 사용자 프로필 무결성

## 목표

로그인 계정마다 아래 1:1 관계가 항상 성립하도록 한다.

`auth.users` → `public.users` → `public.coin_wallets`

이 단계는 로그인 사용자의 기본 프로필과 지갑 누락을 해결한다. 전화번호·SNS·코인 원장·고객센터 등 `내 정보` 전체 기능 연결은 이후 단계에서 다룬다.

## 구현 상태

- [x] 신규 Auth 사용자 생성 시 프로필과 지갑을 함께 만드는 트리거 보강
- [x] 기존 Auth 사용자 중 누락된 프로필과 지갑을 채우는 백필 작성
- [x] Auth 이메일 변경 시 프로필 이메일을 동기화하는 트리거 작성
- [x] `SECURITY DEFINER` 함수의 `search_path` 고정 및 직접 실행 권한 회수
- [x] 기존 닉네임·소개 등 사용자가 수정한 프로필 값 보존
- [x] 누락 프로필 조회가 정상적인 `null`로 처리되도록 프런트 조회 수정
- [x] DB 무결성 pgTAP 검증 SQL 작성
- [x] 기존 로그인 단위 테스트 8개 통과
- [x] 프런트 프로덕션 빌드 통과
- [x] 운영 DB 비공개 스키마에 대상 데이터·함수·트리거 복구 스냅샷 확보
- [x] 운영 DB에 마이그레이션 적용
- [x] 운영 DB 무결성 검사 및 트랜잭션 기반 신규 가입·이메일 변경 검증

## 파일

- 복구 스냅샷: `creator-web/supabase/migrations/20260910081655_profile_integrity_backup.sql`
- 마이그레이션: `creator-web/supabase/migrations/20260910081914_profile_integrity.sql`
- DB 테스트: `creator-web/supabase/tests/profile_integrity.test.sql`
- 새 환경 전체 스키마: `creator-web/supabase_schema.sql`
- 프로필 조회 처리: `creator-web/src/dataService.js`

## 운영 적용 결과

- Supabase MCP OAuth를 최소 권한(`projects:read`, `database:read`, `database:write`, `analytics:read`)으로 재인증했다.
- 적용 전: Auth 사용자 6명, 프로필 3개, 지갑 2개
- 적용 후: Auth 사용자 6명, 프로필 6개, 지갑 6개
- Auth 사용자 중 프로필 누락: 0
- 프로필 중 지갑 누락: 0
- Auth와 프로필 이메일 불일치: 0
- Auth 사용자 없는 고아 프로필: 0
- 마이그레이션 기록: `profile_integrity_backup`, `profile_integrity`
- 신규 사용자 생성 트리거와 이메일 동기화 트리거: 활성
- 두 트리거 함수의 `search_path`: 고정
- 두 트리거 함수의 `anon`·`authenticated` 직접 실행 권한: 없음
- 공개 스키마의 이전 `handle_new_user()` 함수: 제거
- 트랜잭션 기반 가상 가입·이메일 변경 검사: 통과 후 전부 롤백
- 검사 뒤 남은 가상 사용자: 0
- 적용 직후 Postgres 오류 로그: 0

첫 번째 원격 전송은 PowerShell 기본 인코딩으로 한국어 문자열이 깨져 SQL 구문 오류가 발생했으며, 마이그레이션 트랜잭션이 변경 사항을 전부 롤백했다. UTF-8을 명시한 재적용은 성공했다.

## 다음 단계로 이관한 항목

보안 Advisor에 남은 `marketplace_exchanges` RLS 정책 누락과 유출 비밀번호 보호 비활성 경고는 사용자 프로필 무결성과 별개의 항목이므로 다음 보안 단계에서 처리한다.
