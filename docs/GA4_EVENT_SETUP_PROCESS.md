# GA4 이벤트 세팅 프로세스

작성일: 2026-09-17  
대상 서비스: 돈돼 웹 서비스 (`creator-web/`)

## 1. 문서 목적

이 문서는 돈돼 웹 서비스에 Google Analytics 4(GA4) 이벤트를 설계하고 구현하며 검증·운영하는 표준 절차를 정의한다.

핵심 원칙은 다음과 같다.

1. 모든 클릭을 수집하기보다 실제 의사결정에 필요한 행동을 우선 측정한다.
2. 이벤트 이름과 파라미터를 구현 전에 문서로 합의한다.
3. 저장·결제·리워드 관련 성공 이벤트는 서버의 성공 응답 이후에만 전송한다.
4. GA4는 행동과 추세 분석에 사용하고, 회원·리뷰·코인·교환 내역의 원본은 Supabase로 유지한다.
5. 이메일, 전화번호, 닉네임, 리뷰 원문 등 개인 식별 정보와 자유 입력값을 GA4에 보내지 않는다.

기존 데이터 구조와 상세 이벤트 초안은 [`data-pipeline-research.md`](./data-pipeline-research.md)의 7~8장을 함께 참고한다.

## 2. 전체 업무 흐름

```text
측정 목적·KPI 정의
→ 사용자 퍼널 정의
→ 이벤트 명세서 작성 및 승인
→ GA4·GTM 기본 환경 구성
→ 서비스 코드에서 dataLayer 이벤트 구현
→ GTM 태그·트리거·변수 연결
→ 커스텀 측정기준 및 핵심 이벤트 설정
→ Preview·DebugView QA
→ 운영 배포
→ 데이터 품질 모니터링 및 명세 관리
```

## 3. 측정 목적과 KPI 정의

이벤트를 정하기 전에 GA4 데이터로 답하려는 질문을 먼저 정한다.

돈돼의 우선 질문은 다음과 같다.

- 방문자가 회원가입까지 얼마나 전환되는가?
- 회원가입 후 약관·온보딩 중 어디에서 이탈하는가?
- 제작자가 프로젝트 등록 중 어느 단계에서 이탈하는가?
- 프로젝트 상세를 본 테스터가 실제 참여와 리뷰 제출까지 얼마나 이어지는가?
- 어떤 프로젝트 유형의 참여율과 리뷰 완료율이 높은가?
- 코인을 받은 사용자가 상품 교환까지 이어지는가?

대표 KPI 예시는 다음과 같다.

| KPI | 계산 예시 |
|---|---|
| 회원가입 전환율 | `sign_up 사용자 수 / 로그인 화면 방문 사용자 수` |
| 프로젝트 게시 완료율 | `experiment_publish_success / experiment_create_start` |
| 상세→참여 전환율 | `participation_start / experiment_detail_view` |
| 참여→리뷰 완료율 | `review_submit_success / participation_start` |
| 교환 완료율 | `reward_redemption_success / reward_redemption_start` |

GA4 수치는 광고 차단, 네트워크 오류, 분석 동의 상태 등에 따라 누락될 수 있다. 실제 회원 수, 프로젝트 수, 리뷰 수, 코인 잔액과 같은 운영 수치는 항상 Supabase를 기준으로 판단한다.

## 4. 핵심 퍼널 정의

### 4.1 제작자 퍼널

```text
sign_up
→ experiment_create_start
→ experiment_create_step_view
→ experiment_create_step_complete
→ experiment_publish_start
→ experiment_publish_success
```

### 4.2 테스터 퍼널

```text
experiment_list_view
→ experiment_detail_view
→ participation_start
→ external_test_open
→ review_start
→ review_submit_success
→ earn_virtual_currency
```

### 4.3 리워드 교환 퍼널

```text
reward_redemption_start
→ reward_redemption_success
```

## 5. 이벤트 명세 작성

개발 전에 각 이벤트의 의미와 발생 조건을 아래 형식으로 확정한다.

| 항목 | 작성 예시 |
|---|---|
| 이벤트명 | `review_submit_success` |
| 비즈니스 의미 | 리뷰와 보상 트랜잭션이 정상 완료됨 |
| 정확한 발생 시점 | Supabase RPC 성공 응답 이후 |
| 필수 파라미터 | `experiment_id`, `experiment_type`, `has_screenshot` |
| 선택 파라미터 | 없음 |
| 핵심 이벤트 여부 | 예 |
| 전송 금지 값 | 리뷰 원문, 이메일, 이미지 URL, 원시 오류 메시지 |
| 담당 기능 | 리뷰 작성 |
| 담당자 | 개발 담당자 / 분석 담당자 |

### 5.1 명명 규칙

- 영문 소문자 `snake_case`를 사용한다.
- `button_click`처럼 UI 요소를 설명하기보다 `experiment_publish_start`처럼 행동의 의미를 표현한다.
- 시작·성공·실패를 구분한다.
- 의미가 정확히 일치하면 GA4 권장 이벤트를 사용한다.
  - `login`
  - `sign_up`
  - `search`
  - `share`
  - `earn_virtual_currency`
- 기존 이벤트의 의미를 바꿔 재사용하지 않는다.
- 계약이 바뀌면 `event_schema_version`을 증가시킨다.

GA4 권장 이벤트 목록: <https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events>

### 5.2 공통 파라미터

| 파라미터 | 예시 | 규칙 |
|---|---|---|
| `event_schema_version` | `1` | 이벤트 계약 버전 |
| `surface` | `web` | 현재 웹 단일 값 사용 |
| `feature_area` | `auth`, `experiment_create`, `participation` | 기능 영역 |
| `user_role` | `creator`, `tester`, `anonymous` | 개인 식별 정보가 아닌 역할 |
| `screen_name` | `experiment_detail` | 가상 화면 이름 |
| `experiment_id` | UUID | 프로젝트 제목 대신 내부 식별자 사용 |
| `experiment_type` | `product`, `prototype`, `survey` | 제한된 열거형 사용 |
| `variant_code` | `a`, `b` | 자유 입력 금지 |
| `step_number` | `1` | 숫자 사용 |
| `reward_coin` | `50` | 숫자 사용 |
| `error_code` | `AUTH-006`, `insufficient_coin` | 허용 목록에 있는 코드만 사용 |

## 6. 구현 구조

돈돼는 다음 구조를 사용한다.

```text
서비스 코드
→ window.dataLayer.push()
→ Google Tag Manager 웹 컨테이너
→ GA4 웹 데이터 스트림
```

서비스 코드는 GA4 측정 ID나 GTM 태그 세부 설정을 직접 알지 않고, 합의한 데이터 레이어 이벤트만 전달한다.

### 6.1 공통 추적 함수

공통 추적 함수는 별도 모듈로 관리하는 것을 권장한다.

```js
export function trackEvent(eventName, params = {}) {
  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: eventName,
    event_schema_version: 1,
    surface: 'web',
    ...params
  });
}
```

페이지 곳곳에서 `window.dataLayer.push()`를 직접 호출하지 않고 공통 함수를 사용한다. 이를 통해 공통 파라미터, 환경 분리, 동의 상태와 테스트 로깅을 한 곳에서 관리할 수 있다.

## 7. 이벤트 발생 시점

### 7.1 시작·성공·실패 구분

버튼 클릭을 성공으로 기록하지 않는다.

```text
게시 버튼 클릭 및 서버 요청 시작
→ experiment_publish_start

Supabase 저장 트랜잭션 성공
→ experiment_publish_success

Supabase 저장 실패
→ experiment_publish_error
```

구현 예시는 다음과 같다.

```js
trackEvent('review_submit_start', {
  feature_area: 'participation',
  experiment_id: projectId
});

try {
  const result = await submitReview(payload);

  trackEvent('review_submit_success', {
    feature_area: 'participation',
    experiment_id: result.experimentId,
    experiment_type: result.experimentType,
    has_screenshot: Boolean(payload.screenshotPath)
  });
} catch (error) {
  trackEvent('review_submit_error', {
    feature_area: 'participation',
    experiment_id: projectId,
    error_code: mapToSafeErrorCode(error)
  });

  throw error;
}
```

### 7.2 중복 방지

- 한 번의 사용자 행동에 성공 이벤트는 한 번만 발생해야 한다.
- 같은 이벤트를 서비스 코드와 GTM DOM 클릭 트리거 양쪽에서 동시에 만들지 않는다.
- 저장 버튼 연속 클릭을 막고, 성공 이벤트는 서버 응답 한 건에만 연결한다.
- 재시도 가능한 요청은 동일 요청에서 성공 이벤트가 중복되지 않는지 확인한다.

## 8. 가상 페이지뷰

현재 돈돼는 `navigateTo()`로 화면을 바꾸지만 실제 브라우저 URL은 일반적인 페이지 이동처럼 변경되지 않는다. 따라서 화면별 방문을 측정하려면 수동 가상 페이지뷰가 필요하다.

```js
export function trackVirtualPage(viewKey) {
  trackEvent('virtual_page_view', {
    screen_name: viewKey,
    page_title: `돈돼 | ${viewKey}`,
    page_location: `${location.origin}${location.pathname}#/${viewKey}`
  });
}
```

GTM에서는 `virtual_page_view`를 사용자 정의 이벤트 트리거로 받고 GA4의 `page_view`로 전달한다.

자동 페이지뷰와 수동 페이지뷰를 함께 사용하면 중복 집계될 수 있다. 현재 구조에서는 자동 페이지뷰를 끄고 최초 화면을 포함한 모든 화면 조회를 수동으로 보내는 방식을 권장한다.

## 9. GTM 구성

### 9.1 기본 구성

| GTM 구성 요소 | 역할 |
|---|---|
| Google tag | GA4 기본 설정 로드 |
| Consent Initialization | 필요한 동의 기본 상태를 다른 태그보다 먼저 설정 |
| Data Layer Variable | 이벤트 파라미터 추출 |
| Custom Event Trigger | 승인된 `dataLayer` 이벤트 감지 |
| GA4 Event Tag | 이벤트명과 파라미터를 GA4로 전달 |
| Virtual Page View Tag | `virtual_page_view`를 `page_view`로 전달 |
| 예외 트리거 | 로컬·내부 QA·관리 화면 제외에 사용 |

### 9.2 환경 분리

- 운영과 개발 데이터가 같은 보고서에 섞이지 않게 한다.
- 개발·스테이징용 별도 데이터 스트림 또는 GTM 환경을 사용한다.
- GTM 변경은 Preview 검증 후 버전명과 설명을 남겨 게시한다.
- 운영용 컨테이너를 수정한 사람과 검증한 사람을 가능하면 분리한다.

GTM 환경 안내: <https://support.google.com/tagmanager/answer/6311518>

## 10. GA4 관리 화면 설정

### 10.1 커스텀 측정기준 후보

다음 이벤트 파라미터는 GA4 보고서에서 분석할 수 있도록 이벤트 범위 커스텀 측정기준 등록을 검토한다.

- `event_schema_version`
- `feature_area`
- `user_role`
- `screen_name`
- `experiment_type`
- `variant_code`
- `error_code`

### 10.2 커스텀 측정항목 후보

다음 숫자 파라미터는 실제 보고 요구가 있을 때만 커스텀 측정항목으로 등록한다.

- `reward_coin`
- `coin_amount`
- `target_count`

GA4 커스텀 정의는 한도가 있으므로 전송하는 모든 파라미터를 무조건 등록하지 않는다. 등록 후 일반 보고서에 반영되기까지 시간이 걸릴 수 있다.

공식 문서: <https://support.google.com/analytics/answer/14240153>

### 10.3 핵심 이벤트 후보

모든 이벤트를 핵심 이벤트로 지정하지 않는다. 실제 성과를 나타내는 이벤트만 선택한다.

- `sign_up`
- `experiment_publish_success`
- `ab_vote_submit_success`
- `review_submit_success`
- `reward_redemption_success`

## 11. 개인정보 및 보안 규칙

다음 값은 GA4와 `dataLayer`에 전송하지 않는다.

- 이메일, 전화번호, 실명, 닉네임
- 로그인 ID와 비밀번호
- 리뷰·설문 주관식 원문
- 고객센터 문의 내용
- 이미지·스크린샷 URL
- Supabase JWT, 세션 토큰, API 키
- Supabase 및 Postgres 오류 전문
- 개인정보가 포함된 페이지 URL 또는 페이지 제목
- 사용자가 입력한 자유 검색어 원문

오류 분석에는 원문 대신 허용 목록 기반 `error_code`만 사용한다.

```js
function mapToSafeErrorCode(error) {
  if (error?.code === 'over_email_send_rate_limit') return 'AUTH-006';
  if (error?.code === 'invalid_credentials') return 'AUTH-001';
  return 'SYS-999';
}
```

분석 도구의 동의 처리 범위와 보존 정책은 실제 운영 지역과 개인정보 처리방침을 기준으로 별도 검토한다.

## 12. QA 절차

### 12.1 개발자 확인

- [ ] 브라우저 콘솔에서 `window.dataLayer`가 존재한다.
- [ ] 사용자 행동 후 예상 이벤트가 한 번만 추가된다.
- [ ] 필수 파라미터의 이름과 자료형이 명세와 같다.
- [ ] 성공 이벤트는 서버 성공 응답 이후에만 발생한다.
- [ ] 실패 상황에서 성공 이벤트가 발생하지 않는다.
- [ ] 이메일, 리뷰 원문, URL 등 전송 금지 값이 없다.
- [ ] 화면 이동마다 가상 페이지뷰가 한 번 발생한다.

### 12.2 GTM Preview 확인

- [ ] Tag Assistant가 대상 환경에 정상 연결된다.
- [ ] Custom Event Trigger가 예상 이벤트에서만 실행된다.
- [ ] GA4 이벤트 태그가 한 번만 실행된다.
- [ ] Data Layer Variable 값이 누락되지 않는다.
- [ ] 로컬·개발 환경 제외 조건이 정상 작동한다.
- [ ] 동의 상태에 따라 태그 실행 여부가 의도대로 동작한다.

GTM Preview 공식 안내: <https://support.google.com/tagmanager/answer/6107056>

### 12.3 GA4 확인

- [ ] DebugView에 이벤트가 실시간으로 표시된다.
- [ ] 이벤트 파라미터가 명세와 일치한다.
- [ ] Realtime 보고서에서 운영 이벤트 수신을 확인한다.
- [ ] 브라우저 Network 탭에서 GA 수집 요청을 확인한다.
- [ ] 핵심 이벤트 지정이 의도대로 반영된다.

GA4 검증 공식 안내: <https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot>

## 13. 배포 절차

1. 이벤트 명세 변경안을 팀에서 검토한다.
2. 개발 환경에서 서비스 코드와 GTM 작업을 완료한다.
3. GTM Preview와 GA4 DebugView로 전체 퍼널을 테스트한다.
4. 이벤트 중복, 누락, 개인정보 포함 여부를 확인한다.
5. 서비스 코드를 먼저 배포하고 필요한 경우 기능 플래그로 이벤트를 제어한다.
6. GTM 컨테이너에 버전명과 변경 설명을 작성한다.
7. GTM 운영 버전을 게시한다.
8. GA4 Realtime에서 운영 이벤트 수신을 확인한다.
9. 배포 후 24시간 동안 이벤트 건수와 오류를 집중 모니터링한다.

GTM 게시 및 버전 관리 안내: <https://support.google.com/tagmanager/answer/6107163>

## 14. 운영 및 변경 관리

### 14.1 정기 점검

주간 또는 주요 배포 후 다음 항목을 확인한다.

- 이벤트 발생량이 갑자기 0이 되거나 두 배로 증가하지 않았는가?
- `start` 대비 `success` 비율이 비정상적으로 변하지 않았는가?
- 특정 `error_code`가 급증하지 않았는가?
- 새 기능에 필요한 이벤트가 명세에 반영됐는가?
- 사용하지 않는 이벤트와 커스텀 정의가 남아 있지 않은가?
- 운영과 개발 데이터가 섞이지 않았는가?

### 14.2 이벤트 변경 규칙

- 이벤트 추가·삭제·의미 변경은 명세서를 먼저 수정한다.
- 이벤트 의미가 달라지면 기존 이름을 재사용하지 않거나 `event_schema_version`을 증가시킨다.
- 파라미터 자료형을 문자열에서 숫자처럼 임의로 변경하지 않는다.
- GTM 변경은 버전명과 변경 설명을 남긴다.
- 대시보드와 탐색 보고서가 사용하는 이벤트를 삭제하기 전 영향 범위를 확인한다.

## 15. 역할 분담 예시

| 역할 | 책임 |
|---|---|
| 기획/PM | 비즈니스 질문, KPI, 핵심 이벤트 정의 |
| 개발 | `dataLayer` 이벤트 및 가상 페이지뷰 구현 |
| 데이터/마케팅 | GTM 구성, GA4 커스텀 정의, 퍼널 보고서 구성 |
| QA | 이벤트 순서, 중복, 누락, 파라미터, 개인정보 검증 |
| 운영 책임자 | GTM 게시 승인 및 데이터 품질 모니터링 |

## 16. 돈돼 적용 권장 순서

돈돼는 처음부터 모든 클릭을 수집하지 않고 다음 순서로 적용한다.

### 1차: 기반 구성

- GA4 속성 및 웹 데이터 스트림 확인
- GTM 웹 컨테이너 생성·설치
- 개발/운영 환경 분리
- 공통 `trackEvent()` 모듈 추가
- `navigateTo()` 가상 페이지뷰 연결

### 2차: 핵심 퍼널

- `sign_up`
- `login`
- `experiment_create_start`
- `experiment_create_step_complete`
- `experiment_publish_success`
- `experiment_detail_view`
- `participation_start`
- `external_test_open`
- `review_start`
- `review_submit_success`
- `earn_virtual_currency`

### 3차: 실패와 개선 분석

- `experiment_publish_error`
- `review_submit_error`
- 인증 오류 코드
- 등록 단계별 이탈
- 프로젝트 유형별 전환율

### 4차: 리워드와 장기 분석

- `reward_redemption_start`
- `reward_redemption_success`
- 재방문·리텐션 분석
- 필요 시 BigQuery Export 검토

## 17. 구현 착수 전 최종 체크리스트

- [ ] GA4로 답하려는 비즈니스 질문이 정리됐다.
- [ ] 핵심 제작자·테스터 퍼널이 합의됐다.
- [ ] 이벤트별 발생 조건과 파라미터가 문서화됐다.
- [ ] 성공 이벤트가 서버 성공 시점에 연결되도록 정의됐다.
- [ ] 개인정보와 자유 입력값 제외 규칙이 정해졌다.
- [ ] 자동·수동 페이지뷰 중복 방지 방식이 결정됐다.
- [ ] 개발/운영 환경 분리 방식이 결정됐다.
- [ ] GTM Preview 및 GA4 DebugView QA 담당자가 정해졌다.
- [ ] 핵심 이벤트 후보가 합의됐다.
- [ ] 배포 후 모니터링 담당자가 정해졌다.

## 참고 자료

- [Google Analytics 웹 설정](https://developers.google.com/analytics/devguides/collection/ga4/web)
- [GA4 이벤트 설정](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [GA4 권장 이벤트](https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events)
- [GA4 설정 검증 및 문제 해결](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot)
- [GA4 커스텀 측정기준 및 측정항목](https://support.google.com/analytics/answer/14240153)
- [GTM Preview 및 Debug](https://support.google.com/tagmanager/answer/6107056)
- [GTM 환경 관리](https://support.google.com/tagmanager/answer/6311518)
- [GTM 게시·버전·승인](https://support.google.com/tagmanager/answer/6107163)

