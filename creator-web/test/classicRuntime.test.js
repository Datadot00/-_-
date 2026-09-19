import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SourceMap } from 'node:module';
import { runInNewContext } from 'node:vm';
import { once } from 'node:events';
import { build, createServer } from 'vite';
import { assembleRuntime, classicRuntime } from '../build/classicRuntime.js';

test('외부 일반 스크립트는 개발·빌드에서 동일하게 실행되고 원본 파일 디버깅을 지원한다', { timeout: 20000 }, async t => {
  const prefix = join(tmpdir(), 'dondwae-runtime-');
  const root = mkdtempSync(prefix);
  t.after(() => {
    if (!resolve(root).startsWith(prefix)) throw new Error('Unexpected fixture path');
    rmSync(root, { recursive: true, force: true });
  });
  mkdirSync(join(root, 'src'));
  const files = ['src/state.js', 'src/actions.js'];
  writeFileSync(join(root, files[0]), 'let count = 0;\n');
  writeFileSync(join(root, files[1]), 'function increment() { return ++count; }\n');
  writeFileSync(join(root, 'index.html'), '<!doctype html><html><head></head><body><div id="before"></div><script src="/app.js" data-app-runtime vite-ignore></script><div id="after"></div></body></html>');
  const runtime = assembleRuntime(root, files);
  const debugEntry = new SourceMap(runtime.map).findEntry(1, 0);
  assert.equal(debugEntry.originalSource, '/src/actions.js');
  assert.equal(debugEntry.originalLine, 0);
  const execute = code => {
    const scope = {};
    runInNewContext(code, scope);
    return [scope.increment(), scope.increment()];
  };
  let ready;
  const watched = new Promise(resolveReady => { ready = resolveReady; });
  const config = { root, configFile: false, logLevel: 'silent', plugins: [classicRuntime(files)] };
  const server = await createServer({
    ...config,
    plugins: [...config.plugins, { name: 'fixture-watch', configureServer(s) { s.watcher.once('ready', ready); } }],
    server: { host: '127.0.0.1', port: 0, watch: { usePolling: true, interval: 50 } }
  });
  let socket;
  try {
    await server.listen();
    await watched;
    const address = server.resolvedUrls.local[0];
    const html = await (await fetch(address)).text();
    const tag = html.match(/<script[^>]*data-app-runtime[^>]*><\/script>/)?.[0];
    assert.ok(tag);
    assert.doesNotMatch(tag, /type=|\basync\b|\bdefer\b/);
    assert.ok(html.indexOf('id="before"') < html.indexOf(tag));
    assert.ok(html.indexOf(tag) < html.indexOf('id="after"'));
    const response = await fetch(new URL('app.js', address));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.deepEqual(execute(await response.text()), [1, 2]);
    const map = await (await fetch(new URL('app.js.map', address))).json();
    assert.deepEqual(map.sources, ['/src/state.js', '/src/actions.js']);
    socket = new WebSocket(address.replace('http:', 'ws:') + `?token=${server.config.webSocketToken}`, 'vite-hmr');
    await once(socket, 'open');
    const refreshed = new Promise((resolveRefresh, reject) => {
      const timer = setTimeout(() => reject(new Error('No runtime reload')), 5000);
      socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.type === 'full-reload') { clearTimeout(timer); resolveRefresh(message); }
      });
    });
    writeFileSync(join(root, files[0]), 'let count = 10;\n');
    assert.equal((await refreshed).path, '*');
    assert.deepEqual(execute(await (await fetch(new URL('app.js', address))).text()), [11, 12]);
  } finally {
    socket?.close();
    await server.close();
  }
  await build(config);
  const built = readFileSync(join(root, 'dist/index.html'), 'utf8');
  const path = built.match(/src="(\/assets\/app-[a-f0-9]+\.js)"/)?.[1];
  assert.ok(path);
  assert.deepEqual(execute(readFileSync(join(root, 'dist', path.slice(1)), 'utf8')), [11, 12]);
  assert.notEqual(assembleRuntime(root, files).hash, runtime.hash);
  const builtMap = JSON.parse(readFileSync(join(root, 'dist', path.slice(1) + '.map'), 'utf8'));
  assert.deepEqual(builtMap.sources, ['/src/state.js', '/src/actions.js']);
});
