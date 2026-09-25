import { describe, expect, it } from 'vitest';
import buttonsCss from '../src/styles/buttons.css?raw';
import dockCss from '../src/styles/dock.css?raw';
import dailyCss from '../src/styles/feedback-daily.css?raw';
import mainCss from '../src/styles/main.css?raw';
import menuBoardCss from '../src/styles/menu-board.css?raw';
import premiumCss from '../src/styles/premium.css?raw';
import progressionCss from '../src/styles/progression.css?raw';
import qaCss from '../src/styles/qa.css?raw';

const rule = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*{([^}]*)}`))?.[1] ?? '';
};

describe('UI polish: shared tokens and states', () => {
  it('defines the shared polish tokens once in premium.css', () => {
    for (const token of ['--bj-muted-dim', '--bj-line', '--bj-line-strong', '--bj-focus', '--bj-radius-sm', '--bj-radius', '--bj-label-size', '--bj-label-track']) {
      expect(premiumCss).toContain(`${token}:`);
    }
  });

  it('uses one gold focus ring instead of per-control outlines', () => {
    expect(qaCss).toMatch(/\[role="button"\]:focus-visible\s*{\s*outline:\s*2px solid var\(--bj-focus/);
    expect(buttonsCss).not.toMatch(/:focus-visible\s*{\s*outline:/);
    expect(progressionCss).not.toContain('.achievement-filter:focus-visible');
  });

  it('gives disabled and pressed states to every button family', () => {
    expect(buttonsCss).toMatch(/button:disabled\s*{\s*cursor:\s*not-allowed/);
    expect(buttonsCss).toMatch(/\.primary-action:not\(:disabled\):active\s*{/);
    expect(buttonsCss).toMatch(/\.primary-action:disabled\s*{/);
    expect(buttonsCss).toMatch(/button\.daily-action:disabled\s*{\s*opacity:\s*\.5/);
    expect(progressionCss).toMatch(/\.achievement-filter:active\s*{/);
  });

  it('keeps HUD and back buttons at a 44px touch height from their owning rules', () => {
    expect(rule(dockCss, '.pause-button,\n.hud-deck')).toMatch(/min-height:\s*44px/);
    expect(mainCss).toMatch(/\.back-button\s*{[^}]*min-height:\s*44px/);
  });
});

describe('UI polish: status, progress, and panels', () => {
  it('aligns the REP pill with the chips pill (no forced bottom padding)', () => {
    expect(rule(progressionCss, '.rep-pill')).not.toContain('padding-bottom');
    expect(progressionCss).toMatch(/\.rep-mini-track\s*{[^}]*bottom:\s*3px/);
  });

  it('renders settings status values as chips', () => {
    const status = rule(premiumCss, '.setting-row b');
    expect(status).toMatch(/border:\s*1px solid var\(--bj-line\)/);
    expect(status).toMatch(/border-radius:\s*999px/);
  });

  it('keeps progression and logbook labels at or above the label floor', () => {
    const sizes = [...progressionCss.matchAll(/font-size:\s*\.(\d+)rem/g)].map((match) => Number(`0.${match[1]}`));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.5);
    expect(progressionCss).not.toContain('#625d52');
  });

  it('keeps the pause summary inside the cropped phone board', () => {
    expect(rule(menuBoardCss, '.pause-summary')).toMatch(/max-width:\s*min\(100%, calc\(100vw - 2\.5rem\)\)/);
  });

  it('turns the stacked Daily "VS" into a divider instead of rotating it', () => {
    expect(dailyCss).not.toMatch(/\.daily-vs\s*{[^}]*rotate/);
    expect(dailyCss).toMatch(/\.daily-vs::before,\s*\.daily-vs::after/);
  });
});
