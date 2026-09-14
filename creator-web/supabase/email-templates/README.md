# Supabase 회원가입 이메일 OTP 설정

이 폴더의 템플릿은 저장소에 보관하는 운영 기준본이며, hosted Supabase 프로젝트에는 자동 반영되지 않는다.

1. Supabase Dashboard의 **Authentication > Sign In / Providers > Email**에서 `Confirm email`을 활성화한다.
2. **Authentication > Email Templates > Confirm signup**을 연다.
3. 제목을 `돈 돼? 이메일 인증번호`로 지정한다.
4. 본문에 [`confirmation.html`](./confirmation.html)의 내용을 붙여 넣고 저장한다.
5. 템플릿에 `{{ .Token }}`이 포함되고 `{{ .ConfirmationURL }}`이 포함되지 않았는지 확인한다.
6. Email OTP expiration은 운영 정책에 맞게 설정한다. 이 프로젝트의 권장값은 600초(10분)다.

프런트엔드는 회원가입 후 `supabase.auth.verifyOtp({ email, token, type: 'email' })`로 인증하고, 성공한 세션을 공통 계정 라우터에 전달한다. 이전에 발송된 링크형 확인 메일의 복귀 처리도 당분간 호환을 위해 유지한다.

참고: [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
