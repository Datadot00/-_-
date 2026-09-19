# index.html 분리 전 기준 기록 — 2026-09-19

## 1. 최종 상태

**주요 흐름의 비교 기준 확보 완료. 미확인 항목을 이관하고 다음 단계로 진행한다.** 전체 기능 검증 완료를 뜻하지 않는다.

- 1단계에서는 앱 코드·의존성을 변경하지 않았다. 원본 42개 파일의 해시가 일치했다.
- 기존 테스트 **216개 통과**, 빌드 성공, 미리보기 HTML·JS 응답 200. 문서 정리에서는 재실행하지 않았다.
- 화면 캡처 **49개**(PNG 6개·JPEG 43개)를 확보했다.
- 사용자가 온보딩·등록·기존 참여의 후기·교환을 직접 실행해 관련 DB 데이터는 변경됐다. 스키마 변경 작업은 하지 않았다.
- 후속 작업: [2단계 중복 함수 정리](REFACTOR_STAGE2_2026-09-19.md), [3단계 화면별 HTML 분리](REFACTOR_STAGE3_2026-09-19.md), [4단계 기능별 JS 분리](REFACTOR_STAGE4_2026-09-19.md)의 코드 정리·자동 검증 완료. 4단계 Chrome 비로그인 화면 재확인도 마쳤으며, 로그인 후 실제 저장 흐름과 서버 퀴즈 조회 경고는 해당 기록에 범위를 명시했다. 기존 문제 수정은 파일 이동과 별도로 진행한다.
- [5단계 공통 디자인·파일 정리](REFACTOR_STAGE5_2026-09-20.md) 완료. 수정 위치는 해당 기록을 기준으로 한다.
- [6단계 로그인 후 최종 검증](REFACTOR_STAGE6_2026-09-20.md): 등록·수정·신규 참여·후기 저장·보상 적립·새로고침 유지 확인. 신규 교환 성공은 잔액 부족으로 미확인. 아래 표는 분리 전 기록이며 최신 결과와 남은 조건은 6단계 기록을 참고한다.
- [7단계 최종 확인](REFACTOR_STAGE7_2026-09-20.md) 완료: 개발·빌드 비교, 초안 복원·처리 횟수 검증, 수정 위치 안내 점검. 최종 테스트 245개 통과·기존 TODO 1개. 파일 분리 완료 판정과 예외 범위는 이 기록을 기준으로 한다.

| 재현 기준 | 값 |
|---|---|
| 원본 커밋 | `15c4d45e947581561e38aceb2e025f02a400fba8` |
| 실행 환경 | `creator-web/`, Node 24.18.0, npm 11.16.0, Vite 8.2.2, Chrome |
| 실행 명령 | `npm.cmd test -- --test-reporter=spec`, `npm.cmd run build`, `npm.cmd run preview -- --host 127.0.0.1 --port 4179 --strictPort` |
| 계정 조건 | 온보딩 완료·참여 0회·잔액 0 C / 등록 자격 충족·완료 6회·잔액 1,620 C |
| 화면 크기 | 일부 1920×897, 일부 1920×945. 크기가 달라 픽셀 단위 회귀 비교용은 아님 |
| 원본 정보 | [source-inventory.json](baselines/2026-09-19/source-inventory.json): 파일 해시·화면·함수 위치 |

`tester-mobile/`과 `index(mode).html`은 이번 분리 대상에서 제외한다. 캡처에는 계정 이메일·닉네임이 포함되어 있으며 비밀번호·토큰은 기록 대상에서 제외한다.

## 2. 동작 확인 결과

`확인`은 아래 사례를 실행했다는 뜻이며 모든 조건의 정상 동작을 보장하지 않는다. `부분 확인`은 해당 흐름 중 남은 검증이 있다는 뜻이다.

| ID | 흐름 | 확인한 결과 | 남은 검증 |
|---|---|---|---|
| B01 | 화면 이동 | 부분 확인: 비로그인 랜딩·로그인·탐색, 로그인 카드→상세→이전으로 복귀 | 비로그인 전체 연속 흐름 |
| B02 | 탐색 | 확인: 검색·카테고리 빈 결과, 전체 목록 복원, 높은 보상순 정렬 | 다른 정렬 조합·로딩/오류 |
| B03 | 비로그인 차단 | 미확인 | 참여·등록 클릭 시 로그인 안내와 차단 |
| B04 | 로그인 | 부분 확인: 로그인과 새로고침 후 세션·계정 표시 유지 | 로그아웃→재로그인, 계정 전환 |
| B05 | 온보딩 | 부분 확인: 2/5단계 표시, 사용자 완료 후 프로필 반영·새로고침 시 재노출 없음 | 이메일 인증·약관 분기 전체, 완료 계정 재로그인 |
| B06 | 등록 자격 | 부분 확인: 0/3회 차단, 완료 6회 진입 | 차단 시 작성 중 입력 보존 |
| B07 | 등록 입력 | 확인: 단계 이동·필수 입력 차단·토스트·리워드 계산·예산 초과 안내 | URL 허용 범위 문제는 K6 |
| B08 | 등록·수정 | 부분 확인: 신규 등록·목록·상세·수정 모드 값 복원·새로고침 유지 | 수정 재저장·태그·이미지 저장 |
| B09 | 참여·재개 | 부분 확인: 기존 참여를 리뷰 대기 목록에서 재개, 제출 후 목록 갱신 | 신규 참여 생성·나중에 작성→초안 복원 |
| B10 | 후기 제출 | 부분 확인: A안·주관식 답변 제출, 집계 6→7, 완료 CTA 비활성 | 설문·퀴즈·필수 스크린샷·서버 중복 요청 차단 |
| B11 | 후기 보상 | 부분 확인: +70 C, 원장 1건 추가, 완료 횟수 6→7 | 반복·동시 요청의 중복 보상 방지 |
| B12 | 교환 | 확인: 필터·상품 선택, 잔액 부족 버튼 비활성, 1,200 C 교환·내역·새로고침 유지 | 다른 상품·동시 요청 조건 |
| B13 | 프로필 | 부분 확인: 기존 값·글자 수·선택 필드, 취소 후 값 유지 | 수정 저장·헤더 갱신 |
| B14 | 알림 | 미확인: 목록이 비어 있어 대상 없음 | 대상 이동·읽음·설정 저장 |
| B15 | 공통 동작 | 부분 확인: 마지막 화면 복원, 전용 버튼으로 모달 닫힘 | 포커스·중복 이벤트·상단 메뉴 |

실제 저장 결과:

| 사례 | 실행 전 → 후 | 비고 |
|---|---|---|
| 등록 | 프로젝트 0→1건, `recruiting` | 제목·소개·모집 0/1명·보상 10 C·마감일 표시, 수정 모드 복원·새로고침 유지 |
| 등록 예산 | 화면 1,620→1,610 C, 새로고침 후 1,620 C | DB 지갑 1,620 C·원장 6건 그대로(K9) |
| 기존 참여 후기 | 지갑 1,620→1,690 C, 원장 6→7건 | 리뷰 대기 1→0, 완료 프로젝트 1→2, 상세 리뷰 6→7 |
| 상점 교환 | 지갑 1,690→490 C, 원장 7→8건 | 노션 템플릿 1,200 C, 교환 1건, 새로고침 후 유지 |

금액·기록 시각 일치만으로 트랜잭션 원자성을, CTA 비활성만으로 서버의 중복 요청 차단을 입증하지는 않는다.

확인용 프로젝트: `[기준기록] 분리 전 동작 확인용 테스트`, ID `0a7735ca-402c-4489-bf44-de8eb65a42d6`, URL `https://example.com`, 모집 1명×10 C, 마감 2026-10-03. **게시 종료 여부 확인이 남아 있다.**

## 3. 화면 위치 지도

줄 번호는 원본 커밋의 [creator-web/index.html](../creator-web/index.html) 기준이다. 변경 후에는 ID·함수 이름으로 찾는다.

| 화면 | HTML 시작 줄 / ID | 주요 기능 연결 |
|---|---|---|
| 랜딩 | 1010 / view-landing | navigateTo, 인증·탐색 진입 |
| 로그인 | 1156 / view-login | src/auth.js, authService.js, accountRouting.js |
| 탐색·프로젝트 목록 | 1364 / view-explore | filterFeed(6599), searchFeed(6643), sortFeed(6672), renderLiveProjectsToFeed(14355) |
| 프로젝트 등록·수정 | 2017 / view-create | goToStep(7230), validateCreateStep(7313), openEditPostModal(7581), publishNewTestAndReturnToDashboard(12705) |
| 프로젝트 상세 | 3054 / view-post | openPostDetail(8954), renderDBProjectToDetail(8362), switchPostDetailTab(9598) |
| 시안 투표 진행 | 3620 / view-vote-progress | renderInternalMissionFlow(10470), selectInternalVoteOption(10608) |
| 피드백 결과 | 3704 / view-feedback | openFeedbackReport(8778), applyFeedbackFilter(13608), submitCreatorReply(13671) |
| 코인 상점 | 3948 / view-market | filterMarketCategory(6905), selectMarketProduct(6925), executeExchange(6981) |
| 마이페이지 | 4327 / view-mypage | showMypageSectionOnly(5602), renderMyProjectCollection(5863), renderMyCoinData(13210), loadSupportTickets(13291) |
| 알림 목록 | 5100 / view-notifications | renderNotificationsUI(6425), handleNotificationItemClick(6346) |
| 알림 설정 | 5242 / view-notification-settings | toggleNotificationSetting(6410) |

마이페이지는 프로필·내 프로젝트·코인·문의 등 여러 기능을 포함한다. 화면 HTML을 하나로 추출하는 것과 내부 기능의 소유권을 나누는 것은 별도 작업이다.

## 4. 모달 및 동적 화면 위치

| 대상 | HTML 시작 줄 / ID | 관련 코드 |
|---|---|---|
| 목표 달성 | 226 / goal-achieved-modal | showGoalAchievedModal(13528) |
| 테스터 업데이트 알림 | 274 / notify-testers-modal | openNotifyModal(13754), sendUpdateNotification(13764) |
| 테스트 참여 | 305 / test-participate-modal | openTestParticipateModal(11922), proceedTestParticipateModal(11950) |
| 후기 작성 | 408 / write-feedback-modal | openFeedbackWriteModal(10642), renderFeedbackFormByTestType(10740), submitFeedbackForm(11105) |
| 내 프로필 수정 | 486 / edit-profile-modal | openEditProfileModal(13800), saveProfileChanges(14028), src/profileFieldsUi.js |
| 사용자 프로필 보기 | 753 / view-user-profile-modal | openUserProfileModal(13860) — 라우팅 화면 11개에는 포함하지 않음 |
| 등록 서약·자격 안내 | 816 / pledge-modal | openPledgeModal(11913), proceedPledgeModal(11887) |
| 환영 보너스 | 926 / welcome-bonus-modal | openWelcomeBonusModal(12005) |
| 온보딩 | 14697 / onboarding-wizard-modal | src/onboardingWizard.js, onboardingService.js |
| 약관 동의 | 15046 / terms-consent-modal | src/termsGate.js, termsService.js |

HTML만 옮겨서는 다음 디자인 수정 위치까지 정리되지 않는다.

- 내 프로젝트 카드: renderMyProjectCollection(5863)
- 알림 카드: createNotificationCardHTML(6506)
- 상세 리뷰·응답 요약: renderDetailReviews(8168), renderReviewAnswerSummary(8121)
- 투표 선택지·문항: renderInternalVoteOptionCard(10354), renderInternalQuestionCard(10421)
- 후기 입력 폼: renderFeedbackFormByTestType(10740)
- 실제 프로젝트 피드 카드: window.renderLiveProjectsToFeed(14355)
- 실제 상점 상품 카드: window.initSupabaseLiveDB(14467) 내부

## 5. 공통 코드와 디자인 기준

| 공통 대상 | 현재 위치 | 분리 시 보존할 내용 |
|---|---|---|
| 색상·폰트·모서리·그림자 | HTML 17–68 Tailwind 설정, 70–166 style | 기존 값을 유지한 채 추출. 두 위치의 중복 정의 조사 |
| 기본 폰트·스타일 공급 | HTML 11–16 외부 CDN | Pretendard 및 Tailwind 로드 후 화면 비교 |
| 사이드바 | getServiceSidebarNavigationMarkup(5462) 및 관련 렌더·활성 상태 함수 | 메뉴 링크, 현재 선택 항목, 내 정보 펼침 상태 |
| 상단 메뉴 | getServiceTopNavigationMarkup(6109) 및 관련 렌더·활성 상태 함수 | 로그인 표시, 메뉴 펼침·닫힘, Escape·바깥 클릭 |
| 토스트 | showGenericToast(6567), 리뷰·업데이트 토스트 코드 | 표시·닫힘·타이머 |
| 코인 표시 | updateAllCoinDisplays(7030), setUserCoinBalance(13204), renderMyCoinData(13210) | 상단·상점·내역·등록 비용 표시의 동일 잔액 |
| 오류 표시 | resolveFriendlyError(5380), src/errorCodes.js | 사용자 메시지·오류 코드 |
| 데이터 접근 | src/dataService.js | 조회·쓰기·업로드 API 계약, 반환 형식 |

현재 기본 디자인 값: 주요색 `#A9DD82`, 보조색 `#FDA2BC`, 본문색 `#191A1C`, 글꼴 Pretendard. Tailwind 설정의 최대 desktop 폭은 1440px이고 모서리 설정은 14/20/24px이다. 실제 화면에는 별도 색상·클래스도 있으므로 이것만으로 모든 디자인이 통일되어 있다고 판단하지 않는다.

## 6. 상태·초기화·분리 주의사항

1. **같은 이름의 함수가 두 번 선언됨.** openTestParticipateModal: 9637, 11922. closePledgeModal: 11917, 12000. 현재 같은 일반 스크립트의 뒤쪽 선언이 적용된다. 삭제·정리는 다음 단계에서 동작 검증과 함께 수행한다.
2. **일반 스크립트와 모듈이 함께 있음.** 큰 일반 스크립트는 5378–14693, 모듈 태그는 15109–15111(dataService → main → auth). 큰 스크립트를 바로 모듈로 바꾸면 인라인 핸들러와 전역 상태 연결이 달라진다.
3. **DOM 조회 시점이 중요함.** src/auth.js는 최상위에서 로그인 요소를 조회한다. 온보딩·약관 모달은 큰 스크립트 뒤에 있다. 분리 시 DOM이 준비되는 순서를 보존해야 한다.
4. **DOMContentLoaded 초기화가 두 곳에 있음.** 7983(썸네일), 14650(메뉴 이벤트·날짜·코인·알림·화면 복원·DB 초기화). 임의로 합치거나 실행 시점을 바꾸지 않는다.
5. **인증 코드도 DB 초기화를 호출함.** src/main.js는 데이터 서비스 등을 window에 연결하고, src/auth.js는 인증 흐름에서 initSupabaseLiveDB 등을 호출한다. 현재 호출 관계를 기록하고, 분리 후 중복 이벤트·조회·Realtime 구독 증가가 없는지 확인한다. 현재 중복 발생 여부를 실행으로 확인한 것은 아니다.
6. **공유 상태를 복제하지 않음.** currentViewKey/viewHistory(화면 이동), currentPostId(상세·참여·후기), userCoinBalance(지갑·상점·등록), currentParticipatingPostId(참여), isProjectEditMode/activeEditingProjectId(등록·수정), window.myProjectCollections 및 window.liveExploreProjects(조회 결과)의 소유 기능을 정한 뒤 이동한다.
7. **복원 동작을 보존함.** localStorage의 dondwae_current_view·dondwae_current_post_id, 알림 설정과 인증 관련 키, sessionStorage의 프로젝트 수정 대상·사용자별 미션 초안을 유지한다. 키 이름·저장 범위·만료 처리 변경은 파일 이동과 섞지 않는다.
8. `index.html`을 직접 참조하는 테스트 15개는 추출한 모듈·조립 HTML로 검사 대상을 옮기되 검증 항목은 유지한다. 목록: `rg -l 'index.html' creator-web/test`.

## 7. 분리 전에 이미 존재한 문제

이번 단계에서는 수정하지 않았다. 파일 이동 후 생긴 회귀와 구분하기 위한 목록이다.

| 번호 | 관찰 결과 | 관련 위치 / 증빙 |
|---|---|---|
| K1 | 참여 0회 계정에도 프로필은 3/3회 완료·등록 자격 획득 표시, 실제 등록은 차단 | 고정 문구 4457·4526줄, 캡처 25·29 |
| K2 | 등급·상위 3%·최근 본 12개·최근 적립 +600·다음 등급까지 550 C·인기 유저 등이 고정 표시 | 1479–1540, 4058–4059, 4444–4497, 4857–4859줄 |
| K3 | 알림 설정의 정상 진입 버튼 없음. 준비 중 화면만 존재 | view-notification-settings, 캡처 20은 직접 라우트 호출 |
| K4 | 참여·프로필 수정 모달이 Escape로 닫히지 않음 | 전용 취소/닫기로는 닫힘 |
| K5 | 상점 카테고리를 바꿔도 이전 상품이 교환 패널에 남음 | filterMarketCategory / selectMarketProduct, 캡처 22 |
| K6 | `htp:/잘못된주소`가 등록 단계 URL 검사를 통과하고 다음 항목 오류 표시 | isValidCreateStepUrl(7282), 캡처 34. 서버 저장 허용은 미확인 |
| K7 | 자격 충족 계정이 마이페이지에서 등록하면 서약 생략, 탐색·랜딩은 서약 표시 | navigateTo('create') / openPledgeModal(), 캡처 30·37 |
| K8 | 같은 계정에서 마이페이지 참여 수 2, completed_test_count·게이팅 횟수 6 | 집계 기준 확인 필요. 임의로 같은 값으로 통합하지 않음 |
| K9 | 등록 예산이 화면에서만 차감됐다가 새로고침 후 복구 | DB 지갑·원장 변화 없음. publishNewTestAndReturnToDashboard 주변 별도 조사 |

예산 초과 시에도 등록 화면은 “테스트 모드·결제 없이 등록”을 안내한다(캡처 36). 예산을 실제로 걷지 않는 의도인지 확인이 필요하며, K9의 화면 잔액 불일치는 별개로 기록한다.

## 8. 남은 검증과 다음 작업

| 우선 시점 | 남은 항목 |
|---|---|
| 중복 참여 함수 제거 전후 | B03: 비로그인 참여·등록 차단을 같은 조건으로 확인 |
| 인증·라우팅 코드 이동 전 | B01의 비로그인 연속 이동, B04 재로그인·계정 전환, B05 이메일 인증·약관 분기 |
| 등록·수정 코드 이동 전 | B06 차단 시 작성값 유지, B08 수정 재저장·태그·이미지 저장 |
| 참여·후기 코드 이동 전 | B09 신규 참여·나중에 작성·초안 복원, B10 설문·검증 방법별 제출, B10–B11 중복 요청·보상 방지 |
| 프로필·알림·문의 코드 이동 전 | B13 프로필 저장, B14 알림 대상 이동·읽음·설정 유지, 문의 제출 |
| 공통 UI·초기화 코드 이동 전 | B15 포커스·중복 이벤트, 상단 메뉴, 로딩·오류 상태. 정밀한 시각 비교가 필요하면 뷰포트를 고정해 다시 캡처 |
| 테스트 데이터 정리 시 | 확인용 프로젝트 `0a7735ca-402c-4489-bf44-de8eb65a42d6` 게시 종료 여부 확인. 이번 문서 정리에서는 삭제·게시 종료하지 않음 |

미확인 항목 전체를 지금 다시 검사할 필요는 없다. 해당 변경 전에 보충하고, 각 분리 단계에서 테스트·빌드 및 영향받는 사용자 흐름을 확인한다.

## 9. 캡처 색인

원본 49개는 [캡처 폴더](baselines/2026-09-19/)에 유지한다. 번호는 파일명 앞 두 자리다.

| 번호 | 내용 | 대표 증빙 |
|---|---|---|
| 01–04 | 랜딩·로그인·탐색·검색 빈 결과 | [01 랜딩](baselines/2026-09-19/01-landing.png), [04 빈 결과](baselines/2026-09-19/04-search-empty.png) |
| 05–06 | 등록 자격 차단·잔액 부족 | [05 등록 차단](baselines/2026-09-19/05-registration-gate.png), [06 잔액 부족](baselines/2026-09-19/06-exchange-insufficient.png) |
| 07–12 | 로그인 탐색·상세·리뷰·참여 모달·메뉴 | [11 참여 모달](baselines/2026-09-19/11-participate-modal.jpg) |
| 13–20 | 프로필·내 프로젝트·참여·스크랩·지갑·문의·알림·설정 | [17 코인 빈 내역](baselines/2026-09-19/17-mypage-coins.jpg) |
| 21–28 | 상점·프로필 수정·자격 문구 충돌·탐색 필터/정렬·화면 복원 | [25 자격 충돌](baselines/2026-09-19/25-gate-vs-profile-contradiction.jpg) |
| 29–37 | 자격 충족 프로필·등록 단계·입력 오류·예산 초과·서약 | [34 URL 검증](baselines/2026-09-19/34-create-step2-validation.jpg), [37 서약](baselines/2026-09-19/37-pledge-modal-allowed.jpg) |
| 38–41 | 게시 준비·등록 후 상세·목록·수정 모드 | [40 등록 목록](baselines/2026-09-19/40-myprojects-after-publish.jpg), [41 수정 모드](baselines/2026-09-19/41-edit-mode-restored.jpg) |
| 42–46 | 투표·문항·후기 제출 후 목록/CTA/리뷰 | [45 완료 CTA](baselines/2026-09-19/45-post-detail-after-review.jpg), [46 제출 리뷰](baselines/2026-09-19/46-review-tab-after-submit.jpg) |
| 47 | 빈 피드백 리포트 | [47 리포트](baselines/2026-09-19/47-feedback-report.jpg) |
| 48–49 | 교환 전 패널·교환 후 내역 | [48 교환 전](baselines/2026-09-19/48-exchange-ready.jpg), [49 교환 후](baselines/2026-09-19/49-coin-history-after-exchange.jpg) |

미확보: 탐색 로딩·오류, 후기 폼의 모든 검증 유형, 약관·온보딩·환영 보너스 모달, 상단 계정 메뉴·키보드 포커스 전체 상태.
