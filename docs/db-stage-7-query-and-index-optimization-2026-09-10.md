# DB 7단계 — 조회 쿼리와 인덱스 최적화

작성일: 2026-09-10  
대상: `creator-web` / Supabase 프로젝트 `mikswhcchbatrlpetngb`

## 완료 체크리스트

- [x] `dataService.js`의 조회·필터·정렬·조인 경로 전수 확인
- [x] 기존 public 인덱스와 사용 통계 수집
- [x] 변경 전 핵심 쿼리 실행 계획 확보
- [x] 메인 피드에서 상세 화면용 JSON과 대용량 썸네일 제외
- [x] 참여·알림 조회의 `SELECT *` 제거
- [x] 알림 조회를 최신 50건으로 제한
- [x] 프로젝트 정렬에 ID 보조 키를 추가해 결과 순서 고정
- [x] 선택적 프로젝트 페이지 범위 조회 지원
- [x] 사용자 검색어 길이·와일드카드 정리
- [x] 프로젝트 공개 검색용 생성 컬럼 추가
- [x] `pg_trgm` 기반 한글·부분 문자열 검색 인덱스 추가
- [x] 프로젝트 최신순·카테고리·플랫폼 인덱스 추가
- [x] 알림·스크랩 사용자 최신순 인덱스 추가
- [x] Advisor 미인덱스 FK 3건 해결
- [x] 적용 후 실행 계획에서 새 인덱스 사용 확인
- [x] 익명 역할의 검색 권한과 검색 데이터 생성 확인
- [x] 로컬 테스트·빌드·localhost 확인
- [x] Security/Performance Advisor 재확인

## 적용한 마이그레이션

`20260910130451_stage_7_query_and_index_optimization.sql`

- `pg_trgm` 확장 활성화
- `projects.search_text` 생성 컬럼 추가
  - `title + service_name + service_desc`
  - 이미 공개된 텍스트만 포함
- 조회 인덱스 8개 추가
  - `idx_projects_search_text_trgm`
  - `idx_projects_feed_recent`
  - `idx_projects_category_recent`
  - `idx_projects_platform_recent`
  - `idx_notifications_user_created_at`
  - `idx_scraps_user_created_at`
  - `idx_scraps_project_id`
  - `idx_reviews_participation_identity`
- 대상 테이블 통계 `ANALYZE`

## 쿼리 변경

- 메인 피드는 카드에 필요한 13개 프로젝트 컬럼과 제작자 카드 정보만 조회한다.
- 상세 설명, 질문, 퀴즈, 테스트 안내, URL 등은 프로젝트 상세 조회에서만 가져온다.
- 특히 인라인 base64 `thumbnail_url`은 메인 목록에서 제외한다.
- 검색은 세 컬럼 `OR ILIKE` 대신 `search_text ILIKE` 한 번으로 수행한다.
- 검색어 `%`, `_` 와일드카드를 제거하고 최대 100자로 제한한다.
- 기본 호출은 기존과 같이 전체 목록을 반환한다. `pageSize`를 넘긴 호출만 최대 100건 범위 조회를 사용한다.
- 참여·알림 조회는 필요한 컬럼만 명시한다.
- 알림 `target_url`을 화면의 이동 대상에 정확히 연결한다.

## 네트워크 응답 최적화

운영 프로젝트 9건 중 3건의 `thumbnail_url`에 인라인 base64 이미지가 저장되어 있었다.

- 인라인 썸네일 합계: 4.84MB
- 평균 썸네일 길이: 약 169만 자
- 최대 썸네일 길이: 약 352만 자
- 기존 전체 프로젝트 JSON 9건: 약 4.85MB
- 최적화 카드 JSON 9건: 약 4.12KB
- 측정상 감소율: 약 99.9%

기존 이미지 원본은 삭제하거나 변경하지 않았다. 목록에서는 공통 미리보기 UI를 사용하고 상세 화면에서만 원본을 조회한다. 장기적으로는 인라인 base64 대신 Supabase Storage URL을 저장해야 한다.

## 실행 계획 비교

변경 전:

- 프로젝트 부분 문자열 검색: `Seq Scan + Sort`
- 사용자 알림 최신순: `Seq Scan + Sort`
- 스크랩 프로젝트 참조: 기존 복합 인덱스의 비선두 컬럼 탐색
- 리뷰 복합 참조: 사용자 인덱스 탐색 후 참여·프로젝트 필터

변경 후:

- 검색: `Bitmap Index Scan on idx_projects_search_text_trgm`
- 최신 프로젝트: `Index Only Scan on idx_projects_feed_recent`
- 알림: `Index Scan on idx_notifications_user_created_at`
- 스크랩 프로젝트: `Index Scan on idx_scraps_project_id`
- 리뷰 복합 참조: `Index Scan on idx_reviews_participation_identity`
- 카테고리 필터: `Bitmap Index Scan on idx_projects_category_recent`

현재 데이터가 9건뿐이라 일반 플래너는 작은 테이블에 순차 탐색을 선택할 수 있다. 위 결과는 `enable_seqscan = off`로 인덱스가 실제 쿼리 조건을 지원하는지 검증한 것이며, 데이터가 증가하면 비용 기반 플래너가 자동으로 선택한다.

## 검증 결과

- `pg_trgm`: 설치 완료
- 신규 인덱스: 8/8 존재
- 프로젝트 검색 생성값: 9/9 정상
- 프로젝트 행 수: 9건 유지
- Performance Advisor의 public 미인덱스 FK: 3건 → 0건
- `npm test`: 45/45 통과
- `npm run build`: 성공
- 인라인 브라우저 스크립트 문법 검사: 통과
- `git diff --check`: 오류 없음
- `http://127.0.0.1:3000/`: HTTP 200

## Advisor 메모

- 남은 `no_primary_key` 안내 6건은 public 운영 테이블이 아니라 0~2단계에서 만든 private 복구용 스냅샷 테이블이다.
- 새 인덱스와 데이터가 없는 거래 테이블 인덱스는 실제 운영 호출 통계가 아직 없어 `unused_index`로 표시된다. 실행 계획 검증으로 조건을 지원하는 것을 확인했으므로 즉시 삭제하지 않는다.
- Security Advisor의 의도된 `SECURITY DEFINER` 5건과 Auth 유출 비밀번호 보호 비활성 경고는 6단계와 동일하다.

## 8단계 전달 사항

- 전체 마이그레이션 순서와 새 DB 구성 재현성을 확인한다.
- 테스트·빌드·역할 기반 DB 검증을 최종 1회 수행한다.
- 누적 변경사항과 비밀 파일 포함 여부를 검토한다.
- 커밋·푸시 후 Vercel 빌드·배포 상태를 확인한다.
