function requireAuthClient(client) {
  if (!client?.auth) {
    const error = new Error('Supabase authentication is not configured.');
    error.code = 'auth_not_configured';
    throw error;
  }
}

function requireAuthenticatedSession(data) {
  const session = data?.session || null;
  const user = session?.user || null;

  if (!session || !user) {
    const error = new Error('Authentication completed without an active session.');
    error.code = 'session_missing';
    throw error;
  }

  return { session, user };
}

export async function signInWithEmail(client, email, password) {
  requireAuthClient(client);

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  return requireAuthenticatedSession(data);
}

export async function signUpWithEmail(client, email, password, emailRedirectTo) {
  requireAuthClient(client);

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo }
  });

  if (error) throw error;
  if (!data?.user) {
    const missingUserError = new Error('Sign-up completed without a user.');
    missingUserError.code = 'signup_user_missing';
    throw missingUserError;
  }

  return {
    user: data.user,
    session: data.session || null
  };
}

export async function requestPasswordReset(client, email, redirectTo) {
  requireAuthClient(client);

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function resendSignupConfirmation(client, email, emailRedirectTo) {
  requireAuthClient(client);

  const { error } = await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo }
  });

  if (error) throw error;
}

export async function updateAuthenticatedPassword(client, password) {
  requireAuthClient(client);

  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  if (!data?.user) {
    const missingUserError = new Error('Password update completed without a user.');
    missingUserError.code = 'session_missing';
    throw missingUserError;
  }

  return data.user;
}

export async function clearLocalSession(client) {
  requireAuthClient(client);

  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function getActiveSessionUser(client) {
  requireAuthClient(client);

  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  return data?.session?.user || null;
}

export async function clearExistingLocalSession(client) {
  requireAuthClient(client);

  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data?.session) return false;

  await clearLocalSession(client);
  return true;
}

export function getAuthErrorMessage(error) {
  const messagesByCode = {
    auth_not_configured: 'Supabase가 연동되어 있지 않습니다. 관리자에게 문의해 주세요.',
    email_not_confirmed: '이메일 인증을 먼저 완료해 주세요.',
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    user_already_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    email_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
    email_address_invalid: '사용할 수 없는 이메일 주소입니다.',
    email_address_not_authorized: '현재 가입이 허용되지 않은 이메일 주소입니다.',
    email_provider_disabled: '현재 이메일 로그인을 사용할 수 없습니다.',
    weak_password: '비밀번호는 6자 이상이어야 합니다.',
    same_password: '현재 비밀번호와 다른 새 비밀번호를 입력해 주세요.',
    signup_disabled: '현재 신규 회원가입이 비활성화되어 있습니다.',
    captcha_failed: '보안 확인에 실패했습니다. 다시 시도해 주세요.',
    validation_failed: '입력한 정보를 다시 확인해 주세요.',
    access_denied: '인증 링크가 유효하지 않거나 만료되었습니다. 새 링크를 요청해 주세요.',
    otp_expired: '인증 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 요청해 주세요.',
    flow_state_expired: '인증 요청이 만료되었습니다. 처음부터 다시 시도해 주세요.',
    session_expired: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
    session_missing: '로그인 세션을 만들지 못했습니다. 이메일 인증 상태를 확인해 주세요.',
    signup_user_missing: '회원가입 정보를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
    over_email_send_rate_limit: '인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    unexpected_failure: '인증 데이터 처리 중 오류가 발생했습니다. 관리자에게 문의해 주세요.'
  };

  if (error?.code && messagesByCode[error.code]) {
    return messagesByCode[error.code];
  }

  if (/fetch|network/i.test(error?.message || '')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  return '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}
