import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

// HTML은 그대로 삽입한다. 템플릿 표현식·들여쓰기·스크립트 순서를 바꾸지 않는다.
export function resolveHtmlIncludes(html, root, onInclude = () => {}, ancestors = []) {
  return html.replace(/^[\t ]*<!--\s*@include\s+(\S+)\s*-->[\t ]*(?:\r?\n|$)/gm, (_, path) => {
    const file = resolve(root, path);
    const fromSource = relative(resolve(root, 'src'), file);
    if (isAbsolute(path) || fromSource.startsWith('..') || isAbsolute(fromSource) || !file.endsWith('.html')) {
      throw new Error(`HTML include must reference an .html file inside src/: ${path}`);
    }
    if (ancestors.includes(file)) {
      throw new Error(`Circular HTML include: ${[...ancestors, file].join(' -> ')}`);
    }
    onInclude(file);
    let partial;
    try {
      partial = readFileSync(file, 'utf8');
    } catch (cause) {
      throw new Error(`Cannot read HTML include: ${path}`, { cause });
    }
    return resolveHtmlIncludes(partial, root, onInclude, [...ancestors, file]);
  });
}

export function htmlIncludes() {
  let root;
  const dependencies = new Set();
  return {
    name: 'screen-html-includes',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // 개별 HTML 미리보기 요청이 와도 기존 index의 감시 목록을 유지한다.
        return resolveHtmlIncludes(html, root, file => dependencies.add(file));
      }
    },
    handleHotUpdate({ file, server }) {
      if (dependencies.has(resolve(file))) {
        server.ws.send({ type: 'full-reload', path: '*' });
        return [];
      }
    }
  };
}
