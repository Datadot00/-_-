/**
 * 브라우저 없이 온보딩 위저드를 굴려 보기 위한 최소 DOM 구현.
 * 위저드가 실제로 쓰는 API(생성·추가·교체·선택자 조회·이벤트 위임)만 흉내 낸다.
 */

function datasetKeyOf(attributeName) {
  return attributeName
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function matchesSimpleSelector(node, selector) {
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const key = datasetKeyOf(selector.slice(1, -1));
    return node.dataset[key] !== undefined;
  }
  return node.tagName === selector.toLowerCase();
}

class StubElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toLowerCase();
    this.id = '';
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.classes = new Set();
    this.value = '';
    this.textContent = '';
    this.checked = false;
    this.indeterminate = false;
    this.disabled = false;
    this.type = '';

    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, force) => {
        const on = force === undefined ? !this.classes.has(name) : force;
        if (on) this.classes.add(name);
        else this.classes.delete(name);
        return on;
      },
      contains: name => this.classes.has(name)
    };
  }

  get className() {
    return [...this.classes].join(' ');
  }

  set className(value) {
    this.classes = new Set(String(value).split(' ').filter(Boolean));
  }

  get hidden() {
    return this.classes.has('hidden');
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith('data-')) this.dataset[datasetKeyOf(name)] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  append(...nodes) {
    nodes.forEach(node => {
      node.parentNode = this;
      this.children.push(node);
    });
  }

  replaceChildren(...nodes) {
    this.children.forEach(child => { child.parentNode = null; });
    this.children = [];
    this.append(...nodes);
  }

  remove() {
    const parent = this.parentNode;
    if (!parent) return;
    parent.children = parent.children.filter(child => child !== this);
    this.parentNode = null;
  }

  descendants() {
    return this.children.flatMap(child => [child, ...child.descendants()]);
  }

  matches(selector) {
    return matchesSimpleSelector(this, selector);
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    const target = parts[parts.length - 1];
    let roots = [this];

    // '#scope [data-x]' 형태만 쓰므로 앞쪽 토큰은 범위 좁히기로만 처리한다.
    parts.slice(0, -1).forEach(scopeSelector => {
      roots = roots.flatMap(root => root.descendants()
        .filter(node => matchesSimpleSelector(node, scopeSelector)));
    });

    return roots.flatMap(root => root.descendants()
      .filter(node => matchesSimpleSelector(node, target)));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  dispatch(type, event = {}) {
    (this.listeners[type] || []).forEach(handler => handler({ target: this, ...event }));
  }

  click() {
    this.dispatch('click');
  }

  focus() {}
}

/**
 * 위저드 마크업과 같은 id·data 속성을 가진 트리를 만들어 전역 document/window 에 꽂는다.
 */
export function installWizardDom({ interests = ['핀테크/금융', 'AI/개발도구', '교육/학습'] } = {}) {
  const byId = {};

  const create = (tagName, id = '', className = '') => {
    const node = new StubElement(tagName);
    if (id) {
      node.id = id;
      byId[id] = node;
    }
    if (className) node.className = className;
    return node;
  };

  const root = create('body');

  const modal = create('div', 'onboarding-wizard-modal', 'hidden');
  root.append(modal);

  [
    'wizard-step-counter', 'wizard-step-title', 'wizard-step-subtitle',
    'wizard-terms-all-wrapper', 'wizard-terms-loading', 'wizard-terms-detail',
    'wizard-terms-detail-title', 'wizard-terms-detail-content',
    'btn-wizard-terms-detail-close', 'btn-wizard-terms-retry',
    'wizard-nickname', 'wizard-nickname-count', 'wizard-job-group',
    'wizard-bio', 'wizard-bio-count',
    'wizard-device-count', 'wizard-interest-count',
    'wizard-tool-tag-input', 'wizard-tool-tag-count', 'btn-wizard-add-tool-tag',
    'btn-wizard-add-sns-link',
    'wizard-complete-nickname', 'wizard-error', 'btn-wizard-back', 'btn-wizard-next'
  ].forEach(id => modal.append(create('div', id)));

  const termsAll = create('input', 'wizard-terms-all');
  termsAll.type = 'checkbox';
  const termsList = create('div', 'wizard-terms-document-list');
  const interestsBox = create('div', 'wizard-interest-chips-box');
  const snsContainer = create('div', 'wizard-sns-links-container');
  const toolTagsContainer = create('div', 'wizard-tool-tags-container');
  const toolTagSuggestions = create('div', 'wizard-tool-tag-suggestions');
  modal.append(toolTagsContainer, toolTagSuggestions);
  ['Cursor', 'Figma'].forEach(name => {
    const suggestion = create('button');
    suggestion.dataset.wizardToolSuggestion = name;
    toolTagSuggestions.append(suggestion);
  });

  const genderBox = create('div', 'wizard-gender-box');
  const ageRangeBox = create('div', 'wizard-age-range-box');
  const deviceBox = create('div', 'wizard-device-box');
  modal.append(
    termsAll, termsList, interestsBox, snsContainer,
    genderBox, ageRangeBox, deviceBox
  );

  interests.forEach(name => {
    const chip = create('button');
    chip.dataset.wizardInterest = name;
    chip.setAttribute('aria-pressed', 'false');
    interestsBox.append(chip);
  });

  const addChoices = (box, property, values, stateAttribute) => {
    values.forEach(value => {
      const choice = create('button');
      choice.dataset[property] = value;
      choice.setAttribute(stateAttribute, 'false');
      box.append(choice);
    });
  };
  addChoices(genderBox, 'wizardGender', ['male', 'female'], 'aria-checked');
  addChoices(
    ageRangeBox,
    'wizardAgeRange',
    ['10s', '20s', '30s', '40s', '50s', '60s_plus'],
    'aria-checked'
  );
  addChoices(deviceBox, 'wizardDevice', ['ios', 'android', 'mac', 'windows'], 'aria-pressed');

  for (let step = 1; step <= 5; step += 1) {
    const panel = create('section', `wizard-step-${step}`, step === 1 ? '' : 'hidden');
    panel.dataset.wizardStepPanel = String(step);
    modal.append(panel);

    const indicator = create('li');
    indicator.dataset.wizardStepIndicator = String(step);
    const badge = create('span');
    badge.dataset.wizardStepBadge = '';
    indicator.append(badge);
    if (step < 5) {
      const bar = create('span');
      bar.dataset.wizardStepBar = '';
      indicator.append(bar);
    }
    modal.append(indicator);
  }

  global.document = {
    getElementById: id => byId[id] || null,
    createElement: tagName => new StubElement(tagName),
    querySelectorAll: selector => root.querySelectorAll(selector),
    querySelector: selector => root.querySelector(selector),
    body: { classList: { add() {}, remove() {} } }
  };
  global.window = { setTimeout: fn => fn() };

  return { byId, root, el: id => byId[id] };
}

/**
 * 내 정보 수정 모달에서 온보딩 항목을 다루는 부분만 흉내 낸다.
 * 위저드와 id·data 속성이 다르므로 별도로 세운다.
 */
export function installProfileModalDom() {
  const byId = {};

  const create = (tagName, id = '') => {
    const node = new StubElement(tagName);
    if (id) {
      node.id = id;
      byId[id] = node;
    }
    return node;
  };

  const root = create('body');

  ['profile-job-group', 'profile-device-count', 'profile-tool-tag-input',
    'profile-tool-tag-count', 'btn-profile-add-tool-tag']
    .forEach(id => root.append(create('div', id)));

  const genderBox = create('div', 'profile-gender-box');
  const ageRangeBox = create('div', 'profile-age-range-box');
  const deviceBox = create('div', 'profile-device-box');
  const toolTagsContainer = create('div', 'profile-tool-tags-container');
  root.append(genderBox, ageRangeBox, deviceBox, toolTagsContainer);

  const addChoices = (box, property, values, stateAttribute) => {
    values.forEach(value => {
      const choice = create('button');
      choice.dataset[property] = value;
      choice.setAttribute(stateAttribute, 'false');
      box.append(choice);
    });
  };
  addChoices(genderBox, 'profileGender', ['male', 'female'], 'aria-checked');
  addChoices(
    ageRangeBox,
    'profileAgeRange',
    ['10s', '20s', '30s', '40s', '50s', '60s_plus'],
    'aria-checked'
  );
  addChoices(deviceBox, 'profileDevice', ['ios', 'android', 'mac', 'windows'], 'aria-pressed');

  global.document = {
    getElementById: id => byId[id] || null,
    createElement: tagName => new StubElement(tagName),
    querySelectorAll: selector => root.querySelectorAll(selector),
    querySelector: selector => root.querySelector(selector),
    body: { classList: { add() {}, remove() {} } }
  };
  global.window = { setTimeout: fn => fn() };

  return { byId, root, el: id => byId[id] };
}

export { StubElement };
