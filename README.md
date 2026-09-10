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
│   └── index.html        # 실제 서비스 진입 파일
├── tester-mobile/        # 모바일 플로우 참고용 프로토타입(배포 제외)
├── index(mode).html      # 과거 웹/모바일 선택 포털(배포 제외)
├── assets/               # 공통 이미지 리소스
└── docs/                 # 설계, 리서치 및 체크리스트 문서
```

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

특히 `creator-web/index.html`은 현재 화면과 JavaScript가 함께 있는 큰 파일이므로 동시 수정을 금지합니다. 파일이 모듈로 분리된 뒤에는 담당 파일을 나누어 작업합니다.

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
- `.env.local`, `node_modules`, `dist`는 Git에서 제외합니다.

## 관련 문서

- [데이터 파이프라인 설계 리서치](docs/data-pipeline-research.md)
