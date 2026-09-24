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
  "media-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/**
 * URL-safe asset names: the source MP3s have spaces and an apostrophe in their
 * names, which would otherwise ship as `Jak Gold's Table-<hash>.mp3` and need
 * percent-encoding everywhere (HTML, service-worker cache keys, CDN logs).
 */
export function safeAssetName(name: string): string {
  const stem = name.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
}

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
    rollupOptions: {
      output: {
        assetFileNames: (asset) => `assets/${safeAssetName(asset.names[0] ?? 'asset')}-[hash][extname]`,
      },
    },
  },
  test: {
    // Process CSS so tests can read stylesheets via `?raw` (Vitest blanks CSS by default).
    css: true,
  },
});
