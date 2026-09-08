import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';

const PUBLIC_VIEWS = new Set(['landing', 'login']);

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authDescription = document.getElementById('auth-description');
const authFormPanel = document.getElementById('auth-form-panel');
const authModeTabs = document.getElementById('auth-mode-tabs');
const authSocialSection = document.getElementById('auth-social-section');
const confirmationPanel = document.getElementById('auth-confirmation-panel');
const confirmationEmail = document.getElementById('auth-confirmation-email');
const emailSentTitle = document.getElementById('auth-email-sent-title');
const emailSentMessage = document.getElementById('auth-email-sent-message');
const emailInput = document.getElementById('auth-email-input');
const passwordGroup = document.getElementById('auth-password-group');
const passwordInput = document.getElementById('auth-password-input');
const passwordHint = document.getElementById('auth-password-hint');
const passwordConfirmationGroup = document.getElementById('auth-password-confirm-group');
const passwordConfirmationInput = document.getElementById('auth-password-confirm-input');
const loginModeButton = document.getElementById('auth-mode-login');
const signupModeButton = document.getElementById('auth-mode-signup');
const authSubmitButton = document.getElementById('btn-auth-submit');
const authSubmitButtonText = document.getElementById('btn-auth-submit-text');
const forgotPasswordButton = document.getElementById('btn-auth-forgot-password');
const recoveryBackButton = document.getElementById('btn-auth-recovery-back');
const resendButton = document.getElementById('btn-auth-resend');
const backToLoginButton = document.getElementById('btn-auth-back-to-login');
const passwordUpdateForm = document.getElementById('auth-password-update-panel');
const newPasswordInput = document.getElementById('auth-new-password-input');
const newPasswordConfirmationInput = document.getElementById('auth-new-password-confirm-input');
const passwordUpdateButton = document.getElementById('btn-auth-password-update');
const errorMessage = document.getElementById('auth-error-msg');
const successMessage = document.getElementById('auth-success-msg');

const PASSWORD_RECOVERY_STORAGE_KEY = 'dondwae-password-recovery';

let currentUser = null;
let authRequestInFlight = false;
let authMode = 'login';
let pendingConfirmationEmail = '';
let pendingEmailAction = 'signup';
let passwordRecoveryActive = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';

const originalNavigateTo = typeof window.navigateTo === 'function'
  ? window.navigateTo.bind(window)
  : null;

const initialAuthCallback = readInitialAuthCallback();

function readInitialAuthCallback() {
  const url = new URL(window.location.href);
  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ''));
  const getParameter = (name) => url.searchParams.get(name) || hashParameters.get(name);
  const flow = getParameter('auth') || getParameter('type');
  const errorCode = getParameter('error_code') || getParameter('error');

  return {
    flow,
    errorCode,
    errorDescription: getParameter('error_description'),
    hasAuthCallback: Boolean(
      flow ||
      errorCode ||
      url.searchParams.has('code') ||
      hashParameters.has('access_token')
    )
  };
}

function getAuthRedirectUrl(flow) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('auth', flow);
  return url.toString();
}

function cleanAuthCallbackUrl() {
  if (!initialAuthCallback.hasAuthCallback) return;

  const url = new URL(window.location.href);
  ['auth', 'code', 'error', 'error_code', 'error_description'].forEach((name) => {
    url.searchParams.delete(name);
  });

  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (
    hashParameters.has('access_token') ||
    hashParameters.has('error') ||
    hashParameters.has('error_code')
  ) {
    url.hash = '';
  }

  window.history.replaceState(window.history.state, '', url.toString());
}

function clearAuthMessages() {
  [errorMessage, successMessage].forEach((element) => {
    if (!element) return;
    element.textContent = '';
    element.classList.add('hidden');
  });
}

function showAuthMessage(type, message) {
  clearAuthMessages();
  const target = type === 'success' ? successMessage : errorMessage;
  if (!target) return;
  target.textContent = message;
  target.classList.remove('hidden');
}

function showToast(message, icon) {
  if (typeof window.showGenericToast === 'function') {
    window.showGenericToast(message, icon);
  }
}

function getAuthErrorMessage(error) {
  const messagesByCode = {
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
    session_expired: '인증 세션이 만료되었습니다. 다시 시도해 주세요.',
    over_email_send_rate_limit: '인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  };

  if (error?.code && messagesByCode[error.code]) {
    return messagesByCode[error.code];
  }

  if (/fetch|network/i.test(error?.message || '')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  return '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

function setAuthBusy(isBusy, action = 'login') {
  authRequestInFlight = isBusy;

  [
    emailInput,
    passwordInput,
    loginModeButton,
    signupModeButton,
    authSubmitButton,
    forgotPasswordButton,
    recoveryBackButton,
    resendButton,
    backToLoginButton,
    newPasswordInput,
    newPasswordConfirmationInput,
    passwordUpdateButton,
    ...document.querySelectorAll('[data-password-toggle]')
  ].forEach((element) => {
    if (element) element.disabled = isBusy;
  });

  if (passwordInput) {
    passwordInput.disabled = isBusy || authMode === 'recovery';
  }

  if (passwordConfirmationInput) {
    passwordConfirmationInput.disabled = isBusy || authMode !== 'signup';
  }

  if (authSubmitButtonText) {
    if (isBusy && action === 'login') {
      authSubmitButtonText.textContent = '로그인 중...';
    } else if (isBusy && action === 'signup') {
      authSubmitButtonText.textContent = '가입 처리 중...';
    } else if (isBusy && action === 'recovery') {
      authSubmitButtonText.textContent = '재설정 메일 보내는 중...';
    } else {
      const labelsByMode = {
        login: '로그인하기',
        signup: '회원가입하기',
        recovery: '재설정 링크 받기'
      };
      authSubmitButtonText.textContent = labelsByMode[authMode];
    }
  }

  if (resendButton) {
    resendButton.textContent = isBusy && action === 'resend'
      ? '메일 보내는 중...'
      : pendingEmailAction === 'recovery'
        ? '재설정 메일 다시 보내기'
        : '인증 메일 다시 보내기';
  }

  if (passwordUpdateButton) {
    passwordUpdateButton.textContent = isBusy && action === 'password-update'
      ? '새 비밀번호 저장 중...'
      : '새 비밀번호 저장하기';
  }
}

function updateModeButton(button, isSelected) {
  if (!button) return;

  button.setAttribute('aria-selected', String(isSelected));
  button.classList.toggle('bg-white', isSelected);
  button.classList.toggle('text-neutral-dark', isSelected);
  button.classList.toggle('font-extrabold', isSelected);
  button.classList.toggle('shadow-sm', isSelected);
  button.classList.toggle('text-neutral-500', !isSelected);
  button.classList.toggle('font-bold', !isSelected);
}

function setAuthMode(mode) {
  if (authRequestInFlight || !['login', 'signup', 'recovery'].includes(mode)) return;

  authMode = mode;
  const isSignup = authMode === 'signup';
  const isRecovery = authMode === 'recovery';

  clearAuthMessages();
  authFormPanel?.classList.remove('hidden');
  confirmationPanel?.classList.add('hidden');
  passwordUpdateForm?.classList.add('hidden');
  passwordUpdateForm?.classList.remove('flex');

  const titlesByMode = {
    login: '돈 돼? 로그인',
    signup: '돈 돼? 회원가입',
    recovery: '비밀번호 찾기'
  };
  if (authTitle) authTitle.textContent = titlesByMode[authMode];

  if (authDescription) {
    const descriptionsByMode = {
      login: '가입한 이메일과 비밀번호를 입력해 주세요.',
      signup: '이메일 인증 후 돈 돼? 서비스를 시작할 수 있어요.',
      recovery: '가입한 이메일로 비밀번호 재설정 링크를 보내드릴게요.'
    };
    authDescription.textContent = descriptionsByMode[authMode];
  }

  authModeTabs?.classList.toggle('hidden', isRecovery);
  authSocialSection?.classList.toggle('hidden', isRecovery);
  passwordGroup?.classList.toggle('hidden', isRecovery);
  passwordHint?.classList.toggle('hidden', !isSignup);
  passwordConfirmationGroup?.classList.toggle('hidden', !isSignup);
  forgotPasswordButton?.classList.toggle('hidden', authMode !== 'login');
  recoveryBackButton?.classList.toggle('hidden', !isRecovery);

  if (passwordInput) {
    passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
    passwordInput.disabled = isRecovery;
    passwordInput.value = '';
  }

  if (passwordConfirmationInput) {
    passwordConfirmationInput.disabled = !isSignup;
    passwordConfirmationInput.required = isSignup;
    passwordConfirmationInput.value = '';
  }

  if (authSubmitButtonText) {
    const labelsByMode = {
      login: '로그인하기',
      signup: '회원가입하기',
      recovery: '재설정 링크 받기'
    };
    authSubmitButtonText.textContent = labelsByMode[authMode];
  }

  updateModeButton(loginModeButton, !isSignup);
  updateModeButton(signupModeButton, isSignup);
  resetPasswordVisibility();
}

function showEmailSentPanel(email, action) {
  pendingConfirmationEmail = email;
  pendingEmailAction = action;
  clearAuthMessages();
  authFormPanel?.classList.add('hidden');
  confirmationPanel?.classList.remove('hidden');
  passwordUpdateForm?.classList.add('hidden');
  passwordUpdateForm?.classList.remove('flex');

  const isRecovery = action === 'recovery';
  if (authTitle) authTitle.textContent = isRecovery ? '재설정 메일을 확인해 주세요' : '이메일을 확인해 주세요';
  if (authDescription) {
    authDescription.textContent = isRecovery
      ? '메일의 링크에서 새 비밀번호를 설정할 수 있습니다.'
      : '회원가입을 완료하려면 이메일 인증이 필요합니다.';
  }
  if (emailSentTitle) {
    emailSentTitle.textContent = isRecovery ? '비밀번호 재설정 메일을 요청했어요' : '인증 메일을 확인해 주세요';
  }
  if (emailSentMessage) {
    emailSentMessage.innerHTML = isRecovery
      ? '위 주소로 재설정 링크를 요청했습니다.<br />메일이 없다면 스팸함도 확인해 주세요.'
      : '위 주소로 가입 확인을 요청했습니다.<br />메일의 인증 링크를 누르면 가입이 완료됩니다.';
  }
  if (confirmationEmail) confirmationEmail.textContent = email;
  if (resendButton) {
    resendButton.textContent = isRecovery ? '재설정 메일 다시 보내기' : '인증 메일 다시 보내기';
  }
}

function showPasswordUpdatePanel() {
  passwordRecoveryActive = true;
  sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, 'true');
  clearAuthMessages();
  authFormPanel?.classList.add('hidden');
  confirmationPanel?.classList.add('hidden');
  passwordUpdateForm?.classList.remove('hidden');
  passwordUpdateForm?.classList.add('flex');

  if (authTitle) authTitle.textContent = '새 비밀번호 설정';
  if (authDescription) authDescription.textContent = '앞으로 사용할 새 비밀번호를 입력해 주세요.';

  resetPasswordVisibility();
  originalNavigateTo?.('login');
  cleanAuthCallbackUrl();
  newPasswordInput?.focus();
}

function resetPasswordVisibility() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const target = document.getElementById(button.dataset.passwordTarget);
    const fieldName = button.getAttribute('aria-label')?.replace(/ (표시|숨기기)$/, '') || '비밀번호';
    if (target) target.type = 'password';
    button.textContent = '보기';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${fieldName} 표시`);
  });
}

function handlePasswordVisibility(button) {
  const input = document.getElementById(button.dataset.passwordTarget);
  if (!input) return;

  const shouldShow = input.type === 'password';
  const fieldName = button.getAttribute('aria-label')?.replace(/ (표시|숨기기)$/, '') || '비밀번호';
  input.type = shouldShow ? 'text' : 'password';
  button.textContent = shouldShow ? '숨기기' : '보기';
  button.setAttribute('aria-pressed', String(shouldShow));
  button.setAttribute('aria-label', `${fieldName} ${shouldShow ? '숨기기' : '표시'}`);
}

function updateAuthenticatedUI(user) {
  currentUser = user || null;
  const email = currentUser?.email || '로그인 사용자';

  document.querySelectorAll('[data-auth-email]').forEach((element) => {
    element.textContent = email;
    element.title = email;
  });

  document.body.dataset.authenticated = currentUser ? 'true' : 'false';
}

function getVisibleViewKey() {
  const visibleView = [...document.querySelectorAll('.view-container')]
    .find((element) => !element.classList.contains('hidden'));

  return visibleView?.id?.replace('view-', '') || 'landing';
}

function installAuthenticationGuard() {
  if (!originalNavigateTo) return;

  window.navigateTo = (viewKey) => {
    if (passwordRecoveryActive) {
      showPasswordUpdatePanel();
      return;
    }

    if (currentUser && viewKey === 'login') {
      clearAuthMessages();
      originalNavigateTo('explore');
      return;
    }

    if (!currentUser && !PUBLIC_VIEWS.has(viewKey)) {
      setAuthMode('login');
      originalNavigateTo('login');
      showAuthMessage('error', '로그인 후 이용할 수 있는 화면입니다.');
      return;
    }

    if (viewKey === 'login') setAuthMode('login');
    clearAuthMessages();
    originalNavigateTo(viewKey);
  };
}

function getCredentials() {
  const email = emailInput?.value.trim() || '';

  if (emailInput) {
    emailInput.value = email;
  }

  return {
    email,
    password: passwordInput?.value || '',
    passwordConfirmation: passwordConfirmationInput?.value || ''
  };
}

function validateCredentials(email, password) {
  if (!email || !emailInput?.checkValidity()) {
    showAuthMessage('error', '올바른 이메일 주소를 입력해 주세요.');
    emailInput?.focus();
    return false;
  }

  if (password.length < 6) {
    showAuthMessage('error', '비밀번호는 6자 이상 입력해 주세요.');
    passwordInput?.focus();
    return false;
  }

  return true;
}

async function handleEmailLogin() {
  if (authRequestInFlight) return;

  clearAuthMessages();
  const { email, password } = getCredentials();

  if (!validateCredentials(email, password)) return;
  if (!supabase) {
    showAuthMessage('error', 'Supabase가 연동되어 있지 않습니다. 관리자에게 문의해 주세요.');
    return;
  }

  setAuthBusy(true, 'login');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;

    updateAuthenticatedUI(data.user);
    passwordInput.value = '';
    showToast(`${data.user.email} 계정으로 로그인했습니다.`, '🔑');
    window.navigateTo('explore');
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

async function handleEmailSignup() {
  if (!supabase || authRequestInFlight) return;

  clearAuthMessages();
  const { email, password, passwordConfirmation } = getCredentials();
  if (!validateCredentials(email, password)) return;

  if (password !== passwordConfirmation) {
    showAuthMessage('error', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    passwordConfirmationInput?.focus();
    return;
  }

  setAuthBusy(true, 'signup');

  try {
    const emailRedirectTo = getAuthRedirectUrl('signup');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo }
    });

    if (error) throw error;

    passwordInput.value = '';
    passwordConfirmationInput.value = '';

    if (data.session) {
      updateAuthenticatedUI(data.user);
      showToast('회원가입과 로그인이 완료되었습니다.', '🎉');
      window.navigateTo('explore');
      return;
    }

    showEmailSentPanel(email, 'signup');
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

async function handleConfirmationResend() {
  if (!supabase || authRequestInFlight || !pendingConfirmationEmail) return;

  clearAuthMessages();
  setAuthBusy(true, 'resend');

  try {
    const isRecovery = pendingEmailAction === 'recovery';
    const redirectTo = getAuthRedirectUrl(isRecovery ? 'recovery' : 'signup');
    const { error } = isRecovery
      ? await supabase.auth.resetPasswordForEmail(pendingConfirmationEmail, { redirectTo })
      : await supabase.auth.resend({
          type: 'signup',
          email: pendingConfirmationEmail,
          options: { emailRedirectTo: redirectTo }
        });

    if (error) throw error;

    showAuthMessage(
      'success',
      isRecovery
        ? '비밀번호 재설정 메일을 다시 요청했습니다.'
        : '인증 메일을 다시 보냈습니다. 받은 편지함을 확인해 주세요.'
    );
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

function handleBackToLogin() {
  const email = pendingConfirmationEmail;
  setAuthMode('login');

  if (emailInput) {
    emailInput.value = email;
  }

  passwordInput?.focus();
}

async function handlePasswordResetRequest() {
  if (!supabase || authRequestInFlight) return;

  clearAuthMessages();
  const { email } = getCredentials();

  if (!email || !emailInput?.checkValidity()) {
    showAuthMessage('error', '비밀번호를 재설정할 이메일 주소를 입력해 주세요.');
    emailInput?.focus();
    return;
  }

  setAuthBusy(true, 'recovery');

  try {
    const redirectTo = getAuthRedirectUrl('recovery');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) throw error;

    showEmailSentPanel(email, 'recovery');
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

async function handlePasswordUpdate(event) {
  event.preventDefault();
  if (!supabase || authRequestInFlight) return;

  clearAuthMessages();
  const newPassword = newPasswordInput?.value || '';
  const newPasswordConfirmation = newPasswordConfirmationInput?.value || '';

  if (newPassword.length < 6) {
    showAuthMessage('error', '새 비밀번호는 6자 이상 입력해 주세요.');
    newPasswordInput?.focus();
    return;
  }

  if (newPassword !== newPasswordConfirmation) {
    showAuthMessage('error', '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    newPasswordConfirmationInput?.focus();
    return;
  }

  setAuthBusy(true, 'password-update');
  let passwordUpdated = false;

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    passwordUpdated = true;
    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    cleanAuthCallbackUrl();
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }

  if (!passwordUpdated) return;

  if (newPasswordInput) newPasswordInput.value = '';
  if (newPasswordConfirmationInput) newPasswordConfirmationInput.value = '';
  showToast('새 비밀번호가 저장되었습니다.', '🔐');
  originalNavigateTo?.('explore');
}

function handleAuthSubmit(event) {
  event.preventDefault();

  if (authMode === 'recovery') {
    handlePasswordResetRequest();
    return;
  }

  if (authMode === 'signup') {
    handleEmailSignup();
    return;
  }

  handleEmailLogin();
}

async function handleSignOut(button) {
  if (!supabase || authRequestInFlight) return;

  authRequestInFlight = true;
  document.querySelectorAll('[data-auth-signout]').forEach((element) => {
    element.disabled = true;
  });

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    updateAuthenticatedUI(null);
    showToast('로그아웃되었습니다.', '👋');
    originalNavigateTo?.('landing');
  } catch (error) {
    showToast(getAuthErrorMessage(error), '⚠️');
  } finally {
    authRequestInFlight = false;
    document.querySelectorAll('[data-auth-signout]').forEach((element) => {
      element.disabled = false;
    });
    button?.blur();
  }
}

function bindAuthenticationEvents() {
  authForm?.addEventListener('submit', handleAuthSubmit);
  passwordUpdateForm?.addEventListener('submit', handlePasswordUpdate);
  loginModeButton?.addEventListener('click', () => setAuthMode('login'));
  signupModeButton?.addEventListener('click', () => setAuthMode('signup'));
  forgotPasswordButton?.addEventListener('click', () => setAuthMode('recovery'));
  recoveryBackButton?.addEventListener('click', () => setAuthMode('login'));
  resendButton?.addEventListener('click', handleConfirmationResend);
  backToLoginButton?.addEventListener('click', handleBackToLogin);

  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => handlePasswordVisibility(button));
  });

  document.querySelectorAll('[data-auth-signout]').forEach((button) => {
    button.addEventListener('click', () => handleSignOut(button));
  });
}

function handleAuthStateChange(event, session) {
  updateAuthenticatedUI(session?.user || null);

  if (event === 'PASSWORD_RECOVERY') {
    showPasswordUpdatePanel();
    return;
  }

  if (event === 'SIGNED_OUT') {
    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);

    if (!PUBLIC_VIEWS.has(getVisibleViewKey())) {
      originalNavigateTo?.('landing');
    }
  }

  if (event === 'SIGNED_IN' && getVisibleViewKey() === 'login') {
    originalNavigateTo?.('explore');
  }
}

async function initializeSupabaseAuth() {
  installAuthenticationGuard();
  bindAuthenticationEvents();
  setAuthMode('login');

  if (!isSupabaseConfigured || !supabase) {
    showAuthMessage(
      'error',
      'Supabase 환경변수가 설정되지 않았습니다. 관리자에게 문의해 주세요.'
    );
    [
      emailInput,
      passwordInput,
      passwordConfirmationInput,
      loginModeButton,
      signupModeButton,
      authSubmitButton,
      forgotPasswordButton,
      recoveryBackButton,
      resendButton,
      newPasswordInput,
      newPasswordConfirmationInput,
      passwordUpdateButton,
      ...document.querySelectorAll('[data-password-toggle]')
    ].forEach((element) => {
      if (element) element.disabled = true;
    });
    return;
  }

  supabase.auth.onAuthStateChange(handleAuthStateChange);

  const { data, error } = await supabase.auth.getSession();

  if (error && !initialAuthCallback.errorCode) {
    console.error('Failed to restore the Supabase session:', error.message);
    showAuthMessage('error', '로그인 상태를 확인하지 못했습니다. 페이지를 새로고침해 주세요.');
  }

  const restoredUser = data?.session?.user || null;
  updateAuthenticatedUI(restoredUser);

  if (initialAuthCallback.errorCode) {
    const callbackErrorMessage = getAuthErrorMessage({
      code: initialAuthCallback.errorCode,
      message: initialAuthCallback.errorDescription
    });

    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    cleanAuthCallbackUrl();

    if (restoredUser) {
      showToast(callbackErrorMessage, '⚠️');
      originalNavigateTo?.('explore');
    } else {
      setAuthMode('login');
      originalNavigateTo?.('login');
      showAuthMessage('error', callbackErrorMessage);
    }
  } else if (restoredUser && (initialAuthCallback.flow === 'recovery' || passwordRecoveryActive)) {
    showPasswordUpdatePanel();
  } else if (restoredUser && initialAuthCallback.hasAuthCallback) {
    cleanAuthCallbackUrl();
    showToast('이메일 인증이 완료되었습니다.', '✅');
    originalNavigateTo?.('explore');
  } else if (restoredUser && getVisibleViewKey() === 'login') {
    originalNavigateTo?.('explore');
  } else if (!restoredUser && initialAuthCallback.hasAuthCallback) {
    const callbackErrorMessage = error
      ? getAuthErrorMessage(error)
      : '인증 링크가 유효하지 않거나 만료되었습니다. 새 링크를 요청해 주세요.';

    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    cleanAuthCallbackUrl();
    setAuthMode('login');
    originalNavigateTo?.('login');
    showAuthMessage('error', callbackErrorMessage);
  } else if (!restoredUser && passwordRecoveryActive) {
    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
  }

}

initializeSupabaseAuth();
