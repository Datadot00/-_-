import { supabase } from './dataService.js';
import {
  clearExistingLocalSession,
  getActiveSessionUser,
  getAuthErrorMessage,
  getAuthErrorWithId,
  requestPasswordReset,
  resumeEmailConfirmation,
  resendSignupConfirmation,
  signInWithEmail,
  signUpWithEmail,
  updateAuthenticatedPassword
} from './authService.js';
import {
  closeTermsConsentGate,
  showTermsConsentGateIfRequired
} from './termsGate.js';
import { routeAuthenticatedAccount } from './accountRouting.js';
import {
  closeOnboardingGate,
  showOnboardingGateIfRequired
} from './onboardingGate.js';

const PASSWORD_RECOVERY_STORAGE_KEY = 'dondwae-password-recovery';
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1시간 (3,600,000ms)
const LAST_ACTIVITY_KEY = 'dondwae_last_activity';
const CURRENT_VIEW_KEY = 'dondwae_current_view';
const CURRENT_POST_ID_KEY = 'dondwae_current_post_id';
const AUTH_TAB_ID_KEY = 'dondwae_auth_tab_id';
const PENDING_EMAIL_CONFIRMATION_KEY = 'dondwae_pending_email_confirmation';
const PENDING_EMAIL_CONFIRMATION_MAX_AGE_MS = 30 * 60 * 1000;

let lastActivityRecordedAt = 0;

const elements = {
  form: document.getElementById('auth-form'),
  title: document.getElementById('auth-title'),
  description: document.getElementById('auth-description'),
  formPanel: document.getElementById('auth-form-panel'),
  modeTabs: document.getElementById('auth-mode-tabs'),

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
  confirmationCompleteButton: document.getElementById('btn-auth-confirmation-complete'),
  continueCurrentTabButton: document.getElementById('btn-auth-continue-current-tab'),
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
let pendingSignupCredentials = null;
let pendingOnboardingAccountState = null;
let passwordRecoveryActive = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === 'true';
const currentAuthTabId = getOrCreateAuthTabId();

function getOrCreateAuthTabId() {
  const existingTabId = sessionStorage.getItem(AUTH_TAB_ID_KEY);
  if (existingTabId) return existingTabId;

  const nextTabId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(AUTH_TAB_ID_KEY, nextTabId);
  return nextTabId;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLocaleLowerCase();
}

function rememberPendingEmailConfirmation(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  try {
    localStorage.setItem(PENDING_EMAIL_CONFIRMATION_KEY, JSON.stringify({
      email: normalizedEmail,
      sourceTabId: currentAuthTabId,
      createdAt: Date.now()
    }));
  } catch {
    // 저장소를 사용할 수 없어도 현재 탭의 완료 버튼은 계속 사용할 수 있다.
  }
}

function readPendingEmailConfirmation() {
  try {
    const rawValue = localStorage.getItem(PENDING_EMAIL_CONFIRMATION_KEY);
    if (!rawValue) return null;

    const marker = JSON.parse(rawValue);
    const createdAt = Number(marker?.createdAt);
    const isExpired = !Number.isFinite(createdAt)
      || createdAt > Date.now()
      || Date.now() - createdAt > PENDING_EMAIL_CONFIRMATION_MAX_AGE_MS;
    if (!normalizeEmail(marker?.email) || !marker?.sourceTabId || isExpired) {
      localStorage.removeItem(PENDING_EMAIL_CONFIRMATION_KEY);
      return null;
    }

    return {
      email: normalizeEmail(marker.email),
      sourceTabId: String(marker.sourceTabId),
      createdAt
    };
  } catch {
    return null;
  }
}

function clearPendingEmailConfirmation() {
  pendingSignupCredentials = null;
  try {
    localStorage.removeItem(PENDING_EMAIL_CONFIRMATION_KEY);
  } catch {
    // 저장소 정리 실패는 인증 완료 자체를 막지 않는다.
  }
}

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

function setAuthMode(mode, { force = false } = {}) {
  if ((!force && authRequestInFlight) || !['login', 'signup', 'recovery'].includes(mode)) return;

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
    elements.confirmationCompleteButton,
    elements.continueCurrentTabButton,
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
        : '확인 메일 다시 보내기';
  }

  if (elements.confirmationCompleteButton) {
    elements.confirmationCompleteButton.textContent = isBusy && action === 'confirmation-check'
      ? '인증 확인 중...'
      : '인증 완료했어요';
  }

  if (elements.continueCurrentTabButton) {
    elements.continueCurrentTabButton.textContent = isBusy && action === 'continue-current-tab'
      ? '계정 확인 중...'
      : '이 탭에서 계속하기';
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

async function continueThroughTermsGate(onReady, { recheckAfterAcceptance = false } = {}) {
  const blockedByTerms = await showTermsConsentGateIfRequired(supabase, {
    onAccepted: recheckAfterAcceptance
      ? () => routeAfterAuthentication(onReady)
      : onReady
  });
  if (!blockedByTerms) {
    await onReady?.();
  }
  return !blockedByTerms;
}

async function routeAfterAuthentication(onReady) {
  return routeAuthenticatedAccount(supabase, {
    verify_email: async (state) => {
      closeTermsConsentGate();
      closeOnboardingGate();
      pendingOnboardingAccountState = null;

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;

      applyAuthenticatedUser(null);
      navigateTo('login');
      showEmailSentPanel(state.email, 'signup');
    },
    onboarding: async (state) => {
      closeTermsConsentGate();
      pendingOnboardingAccountState = state;
      window.dispatchEvent(new CustomEvent('dondwae:onboarding-required', {
        detail: state
      }));

      const opened = await showOnboardingGateIfRequired(supabase, state, {
        onCompleted: () => routeAfterAuthentication(onReady)
      });
      if (opened) return;

      // 게이트를 열 수 없는 환경이면 최소한 안내는 남긴다.
      navigateTo('login');
      setAuthMode('login', { force: true });
      showAuthMessage(
        'success',
        '이메일 인증이 완료되었습니다. 온보딩 정보를 입력하면 서비스를 시작할 수 있습니다.'
      );
    },
    terms_review: () => continueThroughTermsGate(onReady, {
      recheckAfterAcceptance: true
    }),
    ready: async (state) => {
      pendingOnboardingAccountState = null;
      await onReady?.(state);
    },
    legacy: () => continueThroughTermsGate(onReady)
  });
}

function restoreAuthenticatedDestination() {
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
    await routeAfterAuthentication(() => {
      showToast(`${user.email} 계정으로 로그인했습니다.`, '🔑');
      navigateTo('explore');
    });
  } catch (error) {
    applyAuthenticatedUser(null);
    if (error?.code === 'email_not_confirmed') {
      pendingSignupCredentials = { email, password };
      showEmailSentPanel(email, 'signup');
    }
    showAuthMessage('error', getAuthErrorWithId(error));
  } finally {
    setAuthBusy(false);
  }
}

function showEmailSentPanel(email, action) {
  pendingConfirmationEmail = email;
  pendingEmailAction = action;
  if (action === 'signup') rememberPendingEmailConfirmation(email);
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
      : '회원가입 확인 메일을 보냈어요';
  }
  if (elements.emailSentMessage) {
    elements.emailSentMessage.innerHTML = isRecovery
      ? '위 주소로 재설정 링크를 요청했습니다.<br />메일이 없다면 스팸함도 확인해 주세요.'
      : '메일의 회원가입 확인 버튼을 눌러 주세요.<br />메일이 없다면 스팸함도 확인해 주세요.';
  }
  if (elements.confirmationEmail) elements.confirmationEmail.textContent = email;
  if (elements.resendButton) {
    elements.resendButton.classList.remove('hidden');
    elements.resendButton.textContent = isRecovery
      ? '재설정 메일 다시 보내기'
      : '확인 메일 다시 보내기';
  }
  elements.confirmationCompleteButton?.classList.toggle('hidden', isRecovery);
  elements.continueCurrentTabButton?.classList.add('hidden');
  elements.backToLoginButton?.classList.remove('hidden');
}

function showEmailConfirmedHandoffPanel(email) {
  pendingConfirmationEmail = email;
  pendingEmailAction = 'signup-handoff';
  clearAuthMessages();
  navigateTo('login');
  elements.formPanel?.classList.add('hidden');
  elements.confirmationPanel?.classList.remove('hidden');
  elements.passwordUpdateForm?.classList.add('hidden');
  elements.passwordUpdateForm?.classList.remove('flex');

  if (elements.title) elements.title.textContent = '이메일 인증이 완료되었습니다';
  if (elements.description) {
    elements.description.textContent = '가입을 시작한 탭에서 안전하게 다음 단계를 이어갈 수 있어요.';
  }
  if (elements.emailSentTitle) {
    elements.emailSentTitle.textContent = '가입하던 탭으로 돌아가 주세요';
  }
  if (elements.emailSentMessage) {
    elements.emailSentMessage.innerHTML = '기존 탭에서 <strong>인증 완료했어요</strong> 버튼을 눌러 주세요.<br />기존 탭을 닫았다면 아래 버튼으로 이 탭에서 계속할 수 있습니다.';
  }
  if (elements.confirmationEmail) elements.confirmationEmail.textContent = email;

  elements.resendButton?.classList.add('hidden');
  elements.confirmationCompleteButton?.classList.add('hidden');
  elements.continueCurrentTabButton?.classList.remove('hidden');
  elements.backToLoginButton?.classList.add('hidden');
}

async function continueConfirmedSignup(user, successMessage) {
  applyAuthenticatedUser(user);
  recordUserActivity();
  clearPendingEmailConfirmation();

  await routeAfterAuthentication(async () => {
    await refreshAuthenticatedData();
    setAuthMode('login', { force: true });
    showToast(successMessage, '✅');
    navigateTo('explore');
  });
}

async function handleEmailConfirmationComplete() {
  if (!supabase || authRequestInFlight || pendingEmailAction !== 'signup') return;

  clearAuthMessages();
  setAuthBusy(true, 'confirmation-check');

  try {
    const email = normalizeEmail(pendingConfirmationEmail);
    const credentials = pendingSignupCredentials;
    const pendingPassword = credentials
      && normalizeEmail(credentials.email) === email
      ? credentials.password
      : '';
    const { user } = await resumeEmailConfirmation(supabase, email, pendingPassword);

    await continueConfirmedSignup(user, '이메일 인증을 확인했습니다.');
  } catch (error) {
    if (error?.code === 'email_not_confirmed') {
      showAuthMessage('error', '아직 이메일 인증이 완료되지 않았습니다. 메일의 확인 링크를 먼저 눌러 주세요.');
    } else if (error?.code === 'confirmation_credentials_missing') {
      showAuthMessage('error', '현재 탭의 가입 정보가 만료되었습니다. 로그인 화면에서 이메일과 비밀번호를 다시 입력해 주세요.');
    } else if (error?.code === 'confirmation_account_mismatch') {
      showAuthMessage('error', '다른 계정으로 인증되어 있습니다. 로그인 화면에서 가입한 계정으로 다시 로그인해 주세요.');
    } else {
      showAuthMessage('error', getAuthErrorWithId(error));
    }
  } finally {
    setAuthBusy(false);
  }
}

async function handleContinueCurrentTab() {
  if (!supabase || authRequestInFlight || pendingEmailAction !== 'signup-handoff') return;

  clearAuthMessages();
  setAuthBusy(true, 'continue-current-tab');

  try {
    const { user } = await resumeEmailConfirmation(supabase, pendingConfirmationEmail);

    await continueConfirmedSignup(user, '이메일 인증이 완료되었습니다.');
  } catch (error) {
    if (error?.code === 'confirmation_credentials_missing') {
      showAuthMessage('error', '인증 세션을 찾지 못했습니다. 로그인 화면에서 가입한 이메일과 비밀번호를 입력해 주세요.');
      elements.backToLoginButton?.classList.remove('hidden');
    } else {
      showAuthMessage('error', getAuthErrorWithId(error));
    }
  } finally {
    setAuthBusy(false);
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

  clearPendingEmailConfirmation();
  setAuthBusy(true, 'signup');
  try {
    await ensureNoStaleSession();
    const redirectTo = getAuthRedirectUrl('signup');
    const { user, session } = await signUpWithEmail(supabase, email, password, redirectTo);
    pendingSignupCredentials = { email, password };
    if (elements.password) elements.password.value = '';
    if (elements.passwordConfirmation) elements.passwordConfirmation.value = '';

    if (session) {
      clearPendingEmailConfirmation();
      applyAuthenticatedUser(user);
      await refreshAuthenticatedData();
      await routeAfterAuthentication(() => {
        showToast('회원가입과 로그인이 완료되었습니다.', '🎉');
        navigateTo('explore');
      });
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
        : '회원가입 확인 메일을 다시 보냈습니다. 받은 편지함을 확인해 주세요.'
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
    await routeAfterAuthentication(() => {
      showToast('새 비밀번호가 저장되었습니다.', '🔐');
      navigateTo('explore');
    });
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
    await routeAfterAuthentication(() => navigateTo('explore'));
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
      await routeAfterAuthentication(() => navigateTo('explore'));
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
    closeTermsConsentGate();
    closeOnboardingGate();
    pendingOnboardingAccountState = null;
    clearPendingEmailConfirmation();
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
  elements.confirmationCompleteButton?.addEventListener('click', handleEmailConfirmationComplete);
  elements.continueCurrentTabButton?.addEventListener('click', handleContinueCurrentTab);
  elements.backToLoginButton?.addEventListener('click', () => {
    const email = pendingConfirmationEmail;
    clearPendingEmailConfirmation();
    setAuthMode('login');
    if (elements.email) elements.email.value = email;
    elements.password?.focus();
  });
  window.addEventListener('dondwae:terms-declined', handleSignOut);
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
    elements.confirmationCompleteButton,
    elements.continueCurrentTabButton,
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
    closeTermsConsentGate();
    closeOnboardingGate();
    pendingOnboardingAccountState = null;
    clearPendingEmailConfirmation();
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
  window.getPendingOnboardingAccountState = () => pendingOnboardingAccountState;

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
      if (
        event === 'SIGNED_IN'
        && pendingEmailAction === 'signup'
        && normalizeEmail(session.user.email) === normalizeEmail(pendingConfirmationEmail)
      ) {
        showAuthMessage('success', '이메일 인증이 확인되었습니다. 아래 버튼을 눌러 계속해 주세요.');
      }
    } else {
      closeTermsConsentGate();
      closeOnboardingGate();
      pendingOnboardingAccountState = null;
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
      const pendingConfirmation = callback.flow === 'signup'
        ? readPendingEmailConfirmation()
        : null;
      const shouldReturnToSourceTab = pendingConfirmation
        && pendingConfirmation.sourceTabId !== currentAuthTabId
        && pendingConfirmation.email === normalizeEmail(restoredUser.email);
      if (shouldReturnToSourceTab) {
        showEmailConfirmedHandoffPanel(restoredUser.email || pendingConfirmation.email);
        return;
      }

      clearPendingEmailConfirmation();
      await routeAfterAuthentication(() => {
        showToast('이메일 인증이 완료되었습니다.', '✅');
        navigateTo('explore');
      });
      return;
    }

    if (restoredUser) {
      recordUserActivity();
      await routeAfterAuthentication(restoreAuthenticatedDestination);
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
