# DB 8단계 — 자동 테스트·마이그레이션·운영 배포 준비

작성일: 2026-09-10  
대상: `creator-web` / Supabase 프로젝트 `mikswhcchbatrlpetngb`

## 완료 체크리스트

- [x] 로컬 마이그레이션 18개의 버전과 이름을 운영 DB 이력과 일치시킴
- [x] 과거 원격 시드 이력을 재실행하지 않는 no-op 이력 마커 추가
- [x] 이후 마이그레이션을 새 타임스탬프로 관리하는 팀 작업 지침 추가
- [x] 잠금파일 기반 설치 검증 통과
- [x] Node 자동 테스트 48/48 통과
- [x] Vite 프로덕션 빌드 통과
- [x] 빌드 결과를 로컬 프로덕션 프리뷰로 실행해 HTTP 200 확인
- [x] 빌드 자산에 Supabase 운영 URL과 publishable key가 포함되는지 확인
- [x] 운영 DB 사용자·프로필·지갑 무결성 확인
- [x] 운영 DB 전체 public 테이블 RLS 활성화 확인
- [x] 익명·로그인 역할별 공개/개인정보 조회 범위 확인
- [x] 참여·리뷰·상점 직접 쓰기 차단 및 트랜잭션 RPC 권한 확인
- [x] 커밋 대상 파일의 비밀값 패턴과 로컬 환경 파일 포함 여부 확인
- [x] 원격 브랜치와 현재 커밋 동기화 및 미해결 충돌 없음 확인
- [x] Vercel 운영 URL이 리디렉션 없이 HTTP 200으로 응답하는지 확인
- [x] `git diff --check` 통과

## 로컬 릴리스 검증

GitHub Actions 워크플로는 추가하지 않는다. 현재 팀 작업 방식에서는 GitHub Desktop 또는 터미널에서 아래 명령을 실행하는 것으로 충분하며, 이 선택은 서비스·Supabase·Vercel 기능에 영향을 주지 않는다.

1. `npm ci`
2. `npm test`
3. `npm run build`

브라우저나 Vercel이 운영 DB 마이그레이션을 자동 실행하지 않으며, 운영 마이그레이션 적용 권한은 계속 DB 관리자에게만 둔다.

## 마이그레이션 이력

- 운영 DB 이력: 18건
- 로컬 SQL 파일: 18건
- 버전 및 이름 불일치: 0건
- 최신 이력: `20260910130451_stage_7_query_and_index_optimization.sql`

`20260909171123_seed_home_projects_for_existing_user.sql`은 로컬 마이그레이션 관리 도입 전에 운영 DB에서 실행된 시드의 이력 마커다. 공유 운영 DB에서는 이미 처리된 버전이므로 재실행하지 않는다. 신규 Supabase 프로젝트를 만들 때는 프로젝트 전용 시드가 포함된 `supabase_schema.sql`을 검토한 뒤 사용한다.

## 운영 DB 검증 결과

- Auth 사용자: 6명
- 공개 프로필: 6건
- 코인 지갑: 6건
- Auth 사용자 중 프로필 누락: 0건
- 프로필 중 Auth 사용자 누락: 0건
- 프로필 중 지갑 누락: 0건
- 프로젝트: 9건
- 프로젝트 검색 컬럼 누락: 0건
- RLS가 꺼진 public 테이블: 0개

역할별 스모크 테스트 결과:

- 익명 사용자는 공개 프로젝트 9건, 공개 프로필 6건, 활성 상점 상품 4건을 조회할 수 있다.
- 익명 사용자는 사용자 이메일과 프로젝트 테스트 비밀번호를 조회할 수 없다.
- 로그인 사용자는 자기 프로필과 지갑을 각각 1건 조회하며, 다른 사용자의 지갑과 고객센터 문의는 0건만 보인다.
- 로그인 사용자는 참여·리뷰를 테이블에 직접 추가하거나 등록 자격을 직접 수정할 수 없다.
- 익명 사용자는 참여 RPC를 실행할 수 없고 로그인 사용자만 참여·리뷰·상점 트랜잭션 RPC를 실행할 수 있다.

모든 스모크 테스트는 운영 데이터를 추가·수정·삭제하지 않는 방식으로 수행했다.

## 빌드 및 배포 확인

- `npm ci --dry-run --ignore-scripts`: 통과
- `npm test`: 48/48 통과
- `npm run build`: 통과
- 로컬 프로덕션 프리뷰 `http://127.0.0.1:4173/`: HTTP 200
- Vercel 프로젝트: `don-dwae-web`
- Vercel Root Directory: `creator-web`
- Vercel Build Command: `npm run build`
- Vercel Output Directory: `dist`
- 운영 URL `https://tau-pink-98.vercel.app/`: HTTP 200, 다른 주소로 리디렉션되지 않음

현재 변경사항은 아직 커밋·push하지 않았으므로 운영 URL에는 이 작업이 들어가지 않았다. `main` push 후 Vercel Git 연동 배포가 실행되는지 대시보드에서 배포 상태와 커밋 SHA를 최종 확인한다.

## 보안 및 Advisor 메모

- 커밋 후보 텍스트 파일 63개에서 secret key, JWT, GitHub/Vercel 토큰, private key 패턴 발견: 0건
- `.env`, `.env.local` 등 로컬 환경 파일이 커밋 후보에 포함된 건수: 0건
- `.env.example`에는 브라우저 공개용 Supabase URL과 publishable key만 둔다.
- Security Advisor의 `SECURITY DEFINER` 경고 5건은 인증 사용자 전용 트랜잭션/개인정보 RPC다. 입력값과 `auth.uid()`를 서버에서 검증하고 익명 실행 권한을 제거한 현재 설계에 필요한 함수다.
- Auth의 유출 비밀번호 보호 기능은 비활성 상태다. 코드 push의 차단 항목은 아니지만 공개 출시 전 Supabase Dashboard에서 활성화하는 것을 권장한다.
- Performance Advisor의 기본 키 없음 6건은 private 복구 백업 테이블이며 운영 API 테이블이 아니다.
- 새 인덱스의 미사용 표시는 현재 데이터와 호출량이 적기 때문이며, 7단계 실행 계획에서 실제 조회 조건을 지원하는 것을 확인했다.

## push 직전 순서

```powershell
git add -A
git diff --cached --check
git status --short
npm --prefix creator-web test
npm --prefix creator-web run build
git commit -m "feat: complete database optimization and release checks"
git push origin main
```

push 후 Vercel 배포의 대상 커밋 SHA가 새 커밋과 같은지만 확인하면 된다.
