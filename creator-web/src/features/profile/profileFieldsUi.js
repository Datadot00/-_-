import {
  ONBOARDING_LIMITS,
  normalizeToolTag,
  validateAgeRange,
  validateDevices,
  validateGender,
  validateJobGroup,
  validateToolTags
} from '../auth/onboardingService.js';

/**
 * 내 정보 수정 모달에서 온보딩 때 받은 항목(직업군·성별·연령대·기기·툴 태그)을
 * 다시 보여 주고 고칠 수 있게 한다. 검증 규칙은 onboardingService 를 그대로 쓴다.
 *
 * 온보딩 위저드와 화면은 다르지만 저장 규칙이 갈라지면 안 되므로,
 * 이 모듈은 DOM 만 다루고 판단은 전부 공용 검증 함수에 맡긴다.
 */

const CHIP_SELECTED_CLASSES = ['bg-[#EEF7DE]', 'border-[#2F6517]', 'text-[#2F6517]'];
const CHIP_IDLE_CLASSES = ['bg-white', 'border-neutral-300', 'text-neutral-700'];

let eventsBound = false;

// 이미 저장된 성별·연령대는 바꿀 수 없다. 모집 조건 매칭에 쓰는 값이라
// 본인이 고칠 수 있으면 조건에 맞추려고 바꾸는 유인이 생기기 때문이다.
// 값이 비어 있는 계정(컬럼이 생기기 전 가입자)만 한 번 채울 수 있다.
const lockedChoices = { gender: false, 'age-range': false };

const LOCKED_HINT = '🔒 모집 조건 매칭에 사용되어 변경할 수 없습니다.';
const UNLOCKED_HINT = '한 번 저장하면 변경할 수 없으니 신중히 선택해 주세요.';

function getElements() {
  return {
    jobGroup: document.getElementById('profile-job-group'),
    genderBox: document.getElementById('profile-gender-box'),
    genderHint: document.getElementById('profile-gender-hint'),
    ageRangeBox: document.getElementById('profile-age-range-box'),
    ageRangeHint: document.getElementById('profile-age-range-hint'),
    deviceBox: document.getElementById('profile-device-box'),
    deviceCount: document.getElementById('profile-device-count'),
    toolTagInput: document.getElementById('profile-tool-tag-input'),
    toolTagsContainer: document.getElementById('profile-tool-tags-container'),
    toolTagCount: document.getElementById('profile-tool-tag-count'),
    addToolTag: document.getElementById('btn-profile-add-tool-tag')
  };
}

function setChoiceStyle(button, isSelected) {
  button.classList.remove(...(isSelected ? CHIP_IDLE_CLASSES : CHIP_SELECTED_CLASSES));
  button.classList.add(...(isSelected ? CHIP_SELECTED_CLASSES : CHIP_IDLE_CLASSES));
}

/* --- 성별 · 연령대 : 하나만 고르는 버튼 묶음 --- */

function getSingleChoiceButtons(attribute) {
  return [...document.querySelectorAll(`[data-profile-${attribute}]`)];
}

function datasetKeyFor(attribute) {
  const camel = attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return `profile${camel[0].toUpperCase()}${camel.slice(1)}`;
}

export function getSingleChoiceValue(attribute) {
  const key = datasetKeyFor(attribute);
  const selected = getSingleChoiceButtons(attribute)
    .find(button => button.getAttribute('aria-checked') === 'true');
  return selected?.dataset[key] || '';
}

function setSingleChoice(attribute, value) {
  const key = datasetKeyFor(attribute);
  getSingleChoiceButtons(attribute).forEach(button => {
    const isSelected = Boolean(value) && button.dataset[key] === value;
    button.setAttribute('aria-checked', String(isSelected));
    setChoiceStyle(button, isSelected);
  });
}

/** 잠긴 항목은 고른 값만 회색으로 남기고 나머지 버튼은 눌리지 않게 한다. */
function applyChoiceLock(attribute, isLocked) {
  lockedChoices[attribute] = isLocked;

  const { genderHint, ageRangeHint } = getElements();
  const hint = attribute === 'gender' ? genderHint : ageRangeHint;
  if (hint) hint.textContent = isLocked ? LOCKED_HINT : UNLOCKED_HINT;

  getSingleChoiceButtons(attribute).forEach(button => {
    const isSelected = button.getAttribute('aria-checked') === 'true';
    button.disabled = isLocked;
    button.setAttribute('aria-disabled', String(isLocked));
    // 선택되지 않은 항목은 잠겼을 때 보이지 않게 흐린다.
    button.classList.toggle('opacity-40', isLocked && !isSelected);
    button.classList.toggle('cursor-not-allowed', isLocked);
  });
}

/* --- 주 사용기기 : 복수 선택 --- */

function getDeviceButtons() {
  return [...document.querySelectorAll('[data-profile-device]')];
}

export function getSelectedDevices() {
  return getDeviceButtons()
    .filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => button.dataset.profileDevice);
}

function setDeviceSelected(button, isSelected) {
  button.setAttribute('aria-pressed', String(isSelected));
  setChoiceStyle(button, isSelected);
}

function updateDeviceCount() {
  const { deviceCount } = getElements();
  if (!deviceCount) return;
  deviceCount.textContent = `${getSelectedDevices().length}개 선택`;
}

/* --- 툴 · 기술 태그 --- */

function getToolTagChips() {
  return [...document.querySelectorAll('[data-profile-tool-tag]')];
}

export function getToolTagValues() {
  return getToolTagChips().map(chip => chip.dataset.profileToolTag);
}

function updateToolTagCount() {
  const { toolTagCount } = getElements();
  if (!toolTagCount) return;
  toolTagCount.textContent = `${getToolTagChips().length}/${ONBOARDING_LIMITS.toolTagsMax}개`;
}

function createToolTagChip(value) {
  const chip = document.createElement('span');
  chip.dataset.profileToolTag = value;
  chip.className = 'flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs';

  const label = document.createElement('span');
  label.textContent = `🛠️ ${value}`;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.dataset.profileToolTagRemove = value;
  remove.className = 'ml-0.5 text-xs text-neutral-400 hover:text-red-500';
  remove.setAttribute('aria-label', `${value} 태그 삭제`);
  remove.textContent = '✕';

  chip.append(label, remove);
  return chip;
}

function addToolTags(rawValue) {
  const { toolTagsContainer } = getElements();
  if (!toolTagsContainer) return;

  const seen = new Set(getToolTagValues().map(tag => tag.toLocaleLowerCase()));
  let total = seen.size;

  String(rawValue ?? '').split(/[,，]/).forEach(candidate => {
    const tag = normalizeToolTag(candidate);
    if (!tag || seen.has(tag.toLocaleLowerCase())) return;
    if (total >= ONBOARDING_LIMITS.toolTagsMax) return;
    seen.add(tag.toLocaleLowerCase());
    toolTagsContainer.append(createToolTagChip(tag));
    total += 1;
  });

  updateToolTagCount();
}

/* --- 공개 API --- */

/** get_my_private_profile 이 돌려준 행(스네이크 케이스)을 그대로 받는다. */
export function renderProfileExtraFields(profile = {}) {
  const { jobGroup, toolTagsContainer } = getElements();

  if (jobGroup) jobGroup.value = profile.job_group || '';

  setSingleChoice('gender', profile.gender || '');
  setSingleChoice('age-range', profile.age_range || '');
  applyChoiceLock('gender', Boolean(profile.gender));
  applyChoiceLock('age-range', Boolean(profile.age_range));

  const selectedDevices = new Set(Array.isArray(profile.devices) ? profile.devices : []);
  getDeviceButtons().forEach(button => {
    setDeviceSelected(button, selectedDevices.has(button.dataset.profileDevice));
  });

  const tags = (Array.isArray(profile.tool_tags) ? profile.tool_tags : [])
    .map(normalizeToolTag)
    .filter(Boolean)
    .slice(0, ONBOARDING_LIMITS.toolTagsMax);
  toolTagsContainer?.replaceChildren(...tags.map(createToolTagChip));

  updateDeviceCount();
  updateToolTagCount();
}

/**
 * 저장 직전에 값을 모아 검증한다.
 * 온보딩 전 가입자를 막지 않으려고 빈 값은 통과시키고, 값이 있을 때만 규칙을 본다.
 */
export function collectProfileExtraFields() {
  const { jobGroup } = getElements();
  const gender = getSingleChoiceValue('gender');
  const ageRange = getSingleChoiceValue('age-range');

  return {
    jobGroup: validateJobGroup(jobGroup?.value || ''),
    gender: gender ? validateGender(gender) : '',
    ageRange: ageRange ? validateAgeRange(ageRange) : '',
    devices: validateDevices(getSelectedDevices()),
    toolTags: validateToolTags(getToolTagValues())
  };
}

export function bindProfileExtraFields() {
  if (eventsBound) return;
  eventsBound = true;

  const {
    genderBox, ageRangeBox, deviceBox,
    toolTagInput, toolTagsContainer, addToolTag
  } = getElements();

  genderBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-profile-gender]');
    if (!choice || lockedChoices.gender) return;
    // 아직 잠기지 않은 동안에는 다시 눌러 해제할 수 있다. 저장 전에 고친다.
    const isSelected = choice.getAttribute('aria-checked') === 'true';
    setSingleChoice('gender', isSelected ? '' : choice.dataset.profileGender);
  });

  ageRangeBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-profile-age-range]');
    if (!choice || lockedChoices['age-range']) return;
    const isSelected = choice.getAttribute('aria-checked') === 'true';
    setSingleChoice('age-range', isSelected ? '' : choice.dataset.profileAgeRange);
  });

  deviceBox?.addEventListener('click', event => {
    const choice = event.target.closest('[data-profile-device]');
    if (!choice) return;
    setDeviceSelected(choice, choice.getAttribute('aria-pressed') !== 'true');
    updateDeviceCount();
  });

  const commitToolTagInput = () => {
    const { toolTagInput: input } = getElements();
    if (!input?.value.trim()) return;
    addToolTags(input.value);
    input.value = '';
  };

  addToolTag?.addEventListener('click', commitToolTagInput);
  toolTagInput?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault?.();
    commitToolTagInput();
  });

  toolTagsContainer?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-profile-tool-tag-remove]');
    if (!removeButton) return;
    removeButton.closest('[data-profile-tool-tag]')?.remove();
    updateToolTagCount();
  });
}
