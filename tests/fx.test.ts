import { describe, expect, it } from 'vitest';
import fxCss from '../src/styles/fx.css?raw';
import { DEALER_ACTION_MS } from '../src/data/dealer-visuals';
import { cardMarkup } from '../src/ui/card';
import {
  FX_TIMING,
  FxQueue,
  INPUT_GUARD_MS,
  controlsStateKey,
  fxClassNames,
  fxStyleVars,
  shouldIgnoreActivation,
} from '../src/ui/fx';
import { tableDockMarkup, type DockInput } from '../src/ui/table-dock';

const dock = (overrides: Partial<DockInput> = {}): DockInput => ({
  phase: 'betting',
  stakeOptions: [10, 25, 50, 100],
  selectedStake: 25,
  chips: 1000,
  maxStake: 500,
  allowed: ['hit', 'stand'],
  house: false,
  formatChips: String,
  ...overrides,
});

describe('fx timing budget', () => {
  it('keeps every effect between 120 and 500ms', () => {
    for (const [key, ms] of Object.entries(FX_TIMING)) {
      expect(ms, key).toBeGreaterThanOrEqual(120);
      expect(ms, key).toBeLessThanOrEqual(500);
    }
  });

  it('keeps Jak’s one-shot gesture holds under a second', () => {
    for (const ms of Object.values(DEALER_ACTION_MS)) expect(ms).toBeLessThan(1000);
  });

  it('matches the fx.css custom-property contract both ways', () => {
    const emitted = new Set([...fxStyleVars().matchAll(/(--fx-[a-z-]+):/g)].map((m) => m[1]));
    const consumed = new Set([...fxCss.matchAll(/var\((--fx-[a-z-]+)/g)].map((m) => m[1]));
    for (const name of consumed) expect(emitted.has(name), name).toBe(true);
    for (const name of emitted) expect(consumed.has(name), name).toBe(true);
  });
});

describe('restraint', () => {
  it('adds no looping effects (only reuses Jak’s idle breathing)', () => {
    const loops = [...fxCss.matchAll(/([a-z-]+)[^;]*\binfinite\b/g)].map((m) => m[0]);
    for (const loop of loops) expect(loop).toContain('dealer-breathe');
  });

  it('never shakes the whole screen', () => {
    const rules = [...fxCss.matchAll(/([^{}]+)\{[^}]*animation:\s*(?!none)[^}]*\}/g)].map((m) => m[1].trim());
    for (const selector of rules) {
      for (const part of selector.split(',')) {
        const last = part.trim().split(/\s+/).pop() ?? '';
        expect(['body', 'html', '#app', '.table-screen', '.game-scene', '.scene-frame'], part).not.toContain(last);
      }
    }
  });

  it('turns every effect off under reduced motion', () => {
    const reduced = fxCss.slice(fxCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('animation: none !important');
    for (const selector of ['.is-bounce', '.is-fired', '.fx-line', '.fx-panel', '.is-new-pose', '.fx-achievement', '.fx-bust', '.fx-result']) {
      expect(reduced, selector).toContain(selector);
    }
  });
});

describe('one-shot cues', () => {
  it('are consumed exactly once', () => {
    const queue = new FxQueue();
    queue.cue('result', 'stake:25', 'result');
    const first = queue.consume();
    expect([...first].sort()).toEqual(['result', 'stake:25']);
    expect(queue.consume().size).toBe(0);
  });

  it('map to screen classes', () => {
    expect(fxClassNames(new Set(['stake:25', 'stake', 'action:hit', 'bust']))).toBe('fx-action fx-bust fx-stake');
    expect(fxClassNames(new Set())).toBe('');
  });

  it('decorate only the cued chip and action', () => {
    const betting = tableDockMarkup(dock({ fx: new Set(['stake:50']) }));
    expect(betting).toMatch(/dock-chip is-bounce" data-stake="50"/);
    expect(betting.match(/is-bounce/g)).toHaveLength(1);
    expect(tableDockMarkup(dock())).not.toContain('is-bounce');

    const playing = tableDockMarkup(dock({ phase: 'playing', fx: new Set(['action:hit']) }));
    expect(playing).toContain('dock-action-hit is-ready is-fired');
    expect(playing.match(/is-fired/g)).toHaveLength(1);
  });

  it('flip a revealed hole card instead of re-dealing it', () => {
    const flip = cardMarkup({ rank: 'K', suit: 'spades' }, false, 1, 'standard', undefined, 'flip');
    expect(flip).toContain('is-flip');
    expect(flip).not.toContain('is-settled');
  });
});

describe('stale-input guard', () => {
  it('detects Daily phase and active-hand control transitions', () => {
    expect(controlsStateKey({ screen: 'daily', dockPhase: null, dailyPhase: 'player-turn', dailyHandIndex: 0 }))
      .not.toBe(controlsStateKey({ screen: 'daily', dockPhase: null, dailyPhase: 'resolved', dailyHandIndex: 0 }));
    expect(controlsStateKey({ screen: 'daily', dockPhase: null, dailyPhase: 'player-turn', dailyHandIndex: 0 }))
      .not.toBe(controlsStateKey({ screen: 'daily', dockPhase: null, dailyPhase: 'player-turn', dailyHandIndex: 1 }));
  });

  it('ignores a pointer tap that lands just after the controls changed', () => {
    expect(shouldIgnoreActivation({ now: 1000 + INPUT_GUARD_MS - 1, controlsChangedAt: 1000, pointer: true })).toBe(true);
    expect(shouldIgnoreActivation({ now: 1000 + 10, controlsChangedAt: 1000, pointer: true })).toBe(true);
  });

  it('never delays deliberate input', () => {
    expect(shouldIgnoreActivation({ now: 1000 + INPUT_GUARD_MS, controlsChangedAt: 1000, pointer: true })).toBe(false);
    expect(shouldIgnoreActivation({ now: 1010, controlsChangedAt: 1000, pointer: false })).toBe(false);
    expect(shouldIgnoreActivation({ now: 900, controlsChangedAt: 1000, pointer: true })).toBe(false);
    expect(shouldIgnoreActivation({ now: 5, controlsChangedAt: -Infinity, pointer: true })).toBe(false);
  });

  it('keeps the guard shorter than a deliberate second tap', () => {
    expect(INPUT_GUARD_MS).toBeGreaterThanOrEqual(150);
    expect(INPUT_GUARD_MS).toBeLessThanOrEqual(350);
  });
});
