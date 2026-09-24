import { describe, expect, it } from 'vitest';
import buildSw from '../scripts/build-sw.mjs?raw';
import verifyDist from '../scripts/verify-dist.mjs?raw';
import workflow from '../.github/workflows/pages.yml?raw';
import browserQa from '../scripts/qa/browser-qa.cjs?raw';
import gameplayQa from '../scripts/qa/gameplay-pwa-qa.cjs?raw';
import refreshQa from '../scripts/qa/refresh-qa.cjs?raw';
import startupSource from '../src/startup/startup.ts?raw';
import { CONTENT_SECURITY_POLICY, safeAssetName } from '../vite.config';
import { INTRO_STALL_TIMEOUT_MS } from '../src/startup/startup';

describe('integration hardening', () => {
  it('emits URL-safe names for media with spaces and apostrophes', () => {
    expect(safeAssetName("Jak Gold's Table.mp3")).toBe('jak-gold-s-table');
    expect(safeAssetName('Minimal Gameplay Background.mp3')).toBe('minimal-gameplay-background');
    expect(safeAssetName('/abs/path/inspiresoftwareintro.mp4')).toBe('inspiresoftwareintro');
    expect(safeAssetName('blackjak-cards-jak-theme.webp')).toBe('blackjak-cards-jak-theme');
    expect(safeAssetName('???.png')).toBe('asset');
  });

  it('allows same-origin media under the production CSP', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("media-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
  });

  it('keeps large media out of the install precache and in a stable runtime cache', () => {
    expect(buildSw).toContain('const MEDIA_CACHE_NAME = `${MEDIA_CACHE_PREFIX}v1`');
    expect(buildSw).toContain("MEDIA_EXTENSIONS = new Set(['.mp3', '.mp4'");
    expect(buildSw).toContain('relativeFiles.filter((file) => !isMedia(file))');
    // Range support (Safari needs 206), deduped downloads, and pruning of stale files.
    expect(buildSw).toContain('status: 206');
    expect(buildSw).toContain('blob.slice(start, end + 1)');
    expect(buildSw).toContain('const mediaDownloads = new Map()');
    expect(buildSw).toContain('pruneMediaCache()');
  });

  it('production verification requires every startup/music asset', () => {
    for (const stem of ['jak-gold-s-table', 'minimal-gameplay-background', 'inspiresoftwareintro', "stem: 'logo'"]) {
      expect(verifyDist).toContain(stem);
    }
    expect(verifyDist).toContain('large media should be runtime-cached, not precached');
    expect(verifyDist).toContain('required media not routed through the runtime media cache');
    expect(verifyDist).toContain('dist file name is not URL-safe');
    expect(verifyDist).toContain("media-src 'self'");
  });

  it('skips an intro that stalls instead of holding a black screen', () => {
    expect(INTRO_STALL_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
    expect(INTRO_STALL_TIMEOUT_MS).toBeLessThanOrEqual(12000);
    expect(startupSource).toContain("video.addEventListener('playing', () => this.clearStallTimer())");
    expect(startupSource).toContain('this.introVideo?.pause()');
  });

  it('runs Chromium browser QA in CI with a step timeout so a hang fails instead of cancelling', () => {
    expect(workflow).toContain('playwright install --with-deps chromium');
    for (const script of ['browser-qa.cjs', 'gameplay-pwa-qa.cjs', 'refresh-qa.cjs']) {
      expect(workflow).toContain(`node scripts/qa/${script}`);
    }
    expect(workflow).toMatch(/name: Browser integration QA\n\s+timeout-minutes: \d+/);
  });

  it('QA scripts cross the startup gate and always release the browser', () => {
    for (const qa of [browserQa, gameplayQa, refreshQa]) {
      expect(qa).toContain('async function enterGame');
      expect(qa).toContain('} finally {');
      expect(qa).toContain('process.exit(1)');
    }
    expect(gameplayQa).toContain('writeFileSync(swPath, originalServiceWorker)');
    expect(gameplayQa).toContain("page.$$eval('.player-hands [data-visual-id]'");
  });
});
