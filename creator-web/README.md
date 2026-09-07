# 돈돼 실제 웹 서비스

이 폴더는 돈돼 데스크톱 웹 MVP의 **실제 서비스 루트**입니다.

## 기준

- 진입 파일: `index.html`
- Vercel Root Directory: `creator-web`
- 서비스 형태: 데스크톱 웹 단일 서비스
- 사용자 역할: 제작자와 테스터가 같은 웹에서 기능을 사용
- 모바일 앱 및 별도 모바일 페이지: MVP 배포 범위에서 제외
- 백엔드: Supabase Auth 클라이언트 연결 완료, 운영 데이터 연동 예정
- 분석: GTM + GA4 웹 스트림 연동 예정
- 코인·결제: 실제 금전 거래가 없는 MVP 가상 기능

## 현재 상태

현재 `index.html`은 인터랙티브 프론트엔드 프로토타입입니다.

- Vite 실행·빌드 환경 구성이 완료되었습니다.
- Vercel 프로젝트 `don-dwae-web`과 GitHub 자동 배포 연결이 완료되었습니다.
- Vercel은 저장소의 `creator-web`을 Root Directory로 사용합니다.

- Supabase 이메일·비밀번호 회원가입, 로그인, 세션 유지, 로그아웃이 연결되었습니다.
- 이메일 회원가입은 인증 메일 확인 후 로그인할 수 있습니다.
- Google 로그인 버튼은 비활성 상태이며 아직 실제 OAuth가 아닙니다.
- 테스트, 참여, 피드백, 코인은 브라우저 메모리 상태입니다.
- 이미지 업로드와 URL 검증은 화면 시뮬레이션입니다.

외부 사용자에게 공개하기 전에 Supabase Redirect URL, 운영 환경변수와 핵심 데이터 저장을 연결해야 합니다.

## Supabase 로컬 환경변수

`.env.example`을 참고해 Git에서 제외되는 `.env.local`에 다음 값을 설정합니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_USE_MOCK_DATA=false
```

Supabase secret 또는 service role 키는 브라우저 환경변수에 넣지 않습니다.

## 다음 작업

1. 이미지 경로를 `public/assets` 기준으로 정리
2. Supabase 대시보드의 Site URL·Redirect URL 구성
3. 테스트 등록·참여·피드백 데이터 저장
4. 가상 코인 내역 저장
5. Vercel 운영 환경변수와 첫 배포 검증
6. GTM·GA4 핵심 이벤트 연결

## 협업

현재 `index.html`은 단일 대형 파일입니다. 수정하기 전에 반드시 최신 `main`을 Pull하고, 팀 채팅에 작업 시작을 알린 뒤 한 사람만 이 파일을 수정합니다.
