# DB 3단계: 프로젝트 등록과 URL 영속화 (2026-09-10)

## 진행 이유

프로젝트 등록 성공의 기준을 브라우저 화면이나 `localStorage` 카드 생성이 아니라 Supabase의 실제 행 생성으로 통일한다. 로그인 사용자가 등록한 프로젝트와 URL이 새로고침, 재로그인, 다른 기기에서도 동일하게 조회돼야 하며, 저장 실패를 성공으로 표시해서는 안 된다.

## 변경 전 확인 결과

- `public.projects`: 9건
- 소유자, 제목, 서비스명 누락: 0건
- HTTP(S) 스킴 없이 저장된 `service_url`: 4건
- URL 형식을 보장하는 DB 제약: 없음
- 화면에서 입력하지만 기존 INSERT payload에서 누락된 필드:
  - A/B URL
  - 앱스토어 URL
  - 외부 설문 URL
  - 로그인 필요 여부와 테스트 계정
  - 개인정보 안내와 테스트 가이드
  - 피드백 공개 여부
- 기존 화면은 DB 응답을 기다리지 않고 로컬 카드와 성공 메시지를 먼저 생성했다.

## 적용 내용

- [x] 등록 전 실제 Supabase 로그인 세션 확인
- [x] URL 앞뒤 공백 제거 및 스킴이 없으면 `https://`로 정규화
- [x] `http://`, `https://` 외 프로토콜과 URL 내 계정정보 거부
- [x] URL 최대 길이 및 형식을 DB CHECK 제약으로 이중 검증
- [x] 프로젝트 제목, 서비스명, 설명, 기간, 모집 인원, 보상값 DB 무결성 제약 추가
- [x] 외부 설문 URL 전용 `external_survey_url` 컬럼 추가
- [x] 폼의 프로젝트 관련 입력값을 실제 INSERT/UPDATE payload에 연결
- [x] DB 저장과 재조회가 완료된 뒤에만 성공 화면과 돼지코인 표시 갱신
- [x] 사용자 구분이 없던 프로젝트 `localStorage` 복원 경로 제거 및 Supabase를 단일 기준 저장소로 전환
- [x] 저장 실패 시 현재 등록 화면을 유지하고 오류 메시지 표시
- [x] 중복 클릭 방지를 위한 제출 중 버튼 잠금
- [x] 수정 모드가 새 행을 INSERT하지 않고 기존 프로젝트를 UPDATE하도록 수정
- [x] 등록 후 기본 `service_url` 변경을 프런트 허용 목록, 컬럼 권한, DB 트리거에서 차단
- [x] 개인정보 RLS로 재조회할 수 없는 테스트 계정 값이 수정 시 빈 값으로 덮이지 않도록 보호
- [x] 내 프로젝트 재조회용 `(creator_id, created_at DESC)` 인덱스 추가

## 운영 DB 적용 결과

- 적용 마이그레이션:
  - `project_url_persistence`
  - `project_url_backup_primary_key`
  - `index_projects_by_creator`
- 변경 전 URL 백업: `private.project_url_backup_20260910`, 9건
- 익명·로그인 브라우저 역할은 백업 테이블에 접근할 수 없음
- 기존 비정규 URL 4건을 값 손실 없이 `https://` URL로 정규화
- 변경 후 프로젝트 수: 9건
- 변경 후 잘못된 `service_url`: 0건
- 추가한 무결성 제약: 12/12 존재 및 검증 완료
- URL 불변 트리거: 활성
- `authenticated`의 `service_url` UPDATE 컬럼 권한: 제거

## 검증

- Node 자동 테스트: 20/20 통과
- Vite 프로덕션 빌드: 통과
- `git diff --check`: 통과
- 로그인 및 등록 자격을 갖춘 사용자 역할로 다음 흐름을 트랜잭션 안에서 검증:
  1. 프로젝트 INSERT
  2. 생성된 ID로 프로젝트 재조회
  3. `service_url`과 `external_survey_url`이 입력값 그대로 반환되는지 비교
  4. 등록 후 `service_url` 변경이 거부되는지 확인
  5. 전체 테스트 트랜잭션 롤백
- 검증용 프로젝트는 운영 DB에 남지 않았으며 프로젝트 수는 9건으로 유지됐다.
- 프로젝트 소유자 외래키 미인덱스 경고를 해소해 Performance Advisor의 미인덱스 외래키가 10건에서 9건으로 감소했다.

## 관련 파일

- `creator-web/src/dataService.js`
- `creator-web/index.html`
- `creator-web/supabase_schema.sql`
- `creator-web/supabase/migrations/20260910092555_project_url_persistence.sql`
- `creator-web/supabase/migrations/20260910092915_project_url_backup_primary_key.sql`
- `creator-web/supabase/migrations/20260910093110_index_projects_by_creator.sql`
- `creator-web/supabase/tests/project_url_persistence.test.sql`
- `creator-web/test/projectPersistence.test.js`

## 남은 범위

- 리워드 돼지코인의 실제 차감은 아직 브라우저 표시 로직이다. 프로젝트 생성과 지갑 차감을 하나의 DB 트랜잭션/RPC로 묶는 작업은 돼지코인 원장 단계에서 진행해야 한다.
- 썸네일은 현재 문자열/Data URL 방식이므로 실제 파일 영속화는 Supabase Storage 단계에서 분리한다.
- 최종 수동 E2E에서는 사용자가 로컬 화면에서 실제 프로젝트 1건을 등록하고 새로고침 및 재로그인 후 확인한다. 이 행은 실제 사용자 데이터이므로 자동 검증에서는 생성하지 않았다.

## 참고

- Supabase JavaScript 데이터 처리: https://supabase.com/docs/reference/javascript/insert
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
