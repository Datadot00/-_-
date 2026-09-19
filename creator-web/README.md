# 돈돼 실제 웹 서비스

돈돼 데스크톱 웹 MVP의 개발·배포 루트입니다. 제작자와 테스터가 같은 웹을 사용하며, `tester-mobile/`과 루트 `index(mode).html`은 참고용입니다.

```bash
npm install
npm run dev
npm test
npm run build
```

개발 주소는 `http://localhost:3000`, 빌드 결과는 `dist/`입니다. Vercel Root Directory는 `creator-web`입니다.

## 수정 위치

- `index.html`: 화면과 공통 설정을 불러오는 목차
- `src/features/`: 기능별 화면·동작·상태·전용 팝업 — [기능 파일 안내](src/features/README.md)
- `src/shared/`: 공통 디자인·메뉴·카드·데이터 접근 — [디자인 및 팀 작업 범위](src/shared/README.md)
- `src/app/`: 시작 순서·초기 조회·일반 JS 조립 목록 — [실행 구조](src/app/README.md)
- `public/images/`: 브랜드 이미지와 마스코트 원본

HTML 조각은 빌드 전에 합치고, 기능별 일반 JS는 기존 버튼 연결을 유지하도록 한 실행 파일로 조립합니다. 생성된 `dist/`를 직접 수정하지 않습니다.

## 데이터 연결

인증·프로젝트·참여·후기·코인·교환은 Supabase 데이터 서비스와 연결돼 있습니다. 서버 설정·마이그레이션은 [Supabase 안내](supabase/README.md)를 확인합니다. 코인은 MVP의 가상 기능입니다.

`.env.example`을 참고해 Git에서 제외되는 `.env.local`을 설정합니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_USE_MOCK_DATA=false
```

secret/service role 키는 브라우저 환경변수에 넣지 않습니다. 같은 파일을 동시에 수정하지 않으며, 공통 파일은 영향받는 기능의 담당자와 작업 범위를 맞춥니다.
