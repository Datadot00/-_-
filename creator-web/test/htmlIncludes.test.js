import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { build, createServer } from 'vite';
import { htmlIncludes, resolveHtmlIncludes } from '../build/htmlIncludes.js';
import { readAppHtml } from './support/readAppHtml.js';

function fixture(t) {
  const prefix = join(tmpdir(), 'dondwae-includes-');
  const root = mkdtempSync(prefix);
  mkdirSync(join(root, 'src'));
  t.after(() => {
    if (!resolve(root).startsWith(prefix)) throw new Error('Unexpected fixture path');
    rmSync(root, { recursive: true, force: true });
  });
  return { root, write: (path, text) => writeFileSync(join(root, path), text) };
}

test('HTML 조립은 공백·문구·인라인 이벤트와 중첩 파일 순서를 보존한다', t => {
  const { root, write } = fixture(t);
  const button = '  <button onclick="openModal()">열기 &amp; 닫기</button>\r\n';
  write('src/button.html', button);
  write('src/view.html', '<main>\r\n  <!-- @include src/button.html -->\r\n</main>\r\n');
  assert.equal(
    resolveHtmlIncludes('before\n<!-- @include src/view.html -->\nafter', root),
    `before\n<main>\r\n${button}</main>\r\nafter`
  );
});

test('누락·순환·src 밖 경로는 조용히 빈 화면을 만들지 않고 실패한다', t => {
  const { root, write } = fixture(t);
  assert.throws(() => resolveHtmlIncludes('<!-- @include src/missing.html -->', root), /Cannot read/);
  write('src/loop.html', '<!-- @include src/loop.html -->');
  assert.throws(() => resolveHtmlIncludes('<!-- @include src/loop.html -->', root), /Circular/);
  assert.throws(() => resolveHtmlIncludes('<!-- @include ../outside.html -->', root), /inside src/);
});

test('실제 앱의 11개 라우팅 화면과 모달·스크립트 배치가 유지된다', () => {
  const html = readAppHtml();
  const expected = ['landing', 'login', 'explore', 'create', 'post', 'vote-progress', 'feedback', 'market', 'mypage', 'notifications', 'notification-settings'];
  for (const name of expected) {
    assert.equal(html.split(`id="view-${name}"`).length - 1, 1, name);
  }
  assert.doesNotMatch(html, /<!--\s*@include/);
  assert.ok(html.indexOf('id="view-notification-settings"') < html.indexOf('data-app-runtime'));
  assert.ok(html.indexOf('data-app-runtime') < html.indexOf('id="onboarding-wizard-modal"'));
  assert.ok(html.indexOf('id="terms-consent-modal"') < html.indexOf('src="/src/features/auth/auth.js"'));
});

test('라우팅 화면과 인증 모달은 다른 화면의 숨김 영역 안에 중첩되지 않는다', () => {
  // 조립 후의 div/main 경계를 검사한다. 스크립트·주석·속성 안의 HTML 문자열은 제외한다.
  const html = readAppHtml()
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const stack = [];
  let checked = 0;
  for (const [tag] of html.matchAll(/<\/?(?:div|main)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)) {
    if (tag.startsWith('</')) {
      stack.pop();
      continue;
    }
    const id = /\bid="([^"]+)"/.exec(tag)?.[1] || '';
    const classes = /\bclass="([^"]*)"/.exec(tag)?.[1].split(/\s+/) || [];
    const isView = classes.includes('view-container');
    if (isView || ['onboarding-wizard-modal', 'terms-consent-modal'].includes(id)) {
      assert.equal(stack.some(parent => parent.isView), false, `${id}가 다른 라우팅 화면에 갇힘`);
      checked += 1;
    }
    stack.push({ id, isView });
  }
  assert.equal(checked, 13, '라우팅 화면 11개와 인증 모달 2개를 확인해야 한다');
});

test('Vite 개발·빌드 모두 조립하며 partial 수정은 열린 페이지를 새로고침한다', { timeout: 20000 }, async t => {
  const { root, write } = fixture(t);
  write('index.html', '<!doctype html><html><head></head><body>\n<!-- @include src/view.html -->\n</body></html>');
  write('src/view.html', '<main id="screen">before</main>\n<script type="module" src="/src/module.js"></script>\n');
  write('src/module.js', 'document.body.dataset.fixtureLoaded = "yes";');
  const config = { root, configFile: false, plugins: [htmlIncludes()], logLevel: 'silent' };
  let watcherReady;
  const ready = new Promise(resolveReady => { watcherReady = resolveReady; });
  const server = await createServer({
    ...config,
    plugins: [...config.plugins, {
      name: 'wait-for-fixture-watch',
      configureServer(server) { server.watcher.once('ready', watcherReady); }
    }],
    // 임시 폴더의 OS 파일 이벤트 병합에 영향을 받지 않도록 테스트에서만 polling을 쓴다.
    server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } }
  });
  let socket;
  try {
    await server.listen();
    await ready;
    const address = server.resolvedUrls.local[0];
    const html = await (await fetch(address)).text();
    assert.match(html, /<main id="screen">before<\/main>/);
    assert.doesNotMatch(html, /@include/);
    await fetch(new URL('src/view.html', address));
    socket = new WebSocket(address.replace('http:', 'ws:') + `?token=${server.config.webSocketToken}`, 'vite-hmr');
    await once(socket, 'open');
    const reloaded = new Promise((resolveReload, reject) => {
      const timer = setTimeout(() => reject(new Error('No full reload after partial edit')), 5000);
      socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.type === 'full-reload') {
          clearTimeout(timer);
          resolveReload(message);
        }
      });
    });
    write('src/view.html', '<main id="screen">after</main>\n<script type="module" src="/src/module.js"></script>\n');
    assert.equal((await reloaded).path, '*');
    assert.match(await (await fetch(address)).text(), /<main id="screen">after<\/main>/);
  } finally {
    socket?.close();
    await server.close();
  }
  await build({ ...config, build: { minify: false } });
  const built = readFileSync(join(root, 'dist/index.html'), 'utf8');
  assert.match(built, /<main id="screen">after<\/main>/);
  assert.match(built, /src="\/assets\/[^"\s]+\.js"/);
  assert.doesNotMatch(built, /@include|src="\/src\/module\.js"/);
});
