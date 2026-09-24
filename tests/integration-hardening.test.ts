import { describe, expect, it } from 'vitest';
import buildSw from '../scripts/build-sw.mjs?raw';
import verifyDist from '../scripts/verify-dist.mjs?raw';
import workflow from '../.github/workflows/pages.yml?raw';
import gameplayQa from '../scripts/qa/gameplay-pwa-qa.cjs?raw';
import refreshQa from '../scripts/qa/refresh-qa.cjs?raw';

describe('Prompt 6 integration hardening', () => {
  it('keeps large media out of the core precache and routes it through a versioned runtime cache', () => {
    expect(buildSw).toContain("MEDIA_CACHE_PREFIX = 'blackjak-media-'");
    expect(buildSw).toContain("MEDIA_EXTENSIONS = new Set(['.mp3', '.mp4'");
    expect(buildSw).toContain('const precacheFiles = relativeFiles.filter');
    expect(buildSw).toContain('runtimeMedia(request)');
    expect(buildSw).toContain('rangeResponse(request, cached)');
    expect(buildSw).toContain("status: 206");
  });

  it('production verification requires all media and rejects media in the app precache', () => {
    expect(verifyDist).toContain("Jak Gold's Table");
    expect(verifyDist).toContain('Minimal Gameplay Background');
    expect(verifyDist).toContain('inspiresoftwareintro');
    expect(verifyDist).toContain('large media should be runtime-cached, not precached');
    expect(verifyDist).toContain('service worker is missing the runtime media cache');
  });

  it('runs pinned Chromium browser integration QA in GitHub Actions', () => {
    expect(workflow).toContain('playwright@1.55.0');
    expect(workflow).toContain('playwright install --with-deps chromium');
    expect(workflow).toContain('node scripts/qa/browser-qa.cjs');
    expect(workflow).toContain('node scripts/qa/gameplay-pwa-qa.cjs');
    expect(workflow).toContain('node scripts/qa/refresh-qa.cjs');
    expect(workflow).toContain('timeout-minutes: 15');
  });

  it('all deep QA scripts cross the startup gate before clicking game controls', () => {
    expect(gameplayQa).toContain('async function enterGame');
    expect(gameplayQa).toContain('await enterGame(p)');
    expect(gameplayQa).toContain('await enterGame(daily)');
    expect(gameplayQa).toContain('await enterGame(page)');
    expect(refreshQa).toContain('async function enterGame');
    expect(refreshQa).toContain('await enterGame(p)');
  });

  it('PWA update QA targets the current generated app-cache constant', () => {
    expect(gameplayQa).toContain('const APP_CACHE_NAME = "blackjak-app-');
    expect(gameplayQa).not.toContain('const CACHE_NAME = "blackjak-app-');
    expect(gameplayQa).toContain('writeFileSync(swPath, originalServiceWorker)');
  });
});
