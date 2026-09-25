import { describe, expect, it } from 'vitest';
import dockCss from '../src/styles/dock.css?raw';
import sceneCss from '../src/styles/scene.css?raw';
import renderSource from '../src/ui/render.ts?raw';
import { effectiveStake, reserveStake, settleResults } from '../src/game';
import { INPUT_GUARD_MS } from '../src/ui/fx';
import { pauseLeaveDecision, pauseMenuMarkup } from '../src/ui/pause-menu';
import { defaultProfile } from '../src/storage/profile';

/** Regressions from the QA hardening pass; each block names the defect it pins. */

describe('stake pick survives a mid-hand chip dip', () => {
  it('keeps the chosen stake once chips recover after the hand', () => {
    // 150 chips, pick 100: while the hand is in play only 50 remain.
    const profile = { ...defaultProfile(), chips: 150 };
    const inHand = reserveStake(profile, 100);
    expect(effectiveStake(100, inHand.chips)).toBe(50);
    // A win returns 200: the next deal must use the original pick again.
    const settled = settleResults(inHand, [{ handId: 'hand-1', outcome: 'win', wager: 100, returned: 200, net: 100 }]);
    expect(settled.chips).toBe(250);
    expect(effectiveStake(100, settled.chips)).toBe(100);
  });

  it('never rewrites the pick while rendering', () => {
    expect(renderSource).toMatch(/function normalizedStake\(\): number {\s*return effectiveStake\(model\.selectedStake, model\.profile\.chips\);\s*}/);
  });

  it('handles zero, fractional, and below-preset chip counts', () => {
    expect(effectiveStake(25, 0)).toBe(0);
    expect(effectiveStake(25, 2.5)).toBe(2.5);
    expect(effectiveStake(25, 7)).toBe(7);
    expect(effectiveStake(25, 40)).toBe(25);
    expect(effectiveStake(100, 60)).toBe(50);
    expect(effectiveStake(Number.NaN, 1000)).toBe(100);
  });
});

describe('pause "Main Menu" confirmation', () => {
  const armed = { handInProgress: true, confirmArmed: true, armedAt: 1000 };

  it('ignores the second tap of a double-tap instead of abandoning the hand', () => {
    expect(pauseLeaveDecision({ ...armed, now: 1000 + 40, pointer: true })).toBe('ignore');
    expect(pauseLeaveDecision({ ...armed, now: 1000 + INPUT_GUARD_MS + 1, pointer: true })).toBe('leave');
  });

  it('still arms first, leaves on keyboard confirmation, and leaves at once with no hand', () => {
    expect(pauseLeaveDecision({ handInProgress: true, confirmArmed: false, armedAt: -Infinity, now: 5, pointer: true })).toBe('confirm');
    expect(pauseLeaveDecision({ ...armed, now: 1001, pointer: false })).toBe('leave');
    expect(pauseLeaveDecision({ handInProgress: false, confirmArmed: false, armedAt: -Infinity, now: 5, pointer: true })).toBe('leave');
  });
});

describe('leaving a table with storage unavailable', () => {
  it('restores the pre-deal profile from memory instead of reloading storage', () => {
    // loadProfile() only seeds the initial model; reading storage on leave reset progress to defaults.
    expect(renderSource.match(/loadProfile\(\)/g)).toHaveLength(1);
    expect(renderSource).toMatch(/isTableScreen\(model\.screen\) && handInProgress\(\)\) {[\s\S]{0,300}model\.profile = model\.handCheckpoint;/);
    // Every paid or replayed deal records the checkpoint; settling clears it.
    expect(renderSource.match(/model\.handCheckpoint = (?:before|beforeProfile|model\.profile);/g)).toHaveLength(3);
  });
});

describe('REP and stat counts are grouped like chips', () => {
  it('formats REP on the pause board', () => {
    const markup = pauseMenuMarkup({
      modeLabel: 'Classic', chips: '1,000', rep: 12500, title: 'BlackJak',
      handInProgress: false, confirmLeave: false, deckLabel: 'Standard', soundOn: true,
    });
    expect(markup).toContain('<b>12,500</b> REP');
  });

  it('never interpolates raw REP or stat numbers', () => {
    expect(renderSource).not.toMatch(/\$\{model\.profile\.rep\}/);
    expect(renderSource).not.toMatch(/\$\{model\.lastRepEarned\}/);
    expect(renderSource).toContain("typeof value === 'number' ? formatCount(value) : value");
  });
});

describe('controls stay on-screen', () => {
  it('wraps the betting dock in short landscape as well as on phones (Deal was off-screen)', () => {
    expect(dockCss).toMatch(/@media \(max-width: 520px\), \(orientation: landscape\) and \(max-height: 540px\) {\s*\.table-dock:not\(\.phase-playing\) \.dock-row {\s*flex-wrap: wrap;/);
  });

  it("wraps HUD pills on narrow phones and in short landscape so Jak's House keeps Deck visible", () => {
    expect(dockCss).toMatch(/@media \(max-width: 360px\), \(orientation: landscape\) and \(max-height: 540px\) {\s*\.table-hud \.hud { flex-wrap: wrap;/);
  });

  it('keeps the short-landscape scene inside its column (it overlapped the dock and House pills)', () => {
    expect(sceneCss).toMatch(/\.table-screen > \.game-scene {[^}]*grid-column: 1;[^}]*min-width: 0;/);
  });

  it('fits the betting stake row in the ~290px landscape column (MAX and Deal were clipped at 667x375)', () => {
    expect(dockCss).toMatch(/@media \(orientation: landscape\) and \(max-height: 540px\) {[^@]*\.table-dock \.dock-chip { width: 40px; height: 40px; min-width: 40px; }/);
    expect(dockCss).toMatch(/\.table-dock:not\(\.phase-playing\) \.dock-stakes {[^}]*flex-wrap: wrap;/);
  });
});

describe('focus after a finished Daily Hand', () => {
  it('falls back to Share before "← Menu"', () => {
    const share = renderSource.indexOf(`document.querySelector<HTMLElement>('[data-action="share-daily"]:not(:disabled)')`);
    const back = renderSource.indexOf(`document.querySelector<HTMLElement>('.back-button');`);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(back);
  });
});
