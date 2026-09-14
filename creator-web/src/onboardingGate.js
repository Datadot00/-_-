import { completeMyOnboarding, ONBOARDING_LIMITS } from './onboardingService.js';

const PROFILE_MODE_TEXT = Object.freeze({
  title: '프로필 정보 수정',
  subtitle: '테스트 및 피드백 참여 시 다른 사용자에게 표시되는 정보를 설정합니다.'
});

const ONBOARDING_MODE_TEXT = Object.freeze({
  title: '프로필 설정하고 시작하기',
  subtitle: `닉네임과 관심분야(최대 ${ONBOARDING_LIMITS.interestsMax}개)를 입력하면 돈돼를 이용할 수 있습니다.`
});

let activeClient = null;
let pendingContinuation = null;
let isSubmitting = false;
let eventsBound = false;

function getElements() {
  return {
    modal: document.getElementById('edit-profile-modal'),
    title: document.getElementById('profile-modal-title'),
    subtitle: document.getElementById('profile-modal-subtitle'),
    notice: document.getElementById('onboarding-notice'),
    dismiss: document.getElementById('btn-profile-modal-dismiss'),
    cancel: document.getElementById('btn-profile-modal-cancel'),
    save: document.getElementById('btn-save-profile'),
    complete: document.getElementById('btn-complete-onboarding'),
    error: document.getElementById('onboarding-error'),
    nickname: document.getElementById('profile-edit-nickname'),
    bio: document.getElementById('profile-edit-bio'),
    email: document.getElementById('profile-edit-email'),
    interestsBox: document.getElementById('interest-chips-box')
  };
}

function setError(message = '') {
  const { error } = getElements();
  if (!error) return;
  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

function getInterestButtons() {
  return [...document.querySelectorAll('#interest-chips-box [data-interest]')];
}

function getSelectedInterests() {
  return getInterestButtons()
    .filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => button.dataset.interest);
}

function getSnsLinkValues() {
  return [...document.querySelectorAll('[data-profile-sns-link]')].map(input => input.value);
}

/**
 * 온보딩은 건너뛸 수 없으므로 닫기 경로를 감추고 제출 버튼만 남긴다.
 * 프로필 수정 모드로 되돌릴 때 원래 상태를 그대로 복구한다.
 */
function applyMode(isOnboarding) {
  const {
    title, subtitle, notice, dismiss, cancel, save, complete
  } = getElements();

  const text = isOnboarding ? ONBOARDING_MODE_TEXT : PROFILE_MODE_TEXT;
  if (title) title.textContent = text.title;
  if (subtitle) subtitle.textContent = text.subtitle;

  notice?.classList.toggle('hidden', !isOnboarding);
  dismiss?.classList.toggle('hidden', isOnboarding);
  cancel?.classList.toggle('hidden', isOnboarding);
  save?.classList.toggle('hidden', isOnboarding);
  complete?.classList.toggle('hidden', !isOnboarding);

  if (!isOnboarding) setError('');
}

function prefillFromAccountState(state) {
  const { nickname, bio, email } = getElements();
  const profile = state?.profile || {};

  if (nickname) nickname.value = profile.nickname || '';
  if (bio) bio.value = profile.bio || '';
  if (email) email.textContent = state?.email || '이메일 정보 없음';

  const selected = new Set(Array.isArray(profile.interests) ? profile.interests : []);
  getInterestButtons().forEach(button => {
    const isSelected = selected.has(button.dataset.interest);
    if (typeof window.setInterestChipSelected === 'function') {
      window.setInterestChipSelected(button, isSelected);
    } else {
      button.setAttribute('aria-pressed', String(isSelected));
    }
  });

  if (typeof window.renderProfileSnsLinks === 'function') {
    window.renderProfileSnsLinks(Array.isArray(profile.snsLinks) ? profile.snsLinks : []);
  }
  if (typeof window.updateProfileInputCounts === 'function') {
    window.updateProfileInputCounts();
  }
}

function openModal() {
  const { modal, nickname } = getElements();
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  window.setTimeout(() => nickname?.focus(), 0);
}

export function closeOnboardingGate() {
  const { modal } = getElements();
  modal?.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  applyMode(false);
  activeClient = null;
  pendingContinuation = null;
  isSubmitting = false;
}

function setSubmitting(submitting) {
  const { complete } = getElements();
  isSubmitting = submitting;
  if (!complete) return;
  complete.disabled = submitting;
  complete.textContent = submitting ? '설정 저장 중...' : '돈돼 시작하기';
}

async function handleSubmit() {
  if (!activeClient || isSubmitting) return;

  setError('');
  setSubmitting(true);

  try {
    const state = await completeMyOnboarding(activeClient, {
      nickname: getElements().nickname?.value || '',
      bio: getElements().bio?.value || '',
      interests: getSelectedInterests(),
      snsLinks: getSnsLinkValues()
    });

    const continuation = pendingContinuation;
    closeOnboardingGate();
    await continuation?.(state);
  } catch (error) {
    // 클라이언트 검증 오류는 사용자가 고칠 수 있는 문구를 그대로 보여준다.
    // 입력 실수까지 콘솔에 쌓지 않고, 서버·네트워크 실패만 기록한다.
    const isValidationError = String(error?.code || '').startsWith('onboarding_');
    if (isValidationError) {
      setError(error.message);
    } else {
      console.warn('[Onboarding] Could not complete onboarding:', error);
      setError('프로필 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  } finally {
    setSubmitting(false);
  }
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  const { complete, interestsBox, nickname } = getElements();
  complete?.addEventListener('click', handleSubmit);
  interestsBox?.addEventListener('click', () => {
    if (isSubmitting) return;
    setError('');
  });
  nickname?.addEventListener('input', () => {
    if (isSubmitting) return;
    setError('');
  });
}

/**
 * 첫 프로필 설정을 요구하는 계정이면 기존 프로필 수정 폼을 온보딩 모드로 연다.
 * 이미 완료한 계정이면 아무것도 열지 않고 false 를 돌려준다.
 */
export async function showOnboardingGateIfRequired(
  client,
  state,
  { onCompleted } = {}
) {
  if (!state?.onboarding?.required) return false;

  bindEvents();
  activeClient = client;
  pendingContinuation = typeof onCompleted === 'function' ? onCompleted : null;

  applyMode(true);
  prefillFromAccountState(state);
  setError('');
  setSubmitting(false);
  openModal();
  return true;
}
