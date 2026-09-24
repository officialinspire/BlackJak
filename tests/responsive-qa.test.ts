import { describe, expect, it } from 'vitest';
import qaCss from '../src/styles/qa.css?raw';
import startupCss from '../src/styles/startup.css?raw';
import dockCss from '../src/styles/dock.css?raw';
import browserQa from '../scripts/qa/browser-qa.cjs?raw';

describe('Prompt 5 responsive contracts', () => {
  it('keeps the startup/intro surfaces viewport-bound and media contained', () => {
    expect(startupCss).toContain('position: fixed');
    expect(startupCss).toContain('min-height: 100dvh');
    expect(startupCss).toContain('object-fit: contain');
    expect(startupCss).toContain('.startup-action');
    expect(startupCss).toContain('min-height: 44px');
  });

  it('hardens phone, tablet, desktop, and short-landscape layouts', () => {
    expect(qaCss).toContain('@media (max-width: 520px)');
    expect(qaCss).toContain('@media (min-width: 700px) and (max-width: 1100px)');
    expect(qaCss).toContain('@media (min-width: 1200px)');
    expect(qaCss).toContain('@media (orientation: landscape) and (max-height: 540px)');
    expect(qaCss).toContain('.table-screen > .game-footer-compact');
    expect(qaCss).toContain('grid-column: 2');
  });

  it('keeps important table/settings controls touch-sized', () => {
    for (const selector of ['.pause-button', '.hud-deck', '.setting-toggle', '.house-rules summary']) {
      expect(qaCss, selector).toContain(selector);
    }
    expect(qaCss).toContain('min-height: 44px');
    expect(dockCss).toContain('min-height: 52px');
    expect(dockCss).toContain('width: 44px');
    expect(dockCss).toContain('height: 44px');
  });

  it('tests the complete requested viewport matrix in browser QA', () => {
    for (const size of [
      '[320, 568]', '[360, 740]', '[390, 844]', '[430, 932]',
      '[768, 1024]', '[1024, 768]', '[1280, 720]', '[1440, 900]',
      '[844, 390]', '[667, 375]',
    ]) {
      expect(browserQa, size).toContain(size);
    }
  });

  it('browser QA crosses the startup gate and covers secondary screens/pause', () => {
    expect(browserQa).toContain("await p.$('.startup-action')");
    expect(browserQa).toContain("await p.$('.startup-skip')");
    for (const screen of ["'menu'", "'stats'", "'settings'", "'daily'", "'classic'", "'house'"]) {
      expect(browserQa, screen).toContain(screen);
    }
    expect(browserQa).toContain('pause-overlay');
    expect(browserQa).toContain('menu hitboxes reachable and >=44px');
  });

  it('checks overflow, broken assets, scene width, footer/dock collision, and offline boot', () => {
    expect(browserQa).toContain('footerDockOverlap');
    expect(browserQa).toContain('sceneInWidth');
    expect(browserQa).toContain('brokenImg');
    expect(browserQa).toContain('document.documentElement.scrollWidth');
    expect(browserQa).toContain('await ctx.setOffline(true)');
    expect(browserQa).toContain('await enterGame(p)');
  });
});
