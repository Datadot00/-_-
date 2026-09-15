import {
  completeMyOnboarding,
  ONBOARDING_LIMITS,
  validateAgeRange,
  validateBio,
  validateDevices,
  validateGender,
  validateJobGroup,
  validateInterests,
  validateNickname,
  normalizeToolTag,
  validateToolTags,
  validateSnsLinks
} from './onboardingService.js';
import {
  fetchMyTermsRequirement,
  recordMyCurrentTermConsents
} from './termsService.js';

const DOCUMENT_TYPE_LABELS = {
  terms_of_service: '서비스 이용약관',
  privacy_policy: '개인정보 처리방침',
  marketing_consent: '마케팅 정보 수신 동의'
};

const TOTAL_STEPS = 5;

const STEP_TEXT = Object.freeze({
  1: {
    title: '서비스 이용을 위해 약관을 확인해 주세요',
    subtitle: '필수 약관에 동의해야 서비스를 계속 이용할 수 있어요. 선택 동의는 언제든 변경할 수 있습니다.',
    next: '동의하고 계속하기'
  },
  2: {
    title: '어떤 이름으로 활동하시겠어요?',
    subtitle: `닉네임은 최대 ${ONBOARDING_LIMITS.nicknameMax}자까지 쓸 수 있고, 나중에 내 정보에서 바꿀 수 있어요.`,
    next: '다음'
  },
  3: {
    title: '어떤 테스터인지 알려 주세요',
    subtitle: '테스터 모집 조건을 맞추는 데만 쓰이고, 다른 사용자에게는 공개되지 않아요.',
    next: '다음'
  },
  4: {
    title: '어떤 테스트를 보여 드릴까요?',
    subtitle: `관심분야는 1개 이상 ${ONBOARDING_LIMITS.interestsMax}개 이하로 고르고, 툴·기술과 링크는 선택 사항이에요.`,
    next: '프로필 저장하고 완료'
  },
  5: {
    title: '돈돼 가입을 환영합니다!',
    subtitle: '프로필 설정이 끝났어요. 이제 바로 테스트에 참여할 수 있습니다.',
    next: '돈돼 시작하기'
  }
});

const CHIP_SELECTED_CLASSES = ['bg-[#EEF7DE]', 'border-[#2F6517]', 'text-[#2F6517]'];
const CHIP_IDLE_CLASSES = ['bg-white', 'border-neutral-300', 'text-neutral-700'];

let activeClient = null;
let pendingContinuation = null;
let pendingCompletedState = null;
let currentStep = 1;
let termsDocuments = [];
let termsAlreadyAccepted = false;
let isSubmitting = false;
let eventsBound = false;

function getElements() {
  return {
    modal: document.getElementById('onboarding-wizard-modal'),
    counter: document.getElementById('wizard-step-counter'),
    title: document.getElementById('wizard-step-title'),
    subtitle: document.getElementById('wizard-step-subtitle'),
    error: document.getElementById('wizard-error'),
    back: document.getElementById('btn-wizard-back'),
    next: document.getElementById('btn-wizard-next'),
    termsAll: document.getElementById('wizard-terms-all'),
    termsAllWrapper: document.getElementById('wizard-terms-all-wrapper'),
    termsList: document.getElementById('wizard-terms-document-list'),
    termsLoading: document.getElementById('wizard-terms-loading'),
    termsRetry: document.getElementById('btn-wizard-terms-retry'),
    termsDetail: document.getElementById('wizard-terms-detail'),
    termsDetailTitle: document.getElementById('wizard-terms-detail-title'),
    termsDetailContent: document.getElementById('wizard-terms-detail-content'),
    termsDetailClose: document.getElementById('btn-wizard-terms-detail-close'),
    nickname: document.getElementById('wizard-nickname'),
    nicknameCount: document.getElementById('wizard-nickname-count'),
    jobGroup: document.getElementById('wizard-job-group'),
    bio: document.getElementById('wizard-bio'),
    bioCount: document.getElementById('wizard-bio-count'),
    genderBox: document.getElementById('wizard-gender-box'),
    ageRangeBox: document.getElementById('wizard-age-range-box'),
    deviceBox: document.getElementById('wizard-device-box'),
    deviceCount: document.getElementById('wizard-device-count'),
    interestsBox: document.getElementById('wizard-interest-chips-box'),
    interestCount: document.getElementById('wizard-interest-count'),
    toolTagInput: document.getElementById('wizard-tool-tag-input'),
    toolTagsContainer: document.getElementById('wizard-tool-tags-container'),
    toolTagCount: document.getElementById('wizard-tool-tag-count'),
    toolTagSuggestions: document.getElementById('wizard-tool-tag-suggestions'),
    addToolTag: document.getElementById('btn-wizard-add-tool-tag'),
    snsContainer: document.getElementById('wizard-sns-links-container'),
    addSnsLink: document.getElementById('btn-wizard-add-sns-link'),
    completeNickname: document.getElementById('wizard-complete-nickname')
  };
}

function setError(message = '') {
  const { error } = getElements();
  if (!error) return;
  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

/* ------------------------------------------------------------------ *
 * Step 1 : 약관 동의
 * ------------------------------------------------------------------ */

function getTermsCheckboxes() {
  return [...document.querySelectorAll('[data-wizard-terms-checkbox]')];
}

function getRequiredTermsMissing() {
  return getTermsCheckboxes()
    .some(checkbox => checkbox.dataset.required === 'true' && !checkbox.checked);
}

function updateTermsAgreementState() {
  const { termsAll } = getElements();
  const checkboxes = getTermsCheckboxes();
  const checkedCount = checkboxes.filter(checkbox => checkbox.checked).length;

  if (termsAll) {
    termsAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
    termsAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  }
  updateFooter();
}

function createTermsRow(documentRecord) {
  const wrapper = document.createElement('div');
  wrapper.className = 'rounded-xl border border-neutral-200 bg-white px-4 py-3';

  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3';

  const label = document.createElement('label');
  label.className = 'flex min-w-0 flex-1 cursor-pointer items-start gap-3';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = documentRecord.isAccepted;
  checkbox.dataset.wizardTermsCheckbox = documentRecord.id;
  checkbox.dataset.required = String(documentRecord.isRequired);
  checkbox.className = 'mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2F6517]';

  const textWrapper = document.createElement('span');
  textWrapper.className = 'min-w-0';

  const title = document.createElement('span');
  title.className = 'block text-xs font-extrabold text-neutral-800';
  title.textContent = DOCUMENT_TYPE_LABELS[documentRecord.documentType]
    || documentRecord.title
    || '약관';

  const metadata = document.createElement('span');
  metadata.className = 'mt-0.5 block text-[11px] font-medium text-neutral-400';
  metadata.textContent = `${documentRecord.isRequired ? '필수' : '선택'} · ${documentRecord.version}`;

  textWrapper.append(title, metadata);
  label.append(checkbox, textWrapper);

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.dataset.wizardTermsDetail = documentRecord.id;
  detailButton.className = 'shrink-0 text-[11px] font-bold text-[#568A32] underline underline-offset-2';
  detailButton.textContent = '내용 보기';

  row.append(label, detailButton);
  wrapper.append(row);
  return wrapper;
}

function renderTermsDocuments(documents) {
  const {
    termsAllWrapper, termsList, termsLoading, termsRetry, termsDetail
  } = getElements();

  termsDocuments = documents;
  termsList?.replaceChildren(...documents.map(createTermsRow));
  termsAllWrapper?.classList.remove('hidden');
  termsList?.classList.remove('hidden');
  termsLoading?.classList.add('hidden');
  termsRetry?.classList.add('hidden');
  termsDetail?.classList.add('hidden');
  setError('');
  updateTermsAgreementState();
}

function renderTermsLoading() {
  const {
    termsAllWrapper, termsList, termsLoading, termsRetry, termsDetail
  } = getElements();

  termsDocuments = [];
  termsList?.replaceChildren();
  termsAllWrapper?.classList.add('hidden');
  termsList?.classList.add('hidden');
  termsLoading?.classList.remove('hidden');
  termsRetry?.classList.add('hidden');
  termsDetail?.classList.add('hidden');
  updateFooter();
}

function renderTermsLoadError() {
  const {
    termsAllWrapper, termsList, termsLoading, termsRetry, termsDetail
  } = getElements();

  termsDocuments = [];
  termsAllWrapper?.classList.add('hidden');
  termsList?.classList.add('hidden');
  termsLoading?.classList.add('hidden');
  termsDetail?.classList.add('hidden');
  termsRetry?.classList.remove('hidden');
  setError('약관 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
  updateFooter();
}

function showTermsDetail(documentId) {
  const { termsDetail, termsDetailTitle, termsDetailContent } = getElements();
  const documentRecord = termsDocuments.find(item => item.id === documentId);
  if (!documentRecord || !termsDetail) return;

  if (termsDetailTitle) termsDetailTitle.textContent = documentRecord.title;
  if (termsDetailContent) termsDetailContent.textContent = documentRecord.content;
  termsDetail.classList.remove('hidden');
  termsDetailContent?.scrollTo?.({ top: 0 });
  getElements().termsDetailClose?.focus();
}

/**
 * 약관 상태를 미리 읽어 두어야 이미 동의한 계정의 1단계를 건너뛸 수 있다.
 * 마이그레이션 전 환경(configured=false)도 동의가 끝난 것으로 본다.
 */
async function loadTermsStep() {
  renderTermsLoading();

  try {
    const status = await fetchMyTermsRequirement(activeClient);
    termsAlreadyAccepted = !status.configured || !status.requiresConsent;
    if (!termsAlreadyAccepted) renderTermsDocuments(status.documents);
    return termsAlreadyAccepted;
  } catch (error) {
    console.warn('[Onboarding] Could not load consent requirement:', error);
    termsAlreadyAccepted = false;
    renderTermsLoadError();
    return false;
  }
}

async function submitTermsStep() {
  if (getRequiredTermsMissing()) {
    setError('필수 약관에 모두 동의해 주세요.');
    return false;
  }

  const acceptedDocumentIds = getTermsCheckboxes()
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.dataset.wizardTermsCheckbox);

  try {
    await recordMyCurrentTermConsents(activeClient, acceptedDocumentIds);
    termsAlreadyAccepted = true;
    return true;
  } catch (error) {
    console.warn('[Onboarding] Could not record consent:', error);
    setError('약관 동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Step 2 : 닉네임 · 한줄소개
 * ------------------------------------------------------------------ */

function updateInputCounts() {
  const {
    nickname, nicknameCount, bio, bioCount
  } = getElements();

  if (nicknameCount) {
    nicknameCount.textContent = `${(nickname?.value || '').length}/${ONBOARDING_LIMITS.nicknameMax}자`;
  }
  if (bioCount) {
    bioCount.textContent = `${(bio?.value || '').length}/${ONBOARDING_LIMITS.bioMax}자`;
  }
}

/* ------------------------------------------------------------------ *
 * Step 3 : 성별 · 연령대 · 주 사용기기
 * ------------------------------------------------------------------ */

/** 성별·연령대는 하나만 고르는 버튼 묶음이라 aria-checked 로 상태를 표시한다. */
function getSingleChoiceButtons(attribute) {
  return [...document.querySelectorAll(`[data-wizard-${attribute}]`)];
}

function getSingleChoiceValue(attribute) {
  const datasetKey = attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const selected = getSingleChoiceButtons(attribute)
    .find(button => button.getAttribute('aria-checked') === 'true');
  return selected?.dataset[`wizard${datasetKey[0].toUpperCase()}${datasetKey.slice(1)}`] || '';
}

function setSingleChoice(attribute, value) {
  const datasetKey = attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const propertyName = `wizard${datasetKey[0].toUpperCase()}${datasetKey.slice(1)}`;

  getSingleChoiceButtons(attribute).forEach(button => {
    const isSelected = Boolean(value) && button.dataset[propertyName] === value;
    button.setAttribute('aria-checked', String(isSelected));
    button.classList.remove(...(isSelected ? CHIP_IDLE_CLASSES : CHIP_SELECTED_CLASSES));
    button.classList.add(...(isSelected ? CHIP_SELECTED_CLASSES : CHIP_IDLE_CLASSES));
  });
}

function getDeviceButtons() {
  return [...document.querySelectorAll('[data-wizard-device]')];
}

function getSelectedDevices() {
  return getDeviceButtons()
    .filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => button.dataset.wizardDevice);
}

function setDeviceSelected(button, isSelected) {
  button.setAttribute('aria-pressed', String(isSelected));
  button.classList.remove(...(isSelected ? CHIP_IDLE_CLASSES : CHIP_SELECTED_CLASSES));
  button.classList.add(...(isSelected ? CHIP_SELECTED_CLASSES : CHIP_IDLE_CLASSES));
}

function updateDeviceCount() {
  const { deviceCount } = getElements();
  if (!deviceCount) return;
  const selected = getSelectedDevices().length;
  deviceCount.textContent = `${selected}개 선택`;
  deviceCount.classList.toggle('text-[#2F6517]', selected > 0);
  deviceCount.classList.toggle('text-neutral-400', selected === 0);
}

/* ------------------------------------------------------------------ *
 * Step 4 : 관심분야 · SNS
 * ------------------------------------------------------------------ */

function getInterestButtons() {
  return [...document.querySelectorAll('#wizard-interest-chips-box [data-wizard-interest]')];
}

function getSelectedInterests() {
  return getInterestButtons()
    .filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => button.dataset.wizardInterest);
}

function setInterestSelected(button, isSelected) {
  button.setAttribute('aria-pressed', String(isSelected));
  button.classList.remove(...(isSelected ? CHIP_IDLE_CLASSES : CHIP_SELECTED_CLASSES));
  button.classList.add(...(isSelected ? CHIP_SELECTED_CLASSES : CHIP_IDLE_CLASSES));
}

function updateInterestCount() {
  const { interestCount } = getElements();
  if (!interestCount) return;
  const selected = getSelectedInterests().length;
  interestCount.textContent = `${selected}/${ONBOARDING_LIMITS.interestsMax}개 선택`;
  interestCount.classList.toggle('text-[#2F6517]', selected > 0);
  interestCount.classList.toggle('text-neutral-400', selected === 0);
}

function getToolTagChips() {
  return [...document.querySelectorAll('[data-wizard-tool-tag]')];
}

function getToolTagValues() {
  return getToolTagChips().map(chip => chip.dataset.wizardToolTag);
}

function updateToolTagCount() {
  const { toolTagCount } = getElements();
  if (!toolTagCount) return;
  const added = getToolTagChips().length;
  toolTagCount.textContent = `${added}/${ONBOARDING_LIMITS.toolTagsMax}개`;
  toolTagCount.classList.toggle('text-[#2F6517]', added > 0);
  toolTagCount.classList.toggle('text-neutral-400', added === 0);
}

function createToolTagChip(value) {
  const chip = document.createElement('span');
  chip.dataset.wizardToolTag = value;
  chip.className = 'flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs';

  const label = document.createElement('span');
  label.textContent = `🛠️ ${value}`;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.dataset.wizardToolTagRemove = value;
  remove.className = 'ml-0.5 text-xs text-neutral-400 hover:text-red-500';
  remove.setAttribute('aria-label', `${value} 태그 삭제`);
  remove.textContent = '✕';

  chip.append(label, remove);
  return chip;
}

/** 입력칸과 추천 칩 양쪽에서 같은 규칙으로 태그를 더한다. */
function addToolTags(rawValue) {
  const { toolTagsContainer } = getElements();
  if (!toolTagsContainer) return;

  const existing = getToolTagValues();
  const seen = new Set(existing.map(tag => tag.toLocaleLowerCase()));
  let added = 0;

  String(rawValue ?? '').split(/[,，]/).forEach(candidate => {
    const tag = normalizeToolTag(candidate);
    if (!tag || seen.has(tag.toLocaleLowerCase())) return;
    if (existing.length + added >= ONBOARDING_LIMITS.toolTagsMax) {
      setError(`툴·기술 태그는 최대 ${ONBOARDING_LIMITS.toolTagsMax}개까지 추가할 수 있습니다.`);
      return;
    }
    seen.add(tag.toLocaleLowerCase());
    toolTagsContainer.append(createToolTagChip(tag));
    added += 1;
  });

  updateToolTagCount();
}

function renderToolTags(tags = []) {
  const { toolTagsContainer } = getElements();
  const unique = [];
  const seen = new Set();

  tags.forEach(value => {
    const tag = normalizeToolTag(value);
    if (!tag || seen.has(tag.toLocaleLowerCase())) return;
    seen.add(tag.toLocaleLowerCase());
    unique.push(tag);
  });

  toolTagsContainer?.replaceChildren(
    ...unique.slice(0, ONBOARDING_LIMITS.toolTagsMax).map(createToolTagChip)
  );
  updateToolTagCount();
}

function createSnsLinkRow(value = '') {
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';

  const input = document.createElement('input');
  input.type = 'url';
  input.value = value;
  input.placeholder = 'https://example.com';
  input.maxLength = ONBOARDING_LIMITS.snsLinkMax;
  input.dataset.wizardSnsLink = 'true';
  input.className = 'w-full rounded-xl border border-neutral-300 p-3 font-semibold text-neutral-dark outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.dataset.wizardSnsRemove = 'true';
  remove.className = 'shrink-0 rounded-xl border border-neutral-300 bg-white px-3 py-3 text-xs font-bold text-neutral-500 transition-colors hover:bg-neutral-50';
  remove.textContent = '삭제';
  remove.setAttribute('aria-label', 'SNS 링크 삭제');

  row.append(input, remove);
  return row;
}

function getSnsLinkValues() {
  return [...document.querySelectorAll('[data-wizard-sns-link]')].map(input => input.value);
}

function renderSnsLinks(links = []) {
  const { snsContainer } = getElements();
  snsContainer?.replaceChildren(...links.map(link => createSnsLinkRow(link)));
}

function updateAddSnsLinkAvailability() {
  const { addSnsLink } = getElements();
  if (!addSnsLink) return;
  const rowCount = document.querySelectorAll('[data-wizard-sns-link]').length;
  addSnsLink.disabled = rowCount >= ONBOARDING_LIMITS.snsLinksMax;
  addSnsLink.classList.toggle('opacity-40', addSnsLink.disabled);
  addSnsLink.classList.toggle('cursor-not-allowed', addSnsLink.disabled);
}

async function submitProfileStep() {
  try {
    const state = await completeMyOnboarding(activeClient, {
      nickname: getElements().nickname?.value || '',
      bio: getElements().bio?.value || '',
      jobGroup: getElements().jobGroup?.value || '',
      gender: getSingleChoiceValue('gender'),
      ageRange: getSingleChoiceValue('age-range'),
      devices: getSelectedDevices(),
      toolTags: getToolTagValues(),
      interests: getSelectedInterests(),
      snsLinks: getSnsLinkValues()
    });
    return state;
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
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 단계 전환
 * ------------------------------------------------------------------ */

function updateStepper() {
  [...document.querySelectorAll('[data-wizard-step-indicator]')].forEach(indicator => {
    const step = Number(indicator.dataset.wizardStepIndicator);
    const badge = indicator.querySelector('[data-wizard-step-badge]');
    const bar = indicator.querySelector('[data-wizard-step-bar]');
    const isDone = step < currentStep;
    const isCurrent = step === currentStep;

    if (badge) {
      badge.textContent = isDone ? '✓' : String(step);
      badge.className = [
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black transition-colors',
        isDone || isCurrent ? 'bg-[#2F6517] text-white' : 'bg-neutral-200 text-neutral-500'
      ].join(' ');
      badge.setAttribute('aria-current', isCurrent ? 'step' : 'false');
    }
    if (bar) {
      bar.className = [
        'h-[3px] flex-1 rounded-full transition-colors',
        isDone ? 'bg-[#2F6517]' : 'bg-neutral-200'
      ].join(' ');
    }
  });
}

function updateFooter() {
  const { back, next } = getElements();
  const text = STEP_TEXT[currentStep];

  if (back) {
    // 약관을 이미 통과한 계정은 1단계로 되돌아갈 이유가 없다.
    const minimumStep = termsAlreadyAccepted ? 2 : 1;
    back.disabled = isSubmitting || currentStep <= minimumStep;
    back.classList.toggle('invisible', currentStep === TOTAL_STEPS);
  }
  if (next) {
    next.textContent = isSubmitting ? '저장 중...' : text.next;
    next.disabled = isSubmitting
      || (currentStep === 1 && (termsDocuments.length === 0 || getRequiredTermsMissing()));
  }
}

function showStep(step) {
  currentStep = step;
  const text = STEP_TEXT[step];
  const {
    counter, title, subtitle, nickname
  } = getElements();

  [...document.querySelectorAll('[data-wizard-step-panel]')].forEach(panel => {
    const isActive = Number(panel.dataset.wizardStepPanel) === step;
    panel.classList.toggle('hidden', !isActive);
    // 패널마다 레이아웃이 달라 flex 복원은 원래 클래스가 있는 패널에만 적용한다.
    if (panel.dataset.wizardStepPanel !== '1') {
      panel.classList.toggle('flex', isActive);
    }
  });

  if (counter) counter.textContent = `STEP ${step} / ${TOTAL_STEPS}`;
  if (title) title.textContent = text.title;
  if (subtitle) subtitle.textContent = text.subtitle;

  setError('');
  updateStepper();
  updateFooter();

  if (step === 2) window.setTimeout(() => nickname?.focus(), 0);
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  updateFooter();
}

async function handleNext() {
  if (!activeClient || isSubmitting) return;
  setError('');

  if (currentStep === 1) {
    setSubmitting(true);
    const accepted = await submitTermsStep();
    setSubmitting(false);
    if (accepted) showStep(2);
    return;
  }

  if (currentStep === 2) {
    try {
      validateNickname(getElements().nickname?.value || '');
      validateBio(getElements().bio?.value || '');
      validateJobGroup(getElements().jobGroup?.value || '');
    } catch (error) {
      setError(error.message);
      return;
    }
    showStep(3);
    return;
  }

  if (currentStep === 3) {
    try {
      validateGender(getSingleChoiceValue('gender'));
      validateAgeRange(getSingleChoiceValue('age-range'));
      validateDevices(getSelectedDevices());
    } catch (error) {
      setError(error.message);
      return;
    }
    showStep(4);
    return;
  }

  if (currentStep === 4) {
    try {
      validateInterests(getSelectedInterests());
      validateToolTags(getToolTagValues());
      validateSnsLinks(getSnsLinkValues());
    } catch (error) {
      setError(error.message);
      return;
    }

    setSubmitting(true);
    const state = await submitProfileStep();
    setSubmitting(false);
    if (!state) return;

    const { completeNickname } = getElements();
    if (completeNickname) {
      completeNickname.textContent = state.profile?.nickname
        || getElements().nickname?.value
        || '돈돼';
    }
    pendingCompletedState = state;
    showStep(5);
    return;
  }

  const continuation = pendingContinuation;
  const completedState = pendingCompletedState;
  closeOnboardingWizard();
  await continuation?.(completedState);
}

function handleBack() {
  if (isSubmitting || currentStep <= 1) return;
  const minimumStep = termsAlreadyAccepted ? 2 : 1;
  if (currentStep <= minimumStep) return;
  showStep(currentStep - 1);
}

/* ------------------------------------------------------------------ *
 * 열기 / 닫기
 * ------------------------------------------------------------------ */

function prefillFromAccountState(state) {
  const { nickname, bio, jobGroup } = getElements();
  const profile = state?.profile || {};

  if (nickname) nickname.value = profile.nickname || '';
  if (bio) bio.value = profile.bio || '';
  if (jobGroup) jobGroup.value = profile.jobGroup || '';

  setSingleChoice('gender', profile.gender || '');
  setSingleChoice('age-range', profile.ageRange || '');

  const selectedDevices = new Set(Array.isArray(profile.devices) ? profile.devices : []);
  getDeviceButtons().forEach(button => {
    setDeviceSelected(button, selectedDevices.has(button.dataset.wizardDevice));
  });

  const selected = new Set(Array.isArray(profile.interests) ? profile.interests : []);
  getInterestButtons().forEach(button => {
    setInterestSelected(button, selected.has(button.dataset.wizardInterest));
  });

  renderToolTags(Array.isArray(profile.toolTags) ? profile.toolTags : []);
  renderSnsLinks(Array.isArray(profile.snsLinks) ? profile.snsLinks : []);
  updateInputCounts();
  updateDeviceCount();
  updateInterestCount();
  updateAddSnsLinkAvailability();
}

function openModal() {
  const { modal } = getElements();
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.classList.add('overflow-hidden');
}

export function closeOnboardingWizard() {
  const { modal, termsDetail } = getElements();
  modal?.classList.add('hidden');
  modal?.classList.remove('flex');
  termsDetail?.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');

  activeClient = null;
  pendingContinuation = null;
  pendingCompletedState = null;
  termsDocuments = [];
  termsAlreadyAccepted = false;
  isSubmitting = false;
  currentStep = 1;
  setError('');
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  const {
    back, next, termsAll, termsList, termsDetailClose, termsRetry,
    nickname, bio, jobGroup, genderBox, ageRangeBox, deviceBox,
    interestsBox, toolTagInput, toolTagsContainer, toolTagSuggestions, addToolTag,
    snsContainer, addSnsLink
  } = getElements();

  back?.addEventListener('click', handleBack);
  next?.addEventListener('click', handleNext);

  termsAll?.addEventListener('change', () => {
    getTermsCheckboxes().forEach(checkbox => {
      checkbox.checked = termsAll.checked;
    });
    setError('');
    updateTermsAgreementState();
  });

  termsList?.addEventListener('change', event => {
    if (!event.target.closest('[data-wizard-terms-checkbox]')) return;
    setError('');
    updateTermsAgreementState();
  });

  termsList?.addEventListener('click', event => {
    const detailButton = event.target.closest('[data-wizard-terms-detail]');
    if (!detailButton) return;
    showTermsDetail(detailButton.dataset.wizardTermsDetail);
  });

  termsDetailClose?.addEventListener('click', () => {
    getElements().termsDetail?.classList.add('hidden');
  });

  termsRetry?.addEventListener('click', async () => {
    setError('');
    const skipTerms = await loadTermsStep();
    if (skipTerms) showStep(2);
  });

  nickname?.addEventListener('input', () => {
    updateInputCounts();
    setError('');
  });
  bio?.addEventListener('input', () => {
    updateInputCounts();
    setError('');
  });
  jobGroup?.addEventListener('change', () => setError(''));

  genderBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-wizard-gender]');
    if (!choice) return;
    setSingleChoice('gender', choice.dataset.wizardGender);
    setError('');
  });

  ageRangeBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-wizard-age-range]');
    if (!choice) return;
    setSingleChoice('age-range', choice.dataset.wizardAgeRange);
    setError('');
  });

  deviceBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-wizard-device]');
    if (!choice) return;
    setDeviceSelected(choice, choice.getAttribute('aria-pressed') !== 'true');
    setError('');
    updateDeviceCount();
  });

  interestsBox?.addEventListener('click', event => {
    const chip = event.target.closest('[data-wizard-interest]');
    if (!chip) return;
    const willSelect = chip.getAttribute('aria-pressed') !== 'true';
    if (willSelect && getSelectedInterests().length >= ONBOARDING_LIMITS.interestsMax) {
      setError(`관심분야는 최대 ${ONBOARDING_LIMITS.interestsMax}개까지 선택할 수 있습니다.`);
      return;
    }
    setInterestSelected(chip, willSelect);
    setError('');
    updateInterestCount();
  });

  const commitToolTagInput = () => {
    const { toolTagInput: input } = getElements();
    if (!input?.value.trim()) return;
    setError('');
    addToolTags(input.value);
    input.value = '';
  };

  addToolTag?.addEventListener('click', commitToolTagInput);
  toolTagInput?.addEventListener('keydown', event => {
    // Enter 로 태그를 확정할 때 폼이 제출되거나 다음 단계로 넘어가지 않게 막는다.
    if (event.key !== 'Enter') return;
    event.preventDefault?.();
    commitToolTagInput();
  });

  toolTagSuggestions?.addEventListener('click', event => {
    const suggestion = event.target.closest('[data-wizard-tool-suggestion]');
    if (!suggestion) return;
    setError('');
    addToolTags(suggestion.dataset.wizardToolSuggestion);
  });

  toolTagsContainer?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-wizard-tool-tag-remove]');
    if (!removeButton) return;
    removeButton.closest('[data-wizard-tool-tag]')?.remove();
    setError('');
    updateToolTagCount();
  });

  addSnsLink?.addEventListener('click', () => {
    const { snsContainer: container } = getElements();
    if (!container) return;
    if (document.querySelectorAll('[data-wizard-sns-link]').length >= ONBOARDING_LIMITS.snsLinksMax) return;
    container.append(createSnsLinkRow());
    updateAddSnsLinkAvailability();
    setError('');
  });

  snsContainer?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-wizard-sns-remove]');
    if (!removeButton) return;
    removeButton.closest('div')?.remove();
    updateAddSnsLinkAvailability();
    setError('');
  });
}

/**
 * 가입 직후 4단계 온보딩 위저드를 연다.
 * 약관에 이미 동의한 계정이면 1단계를 완료 처리하고 2단계부터 시작한다.
 */
export async function showOnboardingWizard(client, state, { onCompleted } = {}) {
  const { modal } = getElements();
  if (!modal) return false;

  bindEvents();
  activeClient = client;
  pendingContinuation = typeof onCompleted === 'function' ? onCompleted : null;
  pendingCompletedState = null;
  isSubmitting = false;

  prefillFromAccountState(state);
  showStep(1);
  openModal();

  const skipTerms = await loadTermsStep();
  showStep(skipTerms ? 2 : 1);
  return true;
}
