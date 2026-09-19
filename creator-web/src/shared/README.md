# 공통 디자인과 팀 작업 범위

특정 화면만 바꾸면 `features/<기능>/`에서 작업합니다. 여러 화면에 같은 변경을 적용할 때는 아래 공통 파일을 수정합니다.

| 바꾸려는 것 | 수정할 파일 |
|---|---|
| 색상·폰트·공통 그림자·모서리 값 | [styles/theme.html](styles/theme.html) — Tailwind 설정과 CSS 변수의 원본 |
| 기본 글꼴·화면 전환·스크롤바·로딩 표현 | [styles/base.css](styles/base.css) |
| 공통 버튼·입력창·모달·헤더·사이드바 외형 | [styles/components.css](styles/components.css) |
| 상단 메뉴·사이드바 메뉴 항목 | [navigation/render.js](navigation/render.js) |
| 메뉴 이동·펼침·현재 메뉴 표시 | [navigation/actions.js](navigation/actions.js), [state.js](navigation/state.js) |
| 사이드바 로고·메뉴 삽입 위치 | [sidebar-brand.html](navigation/sidebar-brand.html), [sidebar-menu.html](navigation/sidebar-menu.html) |
| 사이드바 등록 버튼 | `navigation/create-project-button.html`(서약 진입), `create-project-direct-button.html`(등록 화면 진입) |
| 프로젝트 카드 | [projects/card.js](projects/card.js): `createFeedProjectCard`(목록), `renderMyProjectCard`(내 프로젝트), `renderPublishedProjectCard`(등록 직후) |
| 프로젝트 상태 배지·공통 판별 | `projects/render.js`, `projects/actions.js` |
| 안내 토스트 | `ui/toast.js`, `ui/generic-toast.html` |
| 서버 데이터 접근·오류 문구 | `data/`, `errors/` |

카드는 화면별 형태와 버튼이 달라 세 가지 변형을 유지합니다. 데이터 조회·필터링은 각 기능의 `render.js`/`actions.js`에서 처리하고 카드 마크업은 이 공통 파일을 사용합니다.

`ui-modal`은 배경·위치, `ui-dialog`는 내용 상자, `ui-input`은 입력 테두리·모서리를 담당합니다. `hidden`/`flex`, 모달 폭, 화면별 간격과 상태 클래스는 기능 파일에서 관리합니다. 기존 버튼 색상 차이는 `ui-button-primary`와 `ui-button-create`로 보존했습니다.

## 이미지

| 원본 위치 | 용도 |
|---|---|
| `public/images/brand/` | 기본 로고·코인 로고·파비콘 |
| `public/images/mascots/` | 배고픈/배부른 마스코트 |

서비스에서는 `/images/brand/logo-default.png`처럼 절대경로로 참조합니다. 업로드 이미지·외부 썸네일 URL은 데이터 서비스가 제공하며 이 폴더로 복사하지 않습니다. 저장소 루트의 `assets/`는 디자인 원본, `docs/mockups/`는 시안, `docs/baselines/`는 이전 검증 기록입니다.

## 협업

- 화면 담당자: `features/<기능>/view.html`, 전용 팝업, 동작·상태 파일. 카드 외형 변경은 공통 카드 파일 담당자와 조율합니다.
- 공통 디자인 담당자: `shared/styles/`, `shared/navigation/`, `shared/projects/card.js`, 공통 이미지. 수정 전 영향받는 화면과 파일을 팀에 공유합니다.
- 앱·빌드 담당자: `app/`, `build/`, `vite.config.js`, `index.html`의 조립 순서. 새 일반 JS는 `app/runtime-manifest.js`에 추가합니다.
- 같은 파일의 동시 수정은 피합니다. 공통 변경 후 `npm test`, `npm run build`와 해당 화면의 버튼·모달을 확인합니다.
- `dist/`는 수정하지 않습니다. `app/main.js`의 `window` 연결은 현재 버튼·일반 JS에 필요하므로 임시 코드로 보고 삭제하지 않습니다.

전체 기능별 위치는 [기능 파일 안내](../features/README.md)를 봅니다. `tester-mobile/`과 루트 `index(mode).html`은 참고용이며 실제 서비스 배포 대상이 아닙니다.
