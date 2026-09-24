/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';

/**
 * Content-Security-Policy for the production build. GitHub Pages cannot send
 * headers, so it ships as a <meta> tag. Build-only: the dev server needs an
 * HMR websocket and inline client scripts that this policy would block.
 * 'unsafe-inline' styles are required for the layout custom properties set
 * through style attributes; scripts stay same-origin only.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'blackjak-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' }],
  },
});

export default defineConfig({
  base: '/BlackJak/',
  plugins: [contentSecurityPolicy()],
  build: {
    sourcemap: false,
  },
  test: {
    // Process CSS so tests can read stylesheets via `?raw` (Vitest blanks CSS by default).
    css: true,
  },
});
