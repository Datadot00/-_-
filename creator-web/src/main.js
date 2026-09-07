import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';

const PUBLIC_VIEWS = new Set(['landing', 'login']);

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email-input');
const passwordInput = document.getElementById('auth-password-input');
const loginButton = document.getElementById('btn-email-login');
const loginButtonText = document.getElementById('btn-email-login-text');
const signupButton = document.getElementById('btn-email-signup');
const errorMessage = document.getElementById('auth-error-msg');
const successMessage = document.getElementById('auth-success-msg');

let currentUser = null;
let authRequestInFlight = false;

const originalNavigateTo = typeof window.navigateTo === 'function'
  ? window.navigateTo.bind(window)
  : null;

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
    weak_password: '비밀번호는 6자 이상이어야 합니다.',
    signup_disabled: '현재 신규 회원가입이 비활성화되어 있습니다.',
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

  [emailInput, passwordInput, loginButton, signupButton].forEach((element) => {
    if (element) element.disabled = isBusy;
  });

  if (loginButtonText) {
    loginButtonText.textContent = isBusy && action === 'login'
      ? '로그인 중...'
      : '로그인하기';
  }

  if (signupButton) {
    signupButton.textContent = isBusy && action === 'signup'
      ? '회원가입 처리 중...'
      : '이메일로 회원가입';
  }
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
    if (!currentUser && !PUBLIC_VIEWS.has(viewKey)) {
      originalNavigateTo('login');
      showAuthMessage('error', '로그인 후 이용할 수 있는 화면입니다.');
      return;
    }

    clearAuthMessages();
    originalNavigateTo(viewKey);
  };
}

function getCredentials() {
  return {
    email: emailInput?.value.trim() || '',
    password: passwordInput?.value || ''
  };
}

function validateCredentials(email, password) {
  if (!emailInput?.checkValidity()) {
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

async function handleEmailLogin(event) {
  event.preventDefault();
  if (authRequestInFlight) return;

  clearAuthMessages();
  const { email, password } = getCredentials();
  
  // 로컬 테스트용 아이디(ADMIN001, PROJECT001 등) 또는 일반 이메일 대응
  const isMockAccount = email.toUpperCase() === 'ADMIN001' || email.toUpperCase() === 'PROJECT001' || email.includes('admin') || !email.includes('@');
  if (isMockAccount) {
    if (password !== '1234' && password.length < 4) {
      showAuthMessage('error', '비밀번호(1234)를 올바르게 입력해 주세요.');
      return;
    }
    const mockEmail = email.includes('@') ? email : `${email.toLowerCase()}@dondwae.io`;
    const mockUser = { id: 'mock-user-id', email: mockEmail };
    updateAuthenticatedUI(mockUser);
    if (passwordInput) passwordInput.value = '';
    showToast(`🔑 [테스트 계정] ${mockEmail} 계정으로 로그인되었습니다!`, '🎉');
    window.navigateTo('explore');
    return;
  }

  if (!validateCredentials(email, password)) return;
  if (!supabase) {
    showAuthMessage('error', 'Supabase가 연동되어 있지 않습니다. 로컬 계정(ADMIN001 / 1234)을 이용해 주세요.');
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
  const { email, password } = getCredentials();
  if (!validateCredentials(email, password)) return;

  setAuthBusy(true, 'signup');

  try {
    const emailRedirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo }
    });

    if (error) throw error;

    passwordInput.value = '';

    if (data.session) {
      updateAuthenticatedUI(data.user);
      showToast('회원가입과 로그인이 완료되었습니다.', '🎉');
      window.navigateTo('explore');
      return;
    }

    showAuthMessage(
      'success',
      '회원가입 요청이 완료되었습니다. 받은 편지함의 인증 링크를 확인해 주세요.'
    );
  } catch (error) {
    showAuthMessage('error', getAuthErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
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
  authForm?.addEventListener('submit', handleEmailLogin);
  signupButton?.addEventListener('click', handleEmailSignup);

  document.querySelectorAll('[data-auth-signout]').forEach((button) => {
    button.addEventListener('click', () => handleSignOut(button));
  });
}

async function initializeSupabaseAuth() {
  installAuthenticationGuard();
  bindAuthenticationEvents();

  if (!isSupabaseConfigured || !supabase) {
    showAuthMessage(
      'error',
      'Supabase 환경변수가 설정되지 않았습니다. 관리자에게 문의해 주세요.'
    );
    [emailInput, passwordInput, loginButton, signupButton].forEach((element) => {
      if (element) element.disabled = true;
    });
    return;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to restore the Supabase session:', error.message);
    showAuthMessage('error', '로그인 상태를 확인하지 못했습니다. 페이지를 새로고침해 주세요.');
  }

  updateAuthenticatedUI(data?.session?.user || null);

  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthenticatedUI(session?.user || null);

    if (event === 'SIGNED_OUT' && !PUBLIC_VIEWS.has(getVisibleViewKey())) {
      originalNavigateTo?.('landing');
    }

    if (event === 'SIGNED_IN' && getVisibleViewKey() === 'login') {
      originalNavigateTo?.('explore');
    }
  });
}

initializeSupabaseAuth();
