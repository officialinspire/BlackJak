import { describe, expect, it } from 'vitest';
import fxCss from '../src/styles/fx.css?raw';
import { DIALOGUE_BANK, type DialogueEvent } from '../src/data/dialogue';
import { EVENT_MOODS, MOOD_POSES } from '../src/data/dealer-visuals';
import { HAPTIC_PATTERNS, hapticPulseOffsets, type HapticCue } from '../src/feedback/feedback';
import { gameSfxSequence } from '../src/feedback/game-sfx';
import { FX_TIMING } from '../src/ui/fx';

const lines = (Object.values(DIALOGUE_BANK) as (typeof DIALOGUE_BANK)[DialogueEvent][])
  .flat()
  .map((line) => (typeof line === 'string' ? line : line[0]));

describe("Jak's voice", () => {
  it('carries his cardistry, auditor and Hallelujah personality across the bank', () => {
    const all = lines.join('\n').toLowerCase();
    for (const word of ['hallelujah', 'charlier', 'sybil', 'fan', 'filming', 'public forum', 'detained', 'supervisor', 'i do not answer questions']) {
      expect(all, word).toContain(word);
    }
    expect(lines.filter((line) => /hallelujah/i.test(line)).length).toBeGreaterThanOrEqual(8);
  });

  it('keeps every line short enough for the dialogue panel', () => {
    for (const line of lines) expect(line.length, line).toBeLessThanOrEqual(74);
  });

  it('talks while dealing (fan pose) and when the player stands', () => {
    expect(DIALOGUE_BANK.deal_start.length).toBeGreaterThanOrEqual(4);
    expect(DIALOGUE_BANK.player_stand.length).toBeGreaterThanOrEqual(3);
    expect(MOOD_POSES[EVENT_MOODS.deal_start]).toContain('deal-fan');
  });
});

describe('haptics', () => {
  it('gives Hit, Stand, Double and Split distinct feels', () => {
    const feels = (['hit', 'stand', 'double', 'split'] as HapticCue[]).map((cue) => JSON.stringify(HAPTIC_PATTERNS[cue]));
    expect(new Set(feels).size).toBe(4);
    for (const action of ['hit', 'stand', 'double', 'split'] as const) {
      expect(gameSfxSequence(action)[0].haptic).toBe(action);
    }
  });

  it('keeps every pattern short and tap-like', () => {
    for (const [cue, pattern] of Object.entries(HAPTIC_PATTERNS)) {
      const total = typeof pattern === 'number' ? pattern : pattern.reduce((sum, ms) => sum + ms, 0);
      expect(total, cue).toBeLessThanOrEqual(260);
    }
  });

  it('turns a vibration pattern into discrete pulse offsets (iOS switch fallback)', () => {
    expect(hapticPulseOffsets(14)).toEqual([0]);
    expect(hapticPulseOffsets([10, 60, 18])).toEqual([0, 70]);
    expect(hapticPulseOffsets([25, 35, 35, 35, 45])).toEqual([0, 60, 130]);
  });
});

describe('cardistry motion', () => {
  it('fans the deck on the shuffle, twirls Hit cards, lands Doubles sideways, and fans a blackjack', () => {
    for (const keyframes of ['fx-cardistry-fan', 'fx-card-twirl', 'fx-card-double', 'fx-deck-spring', 'fx-blackjack-fan']) {
      expect(fxCss, keyframes).toContain(`@keyframes ${keyframes}`);
    }
    expect(FX_TIMING.cardistryFan).toBeLessThanOrEqual(500);
    expect(FX_TIMING.cardTwirl).toBeLessThanOrEqual(500);
  });
});
