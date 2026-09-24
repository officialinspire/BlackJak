/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/BlackJak/',
  build: {
    sourcemap: false,
  },
  test: {
    // Process CSS so tests can read stylesheets via `?raw` (Vitest blanks CSS by default).
    css: true,
  },
});
