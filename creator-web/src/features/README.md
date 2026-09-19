# 기능별 수정 위치

경로는 `src/features/` 기준입니다. 화면 배치·문구는 `view.html`, 동작은 `actions.js`, 동적 목록·폼은 `render.js`, 상태 기본값은 `state.js`에서 수정합니다. 프로젝트 카드 마크업은 [공통 카드](../shared/projects/card.js), 공통 스타일·메뉴·이미지는 [공통 디자인 안내](../shared/README.md)를 봅니다. 초기화가 필요한 기능에는 `init.js`도 있습니다.

| 기능 | 화면 | 동작·전용 파일 | 동적 화면 |
|---|---|---|---|
| 첫 화면 | [landing/view.html](landing/view.html) | 로그인·화면 이동은 공통 내비게이션 | — |
| 로그인·가입·온보딩·약관 | [auth/view.html](auth/view.html) | `auth/auth.js`, `authService.js`, `accountRouting.js`, `onboarding*.js`, `terms*.js` | `auth/render.js`, 기존 위저드·약관 모듈 |
| 목록 검색·필터·정렬 | [explore/view.html](explore/view.html) | [explore/actions.js](explore/actions.js) | [explore/render.js](explore/render.js) |
| 프로젝트 등록·수정 | [project-editor/view.html](project-editor/view.html) | [actions.js](project-editor/actions.js), [validation.js](project-editor/validation.js), [edit.js](project-editor/edit.js), [publish.js](project-editor/publish.js) | [project-editor/render.js](project-editor/render.js) |
| 프로젝트 상세 | [project-detail/view.html](project-detail/view.html) | [project-detail/actions.js](project-detail/actions.js) | [project-detail/render.js](project-detail/render.js) |
| 참여·미션·투표 | [participation/view.html](participation/view.html) | [actions.js](participation/actions.js), [drafts.js](participation/drafts.js) | [participation/render.js](participation/render.js) |
| 후기 작성·제출·표시 | `reviews/write-feedback-modal.html` | [actions.js](reviews/actions.js), [submit.js](reviews/submit.js) | [reviews/render.js](reviews/render.js) |
| 제작자 피드백 결과 | [feedback-report/view.html](feedback-report/view.html) | [feedback-report/actions.js](feedback-report/actions.js) | [feedback-report/render.js](feedback-report/render.js) |
| 상점·교환 | [market/view.html](market/view.html) | [market/actions.js](market/actions.js) | [market/render.js](market/render.js) |
| 마이페이지·내 프로젝트·문의 | [mypage/view.html](mypage/view.html) | [mypage/actions.js](mypage/actions.js) | [mypage/render.js](mypage/render.js) |
| 내 프로필 수정·사용자 프로필 | `profile/edit-profile-modal.html`, `user-profile-modal.html` | [profile/actions.js](profile/actions.js), `profileFieldsUi.js` | [profile/render.js](profile/render.js) |
| 알림·알림 설정 | [notifications/view.html](notifications/view.html), `settings-view.html` | [notifications/actions.js](notifications/actions.js) | [notifications/render.js](notifications/render.js) |
| 스크랩 | 목록·상세 버튼 | [bookmarks/actions.js](bookmarks/actions.js) | 버튼 상태도 같은 파일 |
| 지갑·코인 내역 | 마이페이지·상점 | [wallet/actions.js](wallet/actions.js) | [wallet/render.js](wallet/render.js) |
| 환영 보너스 | `rewards/welcome-bonus-modal.html` | [rewards/actions.js](rewards/actions.js) | 모달의 고정 HTML |

기능 전용 팝업은 해당 폴더에 있습니다. 여러 화면이 함께 쓰는 내비게이션·토스트·프로젝트 상태 판별·오류 처리·Supabase 데이터 접근은 `src/shared/`에 있습니다.

## 실행·협업 규칙

- 기존처럼 `npm run dev`, `npm test`, `npm run build`를 사용합니다. HTML·일반 JS 수정 시 자동 새로고침됩니다.
- `index.html`은 화면과 공통 설정의 조립 순서를 보유합니다. 스타일·Tailwind 설정은 `shared/styles/`에서 관리합니다.
- 기능별 일반 JS는 [runtime-manifest.js](../app/runtime-manifest.js)의 순서로 합칩니다. **현재는 전역 범위를 공유**하므로 같은 이름의 함수·상태를 중복 선언하지 않습니다. 새 일반 JS 파일은 조립 목록에 추가합니다.
- 서버 조회를 함께 묶는 코드는 [app/data-sync.js](../app/data-sync.js), 시작 순서는 [app/bootstrap.js](../app/bootstrap.js)를 봅니다. [실행 구조 안내](../app/README.md)에서 일반 스크립트와 ES 모듈의 차이를 확인할 수 있습니다.
- DOM ID·인라인 이벤트 이름은 기존 JS 연결에 사용합니다. 디자인 변경 때 유지하고, 생성된 `dist/` 파일은 수정하지 않습니다.
- 후기 표시 등 기존에 데이터 조회와 화면 갱신이 결합된 일부 함수는 `render.js`에 함께 있습니다. 이번에는 저장·검증 규칙을 바꾸지 않고 파일 경계를 정리했습니다.
