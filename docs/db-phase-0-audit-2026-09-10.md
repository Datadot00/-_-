# DB 0단계 감사 기록 (2026-09-10)

## 범위

- 운영 DB 변경 없이 현재 연결 상태와 공개 Data API 표면을 점검한다.
- 실제 행 값, 이메일 주소, 전화번호, 테스트 계정 정보는 출력하거나 기록하지 않는다.
- 관리자 권한이 필요한 스키마, 정책, 인덱스, 무결성 검사는 연결 복구 후 집계 결과만 기록한다.

## 확인 완료

- 로컬 `.env.local`에 Supabase URL과 publishable key가 설정되어 있다.
- `.env.local`은 Git에서 제외되어 있고 `.env.example`만 추적된다.
- Supabase Auth 설정 응답은 정상이다.
  - Email provider: enabled
  - Signup: enabled
  - Email autoconfirm: disabled
  - Enabled external providers: email only
- publishable key의 익명 역할로 확인한 공개 행 수:
  - `public.users`: 3
  - `public.projects`: 9
  - `public.marketplace_items`: 4
  - 나머지 사용자 소유 테이블: 익명 역할에서 0행
- 익명 역할로 다음 컬럼이 포함된 행을 조회할 수 있음이 확인됐다.
  - `public.users`: `email`, `phone`, `sns_links`, `level`, `rank_badge`, `has_passed_gating`, `completed_test_count`
  - `public.projects`: `test_account_id`, `test_account_pw`, `service_url`
- 실제 컬럼 값은 감사 결과에 저장하지 않았다.

## 즉시 주의할 사항

- 프로필 개인정보와 시스템 관리 필드가 익명 역할에 노출될 수 있다.
- 공개 프로젝트 응답에서 테스트 계정 ID/PW 컬럼에 접근할 수 있다.
- 값이 현재 비어 있더라도 컬럼 접근 자체를 차단해야 한다.
- 보안 수정은 별도 마이그레이션과 RLS 테스트를 준비한 뒤 수행한다.

## 아직 확인하지 못한 항목

- Supabase MCP OAuth 토큰 갱신 실패로 다음 관리자 감사를 수행하지 못했다.
  - `auth.users`와 `public.users`의 1:1 일치 여부
  - 실제 RLS 정책, GRANT, 함수, 트리거, 인덱스 목록
  - Supabase Security/Performance Advisor
  - 적용된 마이그레이션 이력
  - 최근 Auth/Postgres 오류 로그
- 현재 환경에는 Supabase CLI, Docker, `pg_dump`, 관리자 DB 연결 정보가 없다.
- 따라서 전체 스키마 덤프와 데이터 백업은 아직 생성하지 못했다.

## 연결 복구 후 실행

1. Supabase MCP를 다시 인증한다.
2. `docs/db-phase-0-readonly-audit.sql`을 관리자 SQL Editor 또는 읽기 전용 관리자 세션에서 실행한다.
3. 행 원문이 아닌 집계 결과만 이 문서에 추가한다.
4. 실DB 스키마를 덤프해 저장소의 `creator-web/supabase_schema.sql`과 비교한다.
5. 백업 또는 복구 지점을 확인한 뒤 1단계 마이그레이션을 시작한다.

## 0단계 완료 조건

- [x] 공개 Auth 설정 확인
- [x] 공개 Data API 테이블 접근 범위 확인
- [x] 민감 컬럼의 익명 접근 가능성 확인
- [ ] Supabase MCP 재인증
- [ ] 실DB 스키마·정책·인덱스·함수·트리거 수집
- [ ] Auth 사용자·프로필·지갑 무결성 집계
- [ ] 프로젝트·참여·리뷰·코인 무결성 집계
- [ ] 원격 마이그레이션 이력 확인
- [ ] Security/Performance Advisor 확인
- [ ] 변경 전 백업 또는 복구 지점 확보

