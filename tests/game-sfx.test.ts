import { describe, expect, it } from 'vitest';
import renderSource from '../src/ui/render.ts?raw';
import { SOUND_RECIPES, type FeedbackCue } from '../src/feedback/feedback';
import { gameSfxSequence, SfxEventGate, type GameSfxEvent } from '../src/feedback/game-sfx';

const cueNames = (event: GameSfxEvent): FeedbackCue[] =>
  gameSfxSequence(event).map((step) => step.cue);

describe('gameplay SFX routing', () => {
  it('routes a paid hand through chip placement, shuffle, then deal', () => {
    const sequence = gameSfxSequence('round-start-paid');
    expect(sequence.map((step) => step.cue)).toEqual(['chip-place', 'shuffle', 'deal']);
    expect(sequence.map((step) => step.delayMs)).toEqual([0, 45, 190]);
  });

  it('does not fake a wager sound for free replay/Daily starts', () => {
    expect(cueNames('round-start-free')).toEqual(['shuffle', 'deal']);
    expect(cueNames('round-start-free')).not.toContain('chip-place');
  });

  it('gives every blackjack action its own semantic cue', () => {
    for (const action of ['hit', 'stand', 'double', 'split'] as const) {
      expect(cueNames(action)).toEqual([action]);
    }
  });

  it('routes chip selection separately from chip placement', () => {
    expect(cueNames('stake-select')).toEqual(['chip-select']);
    expect(cueNames('refill')).toEqual(['chip-place']);
  });

  it('reveals the dealer card before result stings', () => {
    expect(cueNames('result-win')).toEqual(['card-flip', 'win']);
    expect(cueNames('result-loss')).toEqual(['card-flip', 'loss']);
    expect(cueNames('result-blackjack')).toEqual(['card-flip', 'blackjack']);
    expect(cueNames('result-neutral')).toEqual(['card-flip']);
    expect(gameSfxSequence('result-win')[1]?.delayMs).toBeGreaterThan(0);
  });
});

describe('SFX event dedupe', () => {
  it('allows untokened deliberate interactions every time', () => {
    const gate = new SfxEventGate();
    expect(gate.accept()).toBe(true);
    expect(gate.accept()).toBe(true);
  });

  it('plays a stable gameplay event token only once across rerenders', () => {
    const gate = new SfxEventGate();
    expect(gate.accept('round:12:start')).toBe(true);
    expect(gate.accept('round:12:start')).toBe(false);
    expect(gate.accept('round:12:result')).toBe(true);
  });

  it('bounds remembered tokens so a long session cannot grow forever', () => {
    const gate = new SfxEventGate(2);
    expect(gate.accept('a')).toBe(true);
    expect(gate.accept('b')).toBe(true);
    expect(gate.accept('c')).toBe(true);
    expect(gate.accept('a')).toBe(true);
  });
});

describe('synthesized sound recipes', () => {
  it('defines recipes for every routed cue', () => {
    const routed = new Set<FeedbackCue>();
    const events: GameSfxEvent[] = [
      'round-start-paid',
      'round-start-free',
      'stake-select',
      'hit',
      'stand',
      'double',
      'split',
      'result-win',
      'result-loss',
      'result-blackjack',
      'result-neutral',
      'refill',
    ];
    for (const event of events) {
      for (const cue of cueNames(event)) routed.add(cue);
    }

    for (const cue of routed) {
      const recipe = SOUND_RECIPES[cue];
      expect(recipe, cue).toBeDefined();
      expect((recipe.tones?.length ?? 0) + (recipe.noise?.length ?? 0), cue).toBeGreaterThan(0);
      expect(recipe.gain, cue).toBeGreaterThan(0);
      expect(recipe.gain, cue).toBeLessThanOrEqual(0.15);
    }
  });

  it('uses filtered synthesized noise for physical card sounds', () => {
    for (const cue of ['shuffle', 'deal', 'card-flip', 'hit'] as const) {
      expect(SOUND_RECIPES[cue].noise?.length ?? 0, cue).toBeGreaterThan(0);
      expect(SOUND_RECIPES[cue].noise?.every((layer) => Boolean(layer.filterFrequency)), cue).toBe(true);
    }
  });

  it('keeps routing attached to gameplay events instead of render()', () => {
    const renderStart = renderSource.indexOf('function render(');
    const renderEnd = renderSource.indexOf('function bindEvents()', renderStart);
    const renderBody = renderSource.slice(renderStart, renderEnd);
    expect(renderBody).not.toContain('playGameSfx(');
    expect(renderSource).toContain("playGameSfx('stake-select')");
    expect(renderSource).toContain("playGameSfx('round-start-paid'");
    expect(renderSource).toContain("playGameSfx('round-start-free'");
  });
});
