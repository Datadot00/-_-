# Supabase 이메일 로그인 체크리스트

## 자동 구현 및 검증

- [x] Supabase MCP 연결과 대상 프로젝트 확인
- [x] 활성 publishable key 확인
- [x] `.env.local`에 Supabase URL과 publishable key 설정
- [x] `.env.example`에 팀 공용 Supabase 브라우저 설정 작성
- [x] Email Provider 활성화 확인
- [x] 신규 회원가입 허용 상태 확인
- [x] 이메일 확인 필수 상태 확인
- [x] 가상 계정 로그인 UI 제거
- [x] 이메일·비밀번호 로그인 UI 구현
- [x] `signUp` 회원가입 구현
- [x] `signInWithPassword` 로그인 구현
- [x] `getSession` 세션 복원 구현
- [x] `onAuthStateChange` 인증 상태 감지 구현
- [x] 로그인 사용자 이메일 표시
- [x] `signOut` 로그아웃 구현
- [x] 미인증 사용자의 서비스 화면 접근 차단
- [x] Google 가상 로그인 비활성화
- [x] JavaScript 문법 검사 통과
- [x] Vite 프로덕션 빌드 통과
- [x] 로컬 개발 서버 HTTP 200 응답 확인
- [x] 실제 Supabase Auth 설정 응답 확인
- [x] 예약 이메일 실패 로그인 요청이 `invalid_credentials`로 거부되는지 확인

## Supabase 대시보드에서 확인

- [ ] Site URL을 `https://don-dwae-web-datadot.vercel.app`으로 설정
- [ ] Redirect URLs에 `http://localhost:3000/**` 등록
- [ ] Redirect URLs에 `https://don-dwae-web-datadot.vercel.app/**` 등록
- [ ] Redirect URLs에 Preview 패턴 `https://*-datadot.vercel.app/**` 등록
- [ ] 실제 사용자에게 메일을 보낼 운영 SMTP 설정

## Vercel에서 확인

- [x] Production·Preview·Development에 `VITE_SUPABASE_URL` 등록
- [x] Production·Preview·Development에 `VITE_SUPABASE_PUBLISHABLE_KEY` 등록
- [x] Production·Preview·Development에 `VITE_USE_MOCK_DATA=false` 등록
- [ ] 환경변수 등록 후 재배포

## 실제 사용자 흐름 검증

- [ ] 실제 이메일로 회원가입
- [ ] 인증 메일 수신
- [ ] 인증 링크 클릭 후 앱으로 복귀
- [ ] 인증 완료 계정으로 로그인
- [ ] 잘못된 비밀번호 오류 문구 확인
- [ ] 새로고침 후 로그인 세션 유지 확인
- [ ] 로그아웃 후 보호 화면 접근 차단 확인
- [ ] Vercel 배포 주소에서 같은 흐름 재검증

## 팀원 로컬 실행

Vercel `datadot` 팀에 참여한 팀원은 저장소를 Pull한 뒤 다음 순서로 같은 개발 환경을 받을 수 있습니다.

```powershell
cd creator-web
npm install
npx vercel@latest link --project don-dwae-web --scope datadot --yes
npx vercel@latest env pull .env.local --environment=development --yes
npm run dev
```

Vercel 프로젝트 권한이 없는 팀원은 `.env.example`을 `.env.local`로 복사한 뒤 프로젝트 관리자가 전달한 Supabase URL과 publishable key를 입력합니다.

## 참고

- 이메일 로그인 자체에는 `public` 스키마 테이블이 필요하지 않습니다.
- 닉네임, 역할, 프로필 정보를 저장할 때 `profiles` 테이블과 RLS를 별도 구현합니다.
- 브라우저에는 publishable key만 사용하고 secret 또는 service role 키는 넣지 않습니다.

## 진행 기록

- 2026-09-07: Supabase Email Provider 활성화, 회원가입 허용, 이메일 인증 필수 상태 확인
- 2026-09-07: 존재하지 않는 예약 이메일의 로그인 요청이 `invalid_credentials`로 정상 거부됨
- 2026-09-07: `http://localhost:3000` 로컬 실행과 Vite 환경변수 주입 확인
- 2026-09-07: 실제 받은 편지함을 사용하는 회원가입·인증 링크 검증은 사용자 테스트 대기
