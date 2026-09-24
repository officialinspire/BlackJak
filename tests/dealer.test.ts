import { beforeEach, describe, expect, it } from 'vitest';
import dealerVisualsSource from '../src/data/dealer-visuals.ts?raw';
import dealerCss from '../src/styles/dealer.css?raw';
import { DIALOGUE_BANK, type DialogueEvent } from '../src/data/dialogue';
import {
  DEALER_ACTION_MS,
  DEALER_ACTION_POSES,
  DEALER_EYES,
  DEALER_MOODS,
  EVENT_MOODS,
  MOOD_POSES,
  dealerPoseFrame,
  dealerVisualFor,
  type DealerAction,
} from '../src/data/dealer-visuals';
import { DEALER_SPRITES, DEALER_SPRITE_IDS } from '../src/data/visual-atlas';
import { dealerMarkup, resetDealerPoseMemory } from '../src/ui/dealer';

const EVENTS = Object.keys(DIALOGUE_BANK) as DialogueEvent[];

beforeEach(() => resetDealerPoseMemory());

describe('dealer visual mapping', () => {
  it('maps every dialogue event to a mood with at least one real sprite pose', () => {
    for (const event of EVENTS) {
      const mood = EVENT_MOODS[event];
      expect(DEALER_MOODS, event).toContain(mood);
      expect(MOOD_POSES[mood].length, mood).toBeGreaterThan(0);
      for (const pose of MOOD_POSES[mood]) expect(DEALER_SPRITE_IDS).toContain(pose);
    }
  });

  it('follows the intended event personality', () => {
    expect(EVENT_MOODS.player_blackjack).toBe('surprised');
    expect(EVENT_MOODS.dealer_blackjack).toBe('smug');
    expect(EVENT_MOODS.hit_20).toBe('surprised');
    expect(EVENT_MOODS.player_bust).toBe('shrug');
    expect(EVENT_MOODS.double_win).toBe('impressed');
    expect(EVENT_MOODS.double_loss).toBe('teasing');
    expect(EVENT_MOODS.split_sweep).toBe('impressed');
    expect(EVENT_MOODS.split_disaster).toBe('shrug');
    expect(EVENT_MOODS.game_start).toBe('welcome');
    expect(MOOD_POSES.idle).toEqual(expect.arrayContaining(['full-idle', 'bust-talk']));
  });

  it('uses every mood somewhere and gives each action a dealing pose', () => {
    const used = new Set(Object.values(EVENT_MOODS));
    for (const mood of DEALER_MOODS) if (mood !== 'talking') expect(used.has(mood), mood).toBe(true);
    for (const [action, pose] of Object.entries(DEALER_ACTION_POSES) as [DealerAction, string][]) {
      expect(DEALER_SPRITES[pose as keyof typeof DEALER_SPRITES].framing, action).toBe('half');
      expect(DEALER_ACTION_MS[action]).toBeGreaterThan(300);
      expect(DEALER_ACTION_MS[action]).toBeLessThan(1500);
    }
  });

  it('picks poses deterministically from the dialogue line', () => {
    const a = dealerVisualFor('idle', 'House is listening.');
    const b = dealerVisualFor('idle', 'House is listening.');
    expect(a).toEqual(b);
    const seen = new Set(['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff'].map((seed) => dealerVisualFor('idle', seed).pose));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('only reads dialogue events and atlas data, never game rules or round state', () => {
    const imports = [...dealerVisualsSource.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
    expect(imports.sort()).toEqual(['./dialogue', './visual-atlas']);
    expect(dealerVisualsSource).not.toMatch(/RoundState|evaluateHand|phase/);
  });
});

describe('dealer framing', () => {
  it('has measured eyes inside every sprite rect', () => {
    for (const id of DEALER_SPRITE_IDS) {
      const { rect } = DEALER_SPRITES[id];
      const eyes = DEALER_EYES[id];
      expect(eyes.x > rect.x && eyes.x < rect.x + rect.width, id).toBe(true);
      expect(eyes.y > rect.y && eyes.y < rect.y + rect.height * 0.5, id).toBe(true);
    }
  });

  it('puts every pose’s eyes on the same point of the viewport', () => {
    for (const id of DEALER_SPRITE_IDS) {
      const { rect } = DEALER_SPRITES[id];
      const eyes = DEALER_EYES[id];
      const frame = dealerPoseFrame(id);
      const eyeX = frame.left + ((eyes.x - rect.x) / rect.width) * frame.width;
      expect(eyeX, id).toBeCloseTo(50, 6);
      expect(frame.width, id).toBeGreaterThan(50);
    }
  });
});

describe('dealer markup', () => {
  it('keeps the sprite decorative and the dialogue text out of the NPC', () => {
    const markup = dealerMarkup({ event: 'player_blackjack', seed: 'Okay. That one had style.', action: null, house: false });
    expect(markup).toMatch(/class="dealer-window" aria-hidden="true"/);
    expect(markup).not.toContain('Okay. That one had style.');
    expect(markup).toContain('data-dealer-mood="surprised"');
    expect(markup).toContain('data-dealer-pose="bust-shocked"');
  });

  it('plays a one-shot action pose before the dialogue pose', () => {
    const markup = dealerMarkup({ event: 'idle', seed: 'x', action: 'deal', house: true });
    expect(markup).toContain('is-acting action-deal');
    expect(markup).toContain(`--dealer-action-ms:${DEALER_ACTION_MS.deal}ms`);
    expect(markup.indexOf('dealer-pose-action')).toBeLessThan(markup.indexOf('dealer-pose-mood'));
    expect(markup).toContain('data-pose="deal-flick"');
    expect(markup).toContain('is-house');

    const settled = dealerMarkup({ event: 'idle', seed: 'x', action: null, house: true });
    expect(settled).not.toContain('dealer-pose-action');
  });

  it('only animates a pose change when the pose actually changed', () => {
    dealerMarkup({ event: 'push', seed: '', action: null, house: false });
    expect(dealerMarkup({ event: 'push', seed: '', action: null, house: false })).not.toContain('is-new-pose');
    expect(dealerMarkup({ event: 'player_bust', seed: '', action: null, house: false })).toContain('is-new-pose');
  });

  it('disables gestures and breathing under reduced motion', () => {
    const reduced = dealerCss.slice(dealerCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.dealer-pose-action { display: none; }');
    expect(reduced).toContain('animation: none !important');
  });
});
