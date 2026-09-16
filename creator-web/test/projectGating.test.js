import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('등록 화면 진입은 navigateTo 한 곳에서 게이팅을 검사한다', () => {
  // 관문이 navigateTo 안에 있어야 새 진입점이 생겨도 자동으로 막힌다.
  assert.match(
    html,
    /if \(viewKey === 'create' && !preserveProjectEdit && !isProjectEditMode\s*\n\s*&& !window\.userHasPassedGating\) \{/
  );
  assert.match(html, /ensureProjectGatingPassed\(\)\.then\(passed => \{/);
  assert.match(html, /async function ensureProjectGatingPassed\(\)/);
});

test('게이팅 검사는 캐시된 값이 아니라 서버 프로필로 확인한다', () => {
  const fn = html.slice(
    html.indexOf('async function ensureProjectGatingPassed()'),
    html.indexOf('function navigateTo(viewKey')
  );
  assert.match(fn, /ds\.fetchUserProfile\(session\.user\.id\)/);
  assert.match(fn, /window\.userHasPassedGating = !!profile\?\.has_passed_gating/);
});

test('자격 미달이면 폼을 초기화하지 않고 서약 모달로 되돌린다', () => {
  const gate = html.slice(
    html.indexOf("if (viewKey === 'create' && !preserveProjectEdit"),
    html.indexOf("      if (viewKey === 'create') {\n        if (!preserveProjectEdit)")
  );
  // resetCreateProjectForm 은 관문을 통과한 뒤에만 실행돼야 한다.
  assert.doesNotMatch(gate, /resetCreateProjectForm\(\)/);
  assert.match(gate, /openPledgeModal\(\)/);
});

test('등록 화면으로 가는 버튼이 navigateTo를 우회하지 않는다', () => {
  // 사이드바·내 프로젝트·배너 버튼은 모두 navigateTo를 거친다.
  // 직접 goToStep/뷰 토글로 create 화면을 여는 코드가 생기면 실패한다.
  assert.doesNotMatch(html, /onclick="[^"]*getElementById\('view-create'\)[^"]*classList\.remove\('hidden'\)/);
});

test('편집 복원에 실패하면 편집 맥락을 지우고 게이팅을 다시 태운다', () => {
  assert.match(
    html,
    /if \(!restored\) \{[\s\S]{0,220}?clearProjectEditContext\(\);\s*\n\s*navigateTo\('create'\);\s*\n\s*\}/
  );
});

test('화면 점프 단축키도 navigateTo를 통해 이동한다', () => {
  const keymap = html.slice(html.indexOf('const keyMap = {'), html.indexOf("toggleSwitcherPanel();"));
  assert.match(keymap, /'3': 'create'/);
  assert.match(keymap, /navigateTo\(keyMap\[e\.key\]\)/);
});
