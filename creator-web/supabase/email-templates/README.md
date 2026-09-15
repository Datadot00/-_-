# Supabase 회원가입 확인 링크 설정

이 폴더의 템플릿은 저장소에 보관하는 운영 기준본이며, hosted Supabase 프로젝트에는 자동 반영되지 않는다.

1. Supabase Dashboard의 **Authentication > Sign In / Providers > Email**에서 `Confirm email`을 활성화한다.
2. **Authentication > Email Templates > Confirm signup**을 연다.
3. 제목을 `돈 돼? 회원가입 이메일 확인`으로 지정한다.
4. 본문에 [`confirmation.html`](./confirmation.html)의 내용을 붙여 넣고 저장한다.
5. 템플릿에 `{{ .ConfirmationURL }}`이 포함되고 `{{ .Token }}`이 포함되지 않았는지 확인한다.
6. Supabase의 Site URL과 Redirect URLs에 실제 서비스 및 로컬 주소를 등록한다.

프런트엔드는 회원가입 시 `emailRedirectTo`를 전달한다. 사용자가 메일의 기본 확인 링크를 누르면 Supabase가 이메일을 확인하고 앱으로 돌아오며, 복원된 세션은 공통 계정 라우터를 거쳐 약관 동의와 프로필 온보딩 순서로 이동한다.

참고: [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
