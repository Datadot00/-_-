import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { installProfileModalDom } from './support/stubDom.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../supabase/migrations/20260915200000_edit_new_profile_fields.sql', import.meta.url),
  'utf8'
);
const dataService = readFileSync(new URL('../src/dataService.js', import.meta.url), 'utf8');

async function importProfileFields() {
  // 모듈이 바인딩 여부를 기억하므로 테스트마다 새 인스턴스를 받는다.
  return import(`../src/profileFieldsUi.js?t=${Math.random()}`);
}

// ── 마크업·계약 ────────────────────────────────────────────────────────────
test('내 정보 수정 모달에서 온보딩 항목을 모두 고칠 수 있다', () => {
  ['profile-job-group', 'profile-gender-box', 'profile-age-range-box',
    'profile-device-box', 'profile-tool-tag-input', 'profile-tool-tags-container']
    .forEach(elementId => {
      assert.match(html, new RegExp(`id="${elementId}"`), `${elementId} 누락`);
    });

  // 위저드와 같은 값으로 저장해야 두 화면이 같은 데이터를 가리킨다.
  ['male', 'female'].forEach(value => {
    assert.match(html, new RegExp(`data-profile-gender="${value}"`));
  });
  ['10s', '20s', '30s', '40s', '50s', '60s_plus'].forEach(value => {
    assert.match(html, new RegExp(`data-profile-age-range="${value}"`));
  });
  ['ios', 'android', 'mac', 'windows'].forEach(value => {
    assert.match(html, new RegExp(`data-profile-device="${value}"`));
  });
});

test('프로필 조회·수정 RPC 가 새 항목을 함께 다룬다', () => {
  for (const sql of [migration, schema]) {
    // RETURNS TABLE 컬럼이 늘어나 CREATE OR REPLACE 로는 못 바꾼다.
    assert.match(sql, /DROP FUNCTION IF EXISTS public\.get_my_private_profile\(\)/i);
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.update_my_private_profile\(TEXT, TEXT, TEXT\[\], JSONB\)/i
    );
    ['job_group', 'gender', 'age_range', 'devices', 'tool_tags'].forEach(column => {
      assert.match(sql, new RegExp(`profile\\.${column}`), `${column} 반환 누락`);
    });
    assert.match(sql, /p_job_group TEXT DEFAULT ''/);
    assert.match(sql, /p_tool_tags TEXT\[\] DEFAULT '\{\}'::TEXT\[\]/);
  }

  assert.match(dataService, /p_gender: typeof gender === 'string'/);
  assert.match(dataService, /p_tool_tags: Array\.isArray\(toolTags\)/);
});

// ── 화면 동작 ──────────────────────────────────────────────────────────────
test('저장된 값이 수정 모달에 그대로 채워진다', async () => {
  const dom = installProfileModalDom();
  const { renderProfileExtraFields, collectProfileExtraFields } = await importProfileFields();

  renderProfileExtraFields({
    job_group: '개발자',
    gender: 'female',
    age_range: '30s',
    devices: ['ios', 'windows'],
    tool_tags: ['Cursor', 'Figma']
  });

  assert.equal(dom.el('profile-job-group').value, '개발자');
  assert.deepEqual(collectProfileExtraFields(), {
    jobGroup: '개발자',
    gender: 'female',
    ageRange: '30s',
    devices: ['ios', 'windows'],
    toolTags: ['Cursor', 'Figma']
  });
  assert.equal(dom.el('profile-device-count').textContent, '2개 선택');
  assert.equal(dom.el('profile-tool-tag-count').textContent, '2/10개');
});

test('온보딩 전에 가입한 계정은 값이 비어 있어도 저장할 수 있다', async () => {
  installProfileModalDom();
  const { renderProfileExtraFields, collectProfileExtraFields } = await importProfileFields();

  // 새 컬럼이 없던 시절 계정은 전부 NULL 로 돌아온다.
  renderProfileExtraFields({ job_group: null, gender: null, age_range: null, devices: null, tool_tags: null });

  assert.deepEqual(collectProfileExtraFields(), {
    jobGroup: '',
    gender: '',
    ageRange: '',
    devices: [],
    toolTags: []
  });
});

test('아직 값이 없으면 성별·연령대를 한 번 고를 수 있다', async () => {
  const dom = installProfileModalDom();
  const {
    bindProfileExtraFields, renderProfileExtraFields, collectProfileExtraFields
  } = await importProfileFields();
  bindProfileExtraFields();
  renderProfileExtraFields({ gender: null, age_range: null });

  const genderBox = dom.el('profile-gender-box');
  const [male, female] = genderBox.querySelectorAll('[data-profile-gender]');

  genderBox.dispatch('click', { target: male });
  assert.equal(collectProfileExtraFields().gender, 'male');

  genderBox.dispatch('click', { target: female });
  assert.equal(male.getAttribute('aria-checked'), 'false');
  assert.equal(collectProfileExtraFields().gender, 'female');

  // 저장 전에는 다시 눌러 비울 수 있다. 잘못 고른 값을 되돌릴 수 있어야 한다.
  genderBox.dispatch('click', { target: female });
  assert.equal(collectProfileExtraFields().gender, '');
});

test('이미 저장된 성별·연령대는 화면에서 바꿀 수 없다', async () => {
  const dom = installProfileModalDom();
  const {
    bindProfileExtraFields, renderProfileExtraFields, collectProfileExtraFields
  } = await importProfileFields();
  bindProfileExtraFields();
  renderProfileExtraFields({ gender: 'female', age_range: '30s' });

  const genderBox = dom.el('profile-gender-box');
  const [male, female] = genderBox.querySelectorAll('[data-profile-gender]');
  assert.equal(male.disabled, true);
  assert.equal(female.disabled, true);
  assert.match(dom.el('profile-gender-hint').textContent, /변경할 수 없습니다/);

  // 눌러도 값이 바뀌지 않는다.
  genderBox.dispatch('click', { target: male });
  assert.equal(collectProfileExtraFields().gender, 'female');
  // 선택된 값을 다시 눌러도 해제되지 않는다.
  genderBox.dispatch('click', { target: female });
  assert.equal(collectProfileExtraFields().gender, 'female');

  const ageBox = dom.el('profile-age-range-box');
  ageBox.dispatch('click', {
    target: ageBox.querySelectorAll('[data-profile-age-range]')[0]
  });
  assert.equal(collectProfileExtraFields().ageRange, '30s');
});

test('성별만 저장된 계정은 연령대를 아직 고를 수 있다', async () => {
  const dom = installProfileModalDom();
  const {
    bindProfileExtraFields, renderProfileExtraFields, collectProfileExtraFields
  } = await importProfileFields();
  bindProfileExtraFields();
  renderProfileExtraFields({ gender: 'male', age_range: null });

  // 항목마다 따로 잠긴다. 하나가 잠겼다고 나머지까지 막으면 안 된다.
  const ageBox = dom.el('profile-age-range-box');
  ageBox.dispatch('click', {
    target: ageBox.querySelectorAll('[data-profile-age-range]')[1]
  });
  assert.equal(collectProfileExtraFields().ageRange, '20s');
  assert.equal(collectProfileExtraFields().gender, 'male');
});

test('성별·연령대는 서버에서도 덮어쓸 수 없게 막는다', () => {
  const lock = readFileSync(
    new URL('../supabase/migrations/20260915220000_lock_gender_and_age_range.sql', import.meta.url),
    'utf8'
  );
  for (const sql of [lock, schema]) {
    // 화면에서만 잠그면 RPC 를 직접 부르는 경로가 남는다.
    assert.match(sql, /v_existing_gender IS NOT NULL THEN\s*\n\s*v_gender := v_existing_gender;/i);
    assert.match(sql, /v_existing_age_range IS NOT NULL THEN\s*\n\s*v_age_range := v_existing_age_range;/i);
  }
  // 직업군·기기·툴 태그는 계속 고칠 수 있어야 한다.
  assert.match(schema, /job_group = v_job_group/);
  assert.match(schema, /devices = v_devices/);
  assert.match(schema, /tool_tags = v_tool_tags/);
});

test('툴 태그는 위저드와 같은 규칙으로 다듬어 저장된다', async () => {
  const dom = installProfileModalDom();
  const { bindProfileExtraFields, collectProfileExtraFields } = await importProfileFields();
  bindProfileExtraFields();

  dom.el('profile-tool-tag-input').value = '#Cursor, Next.js, cursor';
  dom.el('btn-profile-add-tool-tag').click();

  // '#' 은 떼고, 대소문자만 다른 중복은 버린다.
  assert.deepEqual(collectProfileExtraFields().toolTags, ['Cursor', 'Next.js']);
  assert.equal(dom.el('profile-tool-tag-input').value, '');

  const container = dom.el('profile-tool-tags-container');
  container.dispatch('click', {
    target: container.querySelectorAll('[data-profile-tool-tag-remove]')[0]
  });
  assert.deepEqual(collectProfileExtraFields().toolTags, ['Next.js']);
});

test('기기는 여러 개 고르고 다시 눌러 해제할 수 있다', async () => {
  const dom = installProfileModalDom();
  const { bindProfileExtraFields, collectProfileExtraFields } = await importProfileFields();
  bindProfileExtraFields();

  const deviceBox = dom.el('profile-device-box');
  const devices = deviceBox.querySelectorAll('[data-profile-device]');
  deviceBox.dispatch('click', { target: devices[0] });
  deviceBox.dispatch('click', { target: devices[1] });
  assert.deepEqual(collectProfileExtraFields().devices, ['ios', 'android']);

  deviceBox.dispatch('click', { target: devices[0] });
  assert.deepEqual(collectProfileExtraFields().devices, ['android']);
  assert.equal(dom.el('profile-device-count').textContent, '1개 선택');
});
