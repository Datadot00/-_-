import { defineConfig } from 'vite';
import { htmlIncludes } from './build/htmlIncludes.js';
import { classicRuntime } from './build/classicRuntime.js';

export default defineConfig({
  plugins: [htmlIncludes(), classicRuntime()]
});
