import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { assembleRuntime } from '../../build/classicRuntime.js';

export function createRuntimeHarness({ code, stored = {} } = {}) {
  const trace = [];
  const events = new Map();
  const elements = new Map();
  const storage = name => ({
    getItem(key) { trace.push([name, 'get', key]); return stored[key] ?? null; },
    setItem(key, value) { trace.push([name, 'set', key, String(value)]); stored[key] = String(value); },
    removeItem(key) { trace.push([name, 'remove', key]); delete stored[key]; }
  });
  const addElement = (id, props = {}) => {
    const classes = new Set(['hidden']);
    const element = {
      id, dataset: {}, style: {}, value: '', textContent: '', innerHTML: '',
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, force) { const add = force ?? !classes.has(name); if (add) classes.add(name); else classes.delete(name); return add; }
      },
      querySelector: () => null, querySelectorAll: () => [],
      setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
      ...props
    };
    elements.set(id, element);
    return element;
  };
  const on = (target, name, callback) => {
    trace.push([target, 'listen', name]);
    const key = `${target}:${name}`;
    if (!events.has(key)) events.set(key, []);
    events.get(key).push(callback);
  };
  const context = createContext({
    document: {
      getElementById: id => elements.get(id) || null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener: (name, callback) => on('document', name, callback),
      activeElement: { tagName: 'BODY' }
    },
    localStorage: storage('local'), sessionStorage: storage('session'),
    location: { hostname: 'localhost', href: 'http://localhost/' },
    addEventListener: (name, callback) => on('window', name, callback),
    scrollTo: () => {}, requestAnimationFrame: callback => callback(),
    setTimeout: () => 1, clearTimeout: () => {},
    alert: message => trace.push(['alert', message]), confirm: () => true,
    URL, console, navigator: {},
  });
  context.window = context;
  const root = fileURLToPath(new URL('../../', import.meta.url));
  runInContext(code ?? assembleRuntime(root).code, context, { timeout: 2000 });
  const evaluate = source => runInContext(source, context, { timeout: 2000 });
  const ready = () => { for (const callback of events.get('document:DOMContentLoaded') || []) callback(); };
  return { context, events, elements, addElement, trace, ready, evaluate, stored };
}
