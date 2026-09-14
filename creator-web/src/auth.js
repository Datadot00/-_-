import { supabase } from './dataService.js';
import {
  clearExistingLocalSession,
  getActiveSessionUser,
  getAuthErrorMessage,
  getAuthErrorWithId,
  requestPasswordReset,
  resendSignupConfirmation,
  signInWithEmail,
  signUpWithEmail,
  updateAuthenticatedPassword
} from './authService.js';

const PASSWORD_RECOVERY_STORAGE_KEY = 'dondwae-password-recovery';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1시간 (3,600,000ms)
const LAST_ACTIVITY_KEY = 'dondwae_last_activity';
const CURRENT_VIEW_KEY = 'dondwae_current_view';
const CURRENT_POST_ID_KEY = 'dondwae_current_post_id';

let lastActivityRecordedAt = 0;

const elements = {
  form: document.getElementById('auth-form'),
  title: document.getElementById('auth-title'),
  description: document.getElementById('auth-description'),
  formPanel: document.getElementById('auth-form-panel'),
  modeTabs: document.getElementById('auth-mode-tabs'),
  socialSection: document.getElementById('auth-social-section'),
  confirmationPanel: document.getElementById('auth-confirmation-panel'),
  confirmationEmail: document.getElementById('auth-confirmation-email'),
  emailSentTitle: document.getElementById('auth-email-sent-title'),
  emailSentMessage: document.getElementById('auth-email-sent-message'),
  email: document.getElementById('auth-email-input'),
  passwordGroup: document.getElementById('auth-password-group'),
  password: document.getElementById('auth-password-input'),
  passwordHint: document.getElementById('auth-password-hint'),
  passwordConfirmationGroup: document.getElementById('auth-password-confirm-group'),
  passwordConfirmation: document.getElementById('auth-password-confirm-input'),
  loginModeButton: document.getElementById('auth-mode-login'),
  signupModeButton: document.getElementById('auth-mode-signup'),
  submitButton: document.getElementById('btn-auth-submit'),
  submitButtonText: document.getElementById('btn-auth-submit-text'),
  forgotPasswordButton: document.getElementById('btn-auth-forgot-password'),
  recoveryBackButton: document.getElementById('btn-auth-recovery-back'),
  resendButton: document.getElementById('btn-auth-resend'),
  backToLoginButton: document.getElementById('btn-auth-back-to-login'),
  passwordUpdateForm: document.getElementById('auth-password-update-panel'),
  newPassword: document.getElementById('auth-new-password-input'),
  newPasswordConfirmation: document.getElementById('auth-new-password-confirm-input'),
  passwordUpdateButton: document.getElementById('btn-auth-password-update'),
  errorMessage: document.getElementById('auth-error-msg'),
  successMessage: document.getElementById('auth-success-msg'),
  landingValidateButton: document.getElementById('btn-landing-validate-service')
};

let authMode = 'login';
let authRequestInFlight = false;
let currentUser = null;
let pendingConfirmationEmail = '';
let pendingEmailAction = 'signup';
let passwordRecoveryActive = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';

function getVisibleViewKey() {
  const visibleView = [...document.querySelectorAll('.view-container')]
    .find((element) => !element.classList.contains('hidden'));
  return visibleView?.id?.replace('view-', '') || 'landing';
}

function navigateTo(viewKey) {
  if (typeof window.navigateTo === 'function') {
    window.navigateTo(viewKey);
  }
}

function showToast(message, icon) {
  if (typeof window.showGenericToast === 'function') {
    window.showGenericToast(message, icon);
  }
}

function clearAuthMessages() {
  [elements.errorMessage, elements.successMessage].forEach((element) => {
    if (!element) return;
    element.textContent = '';
    element.classList.add('hidden');
  });
}

function showAuthMessage(type, message) {
  clearAuthMessages();
  const target = type === 'success' ? elements.successMessage : elements.errorMessage;
  if (!target) return;
  target.textContent = message;
  target.classList.remove('hidden');
}

function getDisplayName(user) {
  return user?.user_metadata?.nickname
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || '로그인 사용자';
}

function applyAuthenticatedUser(user) {
  const nextUser = user || null;
  const accountChanged = currentUser?.id !== nextUser?.id;
  currentUser = nextUser;

  const emailLabel = currentUser?.email || '로그인이 필요합니다';
  document.querySelectorAll('[data-auth-email]').forEach((element) => {
    element.textContent = emailLabel;
    element.title = currentUser?.email || '';
  });

  document.body.dataset.authenticated = currentUser ? 'true' : 'false';
  window.isUserLoggedIn = Boolean(currentUser);

  if (accountChanged && typeof window.saveProfileChangesLocal === 'function') {
    if (currentUser) {
      window.saveProfileChangesLocal(getDisplayName(currentUser), '프로필 정보를 불러오는 중입니다.');
    } else {
      window.saveProfileChangesLocal('로그인 사용자', '로그인 후 프로필을 확인할 수 있습니다.');
    }
  }

  if (typeof window.updateHeaderAuthUI === 'function') {
    window.updateHeaderAuthUI(Boolean(currentUser));
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

function resetPasswordVisibility() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = document.getElementById(button.dataset.passwordTarget);
    const fieldName = button.getAttribute('aria-label')?.replace(/ (표시|숨기기)$/, '') || '비밀번호';
    if (input) input.type = 'password';
    button.textContent = '보기';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${fieldName} 표시`);
  });
}

function setAuthMode(mode) {
  if (authRequestInFlight || !['login', 'signup', 'recovery'].includes(mode)) return;

  authMode = mode;
  const isSignup = mode === 'signup';
  const isRecovery = mode === 'recovery';

  clearAuthMessages();
  elements.formPanel?.classList.remove('hidden');
  elements.confirmationPanel?.classList.add('hidden');
  elements.passwordUpdateForm?.classList.add('hidden');
  elements.passwordUpdateForm?.classList.remove('flex');

  const titles = {
    login: '돈 돼? 로그인',
    signup: '돈 돼? 회원가입',
    recovery: '비밀번호 찾기'
  };
  const descriptions = {
    login: '가입한 이메일과 비밀번호를 입력해 주세요.',
    signup: '이메일 인증 후 돈 돼? 서비스를 시작할 수 있어요.',
    recovery: '가입한 이메일로 비밀번호 재설정 링크를 보내드릴게요.'
  };

  if (elements.title) elements.title.textContent = titles[mode];
  if (elements.description) elements.description.textContent = descriptions[mode];

  elements.modeTabs?.classList.toggle('hidden', isRecovery);
  elements.socialSection?.classList.toggle('hidden', isRecovery);
  elements.passwordGroup?.classList.toggle('hidden', isRecovery);
  elements.passwordHint?.classList.toggle('hidden', !isSignup);
  elements.passwordConfirmationGroup?.classList.toggle('hidden', !isSignup);
  elements.forgotPasswordButton?.classList.toggle('hidden', mode !== 'login');
  elements.recoveryBackButton?.classList.toggle('hidden', !isRecovery);

  if (elements.password) {
    elements.password.autocomplete = isSignup ? 'new-password' : 'current-password';
    elements.password.disabled = isRecovery;
    elements.password.value = '';
  }

  if (elements.passwordConfirmation) {
    elements.passwordConfirmation.disabled = !isSignup;
    elements.passwordConfirmation.required = isSignup;
    elements.passwordConfirmation.value = '';
  }

  if (elements.submitButtonText) {
    elements.submitButtonText.textContent = {
      login: '로그인하기',
      signup: '회원가입하기',
      recovery: '재설정 링크 받기'
    }[mode];
  }

  updateModeButton(elements.loginModeButton, !isSignup && !isRecovery);
  updateModeButton(elements.signupModeButton, isSignup);
  resetPasswordVisibility();
}

function setAuthBusy(isBusy, action = authMode) {
  authRequestInFlight = isBusy;

  [
    elements.email,
    elements.password,
    elements.passwordConfirmation,
    elements.loginModeButton,
    elements.signupModeButton,
    elements.submitButton,
    elements.forgotPasswordButton,
    elements.recoveryBackButton,
    elements.resendButton,
    elements.backToLoginButton,
    elements.newPassword,
    elements.newPasswordConfirmation,
    elements.passwordUpdateButton,
    ...document.querySelectorAll('[data-password-toggle]')
  ].forEach((element) => {
    if (element) element.disabled = isBusy;
  });

  if (elements.password) {
    elements.password.disabled = isBusy || authMode === 'recovery';
  }
  if (elements.passwordConfirmation) {
    elements.passwordConfirmation.disabled = isBusy || authMode !== 'signup';
  }

  if (elements.submitButtonText) {
    if (isBusy) {
      elements.submitButtonText.textContent = {
        login: '로그인 중...',
        signup: '가입 처리 중...',
        recovery: '재설정 메일 보내는 중...'
      }[action] || '처리 중...';
    } else {
      elements.submitButtonText.textContent = {
        login: '로그인하기',
        signup: '회원가입하기',
        recovery: '재설정 링크 받기'
      }[authMode];
    }
  }

  if (elements.resendButton) {
    elements.resendButton.textContent = isBusy && action === 'resend'
      ? '메일 보내는 중...'
      : pendingEmailAction === 'recovery'
        ? '재설정 메일 다시 보내기'
        : '인증 메일 다시 보내기';
  }

  if (elements.passwordUpdateButton) {
    elements.passwordUpdateButton.textContent = isBusy && action === 'password-update'
      ? '새 비밀번호 저장 중...'
      : '새 비밀번호 저장하기';
  }
}

function getCredentials() {
  const email = elements.email?.value.trim() || '';
  if (elements.email) elements.email.value = email;

  return {
    email,
    password: elements.password?.value || '',
    passwordConfirmation: elements.passwordConfirmation?.value || ''
  };
}

function validateEmail(email, emptyMessage = '올바른 이메일 주소를 입력해 주세요.') {
  if (!email || !elements.email?.checkValidity()) {
    showAuthMessage('error', emptyMessage);
    elements.email?.focus();
    return false;
  }
  return true;
}

function validateCredentials(email, password) {
  if (!validateEmail(email)) return false;
  if (password.length < 6) {
    showAuthMessage('error', '비밀번호는 6자 이상 입력해 주세요.');
    elements.password?.focus();
    return false;
  }
  return true;
}

function getAuthRedirectUrl(flow) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('auth', flow);
  return url.toString();
}

function readAuthCallback() {
  const url = new URL(window.location.href);
  const hashParameters = new URLSearchParams(url.hash.replace(/^#/, ''));
  const getParameter = (name) => url.searchParams.get(name) || hashParameters.get(name);
  const flow = getParameter('auth') || getParameter('type');
  const errorCode = getParameter('error_code') || getParameter('error');

  return {
    flow,
    errorCode,
    errorDescription: getParameter('error_description'),
    hasCallback: Boolean(
      flow
      || errorCode
      || url.searchParams.has('code')
      || hashParameters.has('access_token')
    )
  };
}

function cleanAuthCallbackUrl() {
  const url = new URL(window.location.href);
  ['auth', 'code', 'error', 'error_code', 'error_description'].forEach((name) => {
    url.searchParams.delete(name);
  });
  if (url.hash) url.hash = '';
  window.history.replaceState(window.history.state, '', url.toString());
}

async function ensureNoStaleSession() {
  const sessionCleared = await clearExistingLocalSession(supabase);
  if (sessionCleared) applyAuthenticatedUser(null);
}

async function refreshAuthenticatedData() {
  if (typeof window.initSupabaseLiveDB === 'function') {
    await window.initSupabaseLiveDB();
  }
}

async function handleEmailLogin() {
  if (authRequestInFlight) return;
  clearAuthMessages();

  const { email, password } = getCredentials();
  if (!validateCredentials(email, password)) return;
  if (!supabase) {
    showAuthMessage('error', getAuthErrorWithId({ code: 'auth_not_configured' }));
    return;
  }

  setAuthBusy(true, 'login');
  try {
    await ensureNoStaleSession();
    const { user } = await signInWithEmail(supabase, email, password);
    applyAuthenticatedUser(user);
    recordUserActivity();
    if (elements.password) elements.password.value = '';
    await refreshAuthenticatedData();
    showToast(`${user.email} 계정으로 로그인했습니다.`, '🔑');
    navigateTo('explore');
  } catch (error) {
    applyAuthenticatedUser(null);
    showAuthMessage('error', getAuthErrorWithId(error));
  } finally {
    setAuthBusy(false);
  }
}

function showEmailSentPanel(email, action) {
  pendingConfirmationEmail = email;
  pendingEmailAction = action;
  clearAuthMessages();
  elements.formPanel?.classList.add('hidden');
  elements.confirmationPanel?.classList.remove('hidden');
  elements.passwordUpdateForm?.classList.add('hidden');
  elements.passwordUpdateForm?.classList.remove('flex');

  const isRecovery = action === 'recovery';
  if (elements.title) {
    elements.title.textContent = isRecovery ? '재설정 메일을 확인해 주세요' : '이메일을 확인해 주세요';
  }
  if (elements.description) {
    elements.description.textContent = isRecovery
      ? '메일의 링크에서 새 비밀번호를 설정할 수 있습니다.'
      : '회원가입을 완료하려면 이메일 인증이 필요합니다.';
  }
  if (elements.emailSentTitle) {
    elements.emailSentTitle.textContent = isRecovery
      ? '비밀번호 재설정 메일을 요청했어요'
      : '인증 메일을 확인해 주세요';
  }
  if (elements.emailSentMessage) {
    elements.emailSentMessage.innerHTML = isRecovery
      ? '위 주소로 재설정 링크를 요청했습니다.<br />메일이 없다면 스팸함도 확인해 주세요.'
      : '위 주소로 가입 확인을 요청했습니다.<br />메일의 인증 링크를 누르면 가입이 완료됩니다.';
  }
  if (elements.confirmationEmail) elements.confirmationEmail.textContent = email;
  if (elements.resendButton) {
    elements.resendButton.textContent = isRecovery
      ? '재설정 메일 다시 보내기'
      : '인증 메일 다시 보내기';
  }
}

async function handleEmailSignup() {
  if (authRequestInFlight) return;
  clearAuthMessages();

  const { email, password, passwordConfirmation } = getCredentials();
  if (!validateCredentials(email, password)) return;
  if (password !== passwordConfirmation) {
    showAuthMessage('error', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    elements.passwordConfirmation?.focus();
    return;
  }
  if (!supabase) {
    showAuthMessage('error', getAuthErrorWithId({ code: 'auth_not_configured' }));
    return;
  }

  setAuthBusy(true, 'signup');
  try {
    await ensureNoStaleSession();
    const redirectTo = getAuthRedirectUrl('signup');
    const { user, session } = await signUpWithEmail(supabase, email, password, redirectTo);
    if (elements.password) elements.password.value = '';
    if (elements.passwordConfirmation) elements.passwordConfirmation.value = '';

    if (session) {
      applyAuthenticatedUser(user);
      await refreshAuthenticatedData();
      showToast('회원가입과 로그인이 완료되었습니다.', '🎉');
      navigateTo('explore');
      return;
    }

    applyAuthenticatedUser(null);
    showEmailSentPanel(email, 'signup');
  } catch (error) {
    applyAuthenticatedUser(null);
    showAuthMessage('error', getAuthErrorWithId(error));
  } finally {
    setAuthBusy(false);
  }
}

async function handlePasswordResetRequest() {
  if (authRequestInFlight) return;
  clearAuthMessages();

  const { email } = getCredentials();
  if (!validateEmail(email, '비밀번호를 재설정할 이메일 주소를 입력해 주세요.')) return;
  if (!supabase) {
    showAuthMessage('error', getAuthErrorWithId({ code: 'auth_not_configured' }));
    return;
  }

  setAuthBusy(true, 'recovery');
  try {
    const redirectTo = getAuthRedirectUrl('recovery');
    await requestPasswordReset(supabase, email, redirectTo);
    showEmailSentPanel(email, 'recovery');
  } catch (error) {
    showAuthMessage('error', getAuthErrorWithId(error));
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
    if (isRecovery) {
      await requestPasswordReset(supabase, pendingConfirmationEmail, redirectTo);
    } else {
      await resendSignupConfirmation(supabase, pendingConfirmationEmail, redirectTo);
    }
    showAuthMessage(
      'success',
      isRecovery
        ? '비밀번호 재설정 메일을 다시 요청했습니다.'
        : '인증 메일을 다시 보냈습니다. 받은 편지함을 확인해 주세요.'
    );
  } catch (error) {
    showAuthMessage('error', getAuthErrorWithId(error));
  } finally {
    setAuthBusy(false);
  }
}

function showPasswordUpdatePanel() {
  passwordRecoveryActive = true;
  sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, 'true');
  clearAuthMessages();
  elements.formPanel?.classList.add('hidden');
  elements.confirmationPanel?.classList.add('hidden');
  elements.passwordUpdateForm?.classList.remove('hidden');
  elements.passwordUpdateForm?.classList.add('flex');
  if (elements.title) elements.title.textContent = '새 비밀번호 설정';
  if (elements.description) elements.description.textContent = '앞으로 사용할 새 비밀번호를 입력해 주세요.';
  resetPasswordVisibility();
  navigateTo('login');
  elements.newPassword?.focus();
}

async function handlePasswordUpdate(event) {
  event.preventDefault();
  if (!supabase || authRequestInFlight) return;

  clearAuthMessages();
  const password = elements.newPassword?.value || '';
  const passwordConfirmation = elements.newPasswordConfirmation?.value || '';
  if (password.length < 6) {
    showAuthMessage('error', '새 비밀번호는 6자 이상 입력해 주세요.');
    elements.newPassword?.focus();
    return;
  }
  if (password !== passwordConfirmation) {
    showAuthMessage('error', '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    elements.newPasswordConfirmation?.focus();
    return;
  }

  setAuthBusy(true, 'password-update');
  try {
    const user = await updateAuthenticatedPassword(supabase, password);
    applyAuthenticatedUser(user);
    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    cleanAuthCallbackUrl();
    if (elements.newPassword) elements.newPassword.value = '';
    if (elements.newPasswordConfirmation) elements.newPasswordConfirmation.value = '';
    showToast('새 비밀번호가 저장되었습니다.', '🔐');
    navigateTo('explore');
  } catch (error) {
    showAuthMessage('error', getAuthErrorWithId(error));
  } finally {
    setAuthBusy(false);
  }
}

async function handleAuthSubmit(event) {
  event?.preventDefault();
  if (authMode === 'recovery') {
    await handlePasswordResetRequest();
  } else if (authMode === 'signup') {
    await handleEmailSignup();
  } else {
    await handleEmailLogin();
  }
}

async function handleLandingValidateService(event) {
  event?.preventDefault();

  if (currentUser) {
    navigateTo('explore');
    return;
  }

  if (!supabase) {
    navigateTo('login');
    return;
  }

  try {
    const sessionUser = await getActiveSessionUser(supabase);
    applyAuthenticatedUser(sessionUser);

    if (sessionUser) {
      recordUserActivity();
      navigateTo('explore');
      return;
    }
  } catch (error) {
    console.warn('[Auth] Could not verify the session before navigation:', error);
  }

  navigateTo('login');
}

async function handleSignOut() {
  if (!supabase || authRequestInFlight) return;

  authRequestInFlight = true;
  document.querySelectorAll('[data-auth-signout], #btn-header-logout, #btn-landing-logout')
    .forEach((button) => { button.disabled = true; });

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    applyAuthenticatedUser(null);
    passwordRecoveryActive = false;
    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(CURRENT_VIEW_KEY);
    localStorage.removeItem(CURRENT_POST_ID_KEY);
    showToast('로그아웃되었습니다.', '👋');
    navigateTo('landing');
  } catch (error) {
    showToast(getAuthErrorMessage(error), '⚠️');
  } finally {
    authRequestInFlight = false;
    document.querySelectorAll('[data-auth-signout], #btn-header-logout, #btn-landing-logout')
      .forEach((button) => { button.disabled = false; });
  }
}

function handlePasswordVisibility(button) {
  const input = document.getElementById(button.dataset.passwordTarget);
  if (!input) return;

  const willShow = input.type === 'password';
  input.type = willShow ? 'text' : 'password';
  button.textContent = willShow ? '숨기기' : '보기';
  button.setAttribute('aria-pressed', String(willShow));
  button.setAttribute('aria-label', `${input.placeholder || '비밀번호'} ${willShow ? '숨기기' : '표시'}`);
}

function bindAuthenticationEvents() {
  elements.form?.addEventListener('submit', handleAuthSubmit);
  elements.landingValidateButton?.addEventListener('click', handleLandingValidateService);
  elements.passwordUpdateForm?.addEventListener('submit', handlePasswordUpdate);
  elements.loginModeButton?.addEventListener('click', () => setAuthMode('login'));
  elements.signupModeButton?.addEventListener('click', () => setAuthMode('signup'));
  elements.forgotPasswordButton?.addEventListener('click', () => setAuthMode('recovery'));
  elements.recoveryBackButton?.addEventListener('click', () => setAuthMode('login'));
  elements.resendButton?.addEventListener('click', handleConfirmationResend);
  elements.backToLoginButton?.addEventListener('click', () => {
    const email = pendingConfirmationEmail;
    setAuthMode('login');
    if (elements.email) elements.email.value = email;
    elements.password?.focus();
  });
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => handlePasswordVisibility(button));
  });
}

function disableAuthenticationUI() {
  [
    elements.email,
    elements.password,
    elements.passwordConfirmation,
    elements.loginModeButton,
    elements.signupModeButton,
    elements.submitButton,
    elements.forgotPasswordButton,
    elements.recoveryBackButton,
    elements.resendButton,
    elements.newPassword,
    elements.newPasswordConfirmation,
    elements.passwordUpdateButton,
    ...document.querySelectorAll('[data-password-toggle]')
  ].forEach((element) => {
    if (element) element.disabled = true;
  });
}

function recordUserActivity() {
  const now = Date.now();
  if (now - lastActivityRecordedAt < 10000) return; // 10초 쓰로틀
  lastActivityRecordedAt = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch (e) {
    // ignore
  }
}

async function checkInactivityTimeout(silent = false) {
  if (!supabase) return false;
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivityStr) return false;

  const lastActivity = parseInt(lastActivityStr, 10);
  if (isNaN(lastActivity)) return false;

  const elapsed = Date.now() - lastActivity;
  if (elapsed >= INACTIVITY_TIMEOUT_MS) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[Auth] Sign out error on inactivity:', e);
    }
    applyAuthenticatedUser(null);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(CURRENT_VIEW_KEY);
    localStorage.removeItem(CURRENT_POST_ID_KEY);
    if (!silent) {
      showToast('1시간 동안 활동이 없어 자동 로그아웃되었습니다.', '⏱️');
    } else {
      showToast('1시간 이상 미활동으로 세션이 만료되어 로그아웃되었습니다.', '⏱️');
    }
    navigateTo('landing');
    return true;
  }
  return false;
}

function bindInactivityListeners() {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach((evt) => {
    window.addEventListener(evt, () => {
      if (currentUser) {
        recordUserActivity();
      }
    }, { passive: true });
  });

  // 1분 간격 주기적 비활성 체크
  setInterval(() => {
    if (currentUser) {
      checkInactivityTimeout();
    }
  }, 60 * 1000);

  // 창 활성화 및 탭 복귀 시 즉시 체크
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser) {
      checkInactivityTimeout();
    }
  });

  window.addEventListener('focus', () => {
    if (currentUser) {
      checkInactivityTimeout();
    }
  });
}

async function initializeAuthentication() {
  bindAuthenticationEvents();
  bindInactivityListeners();
  setAuthMode('login');

  window.handleEmailAuthSubmit = handleAuthSubmit;
  window.handleUserLogout = handleSignOut;
  window.getCurrentAuthUser = () => currentUser;

  if (!supabase) {
    applyAuthenticatedUser(null);
    disableAuthenticationUI();
    showAuthMessage('error', getAuthErrorWithId({ code: 'auth_not_configured' }));
    return;
  }

  const callback = readAuthCallback();
  supabase.auth.onAuthStateChange((event, session) => {
    applyAuthenticatedUser(session?.user || null);
    if (session?.user) {
      recordUserActivity();
    }

    if (event === 'PASSWORD_RECOVERY') {
      window.setTimeout(showPasswordUpdatePanel, 0);
    }
  });

  try {
    // 1. 1시간 비활성 상태 검사 (새로고침 시에도 검사)
    const wasTimedOut = await checkInactivityTimeout(true);
    if (wasTimedOut) return;

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const restoredUser = data?.session?.user || null;
    applyAuthenticatedUser(restoredUser);

    if (callback.errorCode) {
      passwordRecoveryActive = false;
      sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      cleanAuthCallbackUrl();
      setAuthMode('login');
      navigateTo('login');
      showAuthMessage('error', getAuthErrorWithId({
        code: callback.errorCode,
        message: callback.errorDescription
      }));
      return;
    }

    if (restoredUser && (callback.flow === 'recovery' || passwordRecoveryActive)) {
      showPasswordUpdatePanel();
      return;
    }

    if (restoredUser && callback.hasCallback) {
      cleanAuthCallbackUrl();
      showToast('이메일 인증이 완료되었습니다.', '✅');
      navigateTo('explore');
      return;
    }

    if (restoredUser) {
      recordUserActivity();
      // 이전에 보고 있던 화면으로 복원
      const savedView = localStorage.getItem(CURRENT_VIEW_KEY);
      const savedPostId = localStorage.getItem(CURRENT_POST_ID_KEY);
      if (savedView && savedView !== 'landing' && savedView !== 'login') {
        if (savedView === 'post' && savedPostId && typeof window.openPostDetail === 'function') {
          window.openPostDetail(savedPostId);
        } else if (typeof window.navigateTo === 'function') {
          window.navigateTo(savedView);
        }
      } else if (getVisibleViewKey() === 'login' || getVisibleViewKey() === 'landing') {
        navigateTo('explore');
      }
    } else {
      if (passwordRecoveryActive) {
        passwordRecoveryActive = false;
        sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
      }
      const currentView = getVisibleViewKey();
      if (['mypage', 'create', 'feedback'].includes(currentView)) {
        navigateTo('landing');
      }
    }
  } catch (error) {
    applyAuthenticatedUser(null);
    showAuthMessage('error', getAuthErrorWithId(error));
  }
}

initializeAuthentication();
