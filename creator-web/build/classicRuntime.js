import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { runtimeFiles } from '../src/app/runtime-manifest.js';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlq(value) {
  let number = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let result = '';
  do {
    let digit = number & 31;
    number >>>= 5;
    if (number) digit |= 32;
    result += alphabet[digit];
  } while (number);
  return result;
}

export function assembleRuntime(root, entries = runtimeFiles) {
  const sourcesContent = entries.map(file => readFileSync(resolve(root, file), 'utf8'));
  const parts = sourcesContent.map(source => source.endsWith('\n') ? source : source + '\n');
  const code = parts.join('');
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 12);
  let lastSource = 0;
  let lastLine = 0;
  const mappings = [];
  parts.forEach((part, sourceIndex) => {
    part.split('\n').slice(0, -1).forEach((_, lineIndex) => {
      mappings.push('A' + vlq(sourceIndex - lastSource) + vlq(lineIndex - lastLine) + 'A');
      lastSource = sourceIndex;
      lastLine = lineIndex;
    });
  });
  const map = { version: 3, sources: entries.map(file => '/' + file), sourcesContent, names: [], mappings: mappings.join(';') };
  return { code, hash, map };
}

export function classicRuntime(entries = runtimeFiles) {
  let config;
  let files;
  return {
    name: 'classic-feature-runtime',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
      files = new Set(entries.map(file => resolve(config.root, file)));
    },
    buildStart() {
      for (const file of files) this.addWatchFile(file);
    },
    configureServer(server) {
      server.watcher.add([...files]);
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/app.js' && path !== '/app.js.map') return next();
        try {
          const runtime = assembleRuntime(config.root, entries);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Content-Type', path.endsWith('.map') ? 'application/json' : 'application/javascript; charset=utf-8');
          res.end(path.endsWith('.map') ? JSON.stringify(runtime.map) : runtime.code + '\n//# sourceMappingURL=app.js.map\n');
        } catch (error) {
          next(error);
        }
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (config.command !== 'build' || !html.includes('data-app-runtime')) return html;
        const { hash } = assembleRuntime(config.root, entries);
        return html.replace('src="/app.js"', `src="${config.base}assets/app-${hash}.js"`);
      }
    },
    generateBundle() {
      const { code, hash, map } = assembleRuntime(config.root, entries);
      this.emitFile({ type: 'asset', fileName: `assets/app-${hash}.js`, source: code + `\n//# sourceMappingURL=app-${hash}.js.map\n` });
      this.emitFile({ type: 'asset', fileName: `assets/app-${hash}.js.map`, source: JSON.stringify(map) });
    },
    handleHotUpdate({ file, server }) {
      if (files.has(resolve(file))) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
    }
  };
}
