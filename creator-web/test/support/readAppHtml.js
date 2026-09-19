import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveHtmlIncludes } from '../../build/htmlIncludes.js';
import { assembleRuntime } from '../../build/classicRuntime.js';

// 기존 HTML 검사는 브라우저에 전달되는 조립 결과를 대상으로 유지한다.
export function readAppHtml() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  return resolveHtmlIncludes(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), root);
}

// 소스 구조 검사용: 외부 일반 스크립트까지 펼쳐 기존 검사 범위를 유지한다.
export function readAppSource() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  return readAppHtml().replace(/<script[^>]*data-app-runtime[^>]*><\/script>/,
    () => `<script>\n${assembleRuntime(root).code}</script>`);
}

export function readRuntimeFunction(name) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const pattern = new RegExp(`^    (?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?^    \\}`, 'm');
  const match = assembleRuntime(root).code.match(pattern);
  if (!match) throw new Error(`Runtime function not found: ${name}`);
  return match[0];
}
