# 삼각대 파이널 프로젝트

SeSAC 파이널 프로젝트 **돈돼(Don Dwae)** 저장소입니다.

## 현재 개발 기준

돈돼는 서비스 유효성을 검증하기 위한 **데스크톱 웹 MVP**로 개발합니다.

- 실제 서비스 프론트엔드: `creator-web/`
- 실제 서비스 진입 파일: `creator-web/index.html`
- Vercel 배포 시 Root Directory: `creator-web`
- 백엔드 예정: Supabase Auth, Database, Storage
- 사용자 행동 분석 예정: GTM + GA4 웹 스트림
- 코인과 결제: MVP 기간에는 실제 금전 거래가 없는 가상 기능

`tester-mobile/`과 `index(mode).html`은 기존 사용자 흐름을 확인하기 위한 참고용 프로토타입이며 실제 서비스 배포 대상이 아닙니다.

## 현재 실행 방법

Node.js를 설치한 뒤 `creator-web`에서 다음 명령을 실행합니다.

```bash
cd creator-web
npm install
npm run dev
```

Vite 로컬 개발 주소는 `http://localhost:3000`입니다. `creator-web/package.json`의 개발 스크립트가 포트 `3000`을 사용하도록 고정되어 있습니다.

## 폴더 역할

```text
돈돼/
├── creator-web/          # 실제 서비스 루트 및 개발 기준 폴더
│   ├── index.html        # 화면 조립 순서·공통 스타일·Tailwind 설정
│   ├── build/            # HTML 및 일반 JavaScript 조립 처리
│   ├── vite.config.js    # Vite 조립 설정
│   ├── public/           # 서비스 이미지 원본 1벌(저장소 유일본)
│   └── src/
│       ├── app/          # 앱 시작·조회 조율·일반 JS 조립 목록
│       ├── features/     # 기능별 HTML·동작·렌더링·상태·전용 팝업
│       └── shared/       # 내비게이션·공통 UI·오류 처리·데이터 서비스
├── tester-mobile/        # 모바일 플로우 참고용 프로토타입(배포 제외)
├── index(mode).html      # 과거 웹/모바일 선택 포털(배포 제외)
├── assets/               # 화면에 쓰지 않는 디자인 원본
├── docs/                 # 설계, 리서치 및 체크리스트 문서
│   ├── mockups/          # 화면 설계 시안 스크린샷(desktop/, mobile/)
│   └── legal/            # 약관 및 방침 원본 문서
└── .gitignore            # 저장소 전체 제외 규칙(루트 한 곳에서 관리)
```

### 이미지 규칙

서비스가 쓰는 이미지는 `creator-web/public/`에 **한 벌만** 둡니다. 예전에는 같은 이미지가 루트, `assets/`, `creator-web/`, `tester-mobile/`에 최대 4벌씩 흩어져 있었습니다.

- 참조는 항상 루트 절대경로로 씁니다. 예: `src="/images/brand/logo-coin.png"`
- `./`나 `../`로 시작하는 상대경로는 쓰지 않습니다. 일반 JavaScript 안의 이미지 경로 문자열은 Vite가 경로를 바꿔주지 않아 배포본에서 404가 납니다.
- `public/` 파일은 Vite가 `dist/` 루트로 그대로 복사하므로 base64 인라인이 아니라 브라우저 캐시를 탑니다.
- 프로토타입(`tester-mobile/`, `index(mode).html`)은 빌드를 거치지 않으므로 `../creator-web/public/images/...` 경로로 같은 원본을 참조합니다.

화면 설계 시안(`docs/mockups/`)은 참고 자료이며 코드가 불러오지 않습니다.

## 배포 기준

Vercel 프로젝트를 연결할 때 다음 설정을 사용합니다.

| 설정 | 값 |
|---|---|
| Root Directory | `creator-web` |
| Framework Preset | `Vite` |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Vercel 프로젝트는 `don-dwae-web`이며 GitHub 저장소의 `main` 브랜치 Push를 자동 배포합니다.

## main 브랜치 협업 규칙

현재 MVP 단계에서는 팀의 Git 사용 난도를 낮추기 위해 `main` 브랜치에서 작업합니다.

1. 작업 시작 전에 GitHub Desktop에서 `Fetch origin`과 `Pull origin`을 실행합니다.
2. 팀 채팅에 수정할 파일과 작업 내용을 알립니다.
3. 같은 파일은 한 번에 한 사람만 수정합니다.
4. 하나의 작은 기능 단위로 Commit하고 Push합니다.
5. Push 후 팀원에게 최신 `main`을 Pull하도록 알립니다.
6. `git push --force` 또는 강제 Push는 사용하지 않습니다.

HTML과 JavaScript는 `creator-web/src/features/` 아래에서 기능별로 관리합니다. [기능별 수정 위치](creator-web/src/features/README.md)를 보고 담당 파일을 나누어 작업합니다. 실행 명령과 배포 설정은 같습니다.

`index.html`에는 공통 스타일과 화면 조립 순서가 남아 있습니다. `app/`·`shared/`·조립 목록처럼 여러 기능에 영향을 주는 파일은 팀원과 수정 범위를 맞춥니다. 기능별 일반 JS는 기존 버튼 연결을 위해 실행 시 하나로 합쳐지므로 전역 함수·상태 이름을 중복 선언하지 않습니다. 자세한 내용은 [앱 실행 구조](creator-web/src/app/README.md)를 참고합니다.

## 커밋 메시지

```text
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 구조 개선
```

## 보안 주의사항

- API Secret Key와 비밀번호는 절대 Git에 Commit하지 않습니다.
- 브라우저에는 Supabase publishable key만 사용합니다.
- Supabase secret/service role key는 프론트엔드 코드와 `VITE_` 환경변수에 넣지 않습니다.
- `.env.local`, `node_modules`, `dist`, `.vercel`은 루트 `.gitignore`에서 제외합니다.

## 관련 문서

- [데이터 파이프라인 설계 리서치](docs/data-pipeline-research.md)
