import type { DialogueEvent } from './dialogue';
import { DEALER_SPRITES, type DealerSpriteId } from './visual-atlas';

/*
 * Jak dealer visuals: which sprite pose to show, derived only from the
 * dialogue event currently on screen and from one-shot UI action cues
 * (deal / draw / chips). Nothing here reads blackjack rules or round state,
 * so the dealer can never influence gameplay.
 */

export type DealerMood =
  | 'welcome'
  | 'idle'
  | 'talking'
  | 'thinking'
  | 'intrigued'
  | 'surprised'
  | 'impressed'
  | 'confident'
  | 'smug'
  | 'unimpressed'
  | 'angry'
  | 'teasing'
  | 'shrug'
  | 'celebrating';

export const DEALER_MOODS: readonly DealerMood[] = [
  'welcome', 'idle', 'talking', 'thinking', 'intrigued', 'surprised', 'impressed',
  'confident', 'smug', 'unimpressed', 'angry', 'teasing', 'shrug', 'celebrating',
];

/**
 * Sprite poses per mood (see DEALER_SPRITES labels). Moods with several poses
 * pick one deterministically from the dialogue line so repeat lines keep a
 * stable look while different lines add variety.
 */
export const MOOD_POSES: Readonly<Record<DealerMood, readonly DealerSpriteId[]>> = {
  welcome: ['full-present', 'bust-talk'],
  idle: ['full-idle', 'bust-talk'],
  talking: ['bust-talk'],
  thinking: ['bust-thinking', 'full-ponder'],
  intrigued: ['deal-fan'],
  surprised: ['bust-shocked'],
  impressed: ['full-point', 'deal-shades'],
  confident: ['deal-shades'],
  smug: ['bust-smug'],
  unimpressed: ['full-arms-crossed'],
  angry: ['bust-frustrated'],
  teasing: ['full-laugh'],
  shrug: ['full-shrug'],
  celebrating: ['full-celebrate'],
};

/** Every dialogue event resolves to a mood. */
export const EVENT_MOODS: Readonly<Record<DialogueEvent, DealerMood>> = {
  game_start: 'welcome',
  return_player: 'welcome',
  idle: 'idle',
  player_blackjack: 'surprised',
  dealer_blackjack: 'smug',
  player_bust: 'shrug',
  dealer_bust: 'angry',
  player_win: 'impressed',
  player_loss: 'confident',
  push: 'unimpressed',
  hit_17: 'thinking',
  hit_18: 'thinking',
  hit_19: 'angry',
  hit_20: 'surprised',
  survived_risky_hit: 'impressed',
  double_win: 'impressed',
  double_loss: 'teasing',
  split_started: 'intrigued',
  split_sweep: 'impressed',
  split_disaster: 'shrug',
  losing_streak: 'celebrating',
  winning_streak: 'unimpressed',
  refill_chips: 'teasing',
};

/** Short one-shot gestures played before settling into the dialogue pose. */
export type DealerAction = 'deal' | 'draw' | 'chips';

export const DEALER_ACTION_POSES: Readonly<Record<DealerAction, DealerSpriteId>> = {
  deal: 'deal-flick',
  draw: 'deal-reveal-ace',
  chips: 'deal-chip',
};

/** How long each gesture holds before the dialogue pose returns (ms). */
export const DEALER_ACTION_MS: Readonly<Record<DealerAction, number>> = {
  deal: 1100,
  draw: 850,
  chips: 950,
};

// ---------------------------------------------------------------------------
// Framing: keep Jak's head the same size/position whatever pose is shown.
// ---------------------------------------------------------------------------

/**
 * Sunglasses (lens pair) center per sprite, measured from the sheet pixels.
 * bust-shocked wears clear round glasses; its center was placed by hand.
 */
export const DEALER_EYES: Readonly<Record<DealerSpriteId, { readonly x: number; readonly y: number }>> = {
  'bust-talk': { x: 215.5, y: 119.5 },
  'bust-shocked': { x: 507, y: 121 },
  'bust-frustrated': { x: 791.5, y: 128 },
  'bust-thinking': { x: 1060, y: 111 },
  'bust-smug': { x: 1326.5, y: 122 },
  'deal-flick': { x: 161, y: 408 },
  'deal-fan': { x: 424, y: 393.5 },
  'deal-shuffle': { x: 659.5, y: 403 },
  'deal-reveal-ace': { x: 890, y: 400 },
  'deal-chip': { x: 1122, y: 399.5 },
  'deal-shades': { x: 1357, y: 407.5 },
  'full-laugh': { x: 110.5, y: 654 },
  'full-shrug': { x: 310.5, y: 673 },
  'full-point': { x: 491.5, y: 666 },
  'full-ponder': { x: 648.5, y: 659 },
  'full-arms-crossed': { x: 806.5, y: 666.5 },
  'full-celebrate': { x: 988, y: 668 },
  'full-idle': { x: 1161.5, y: 664 },
  'full-present': { x: 1333.5, y: 667.5 },
};

/** Median lens-pair width (sheet px) per framing row; the rows are drawn at different scales. */
export const DEALER_LENS_WIDTH = { bust: 77, half: 60, full: 41 } as const;

export const DEALER_WINDOW = {
  /** Width / height of Jak's viewport. */
  aspect: 1.1,
  /** Lens width as a share of the viewport width. */
  lensShare: 0.22,
  /** Eye line as a share of the viewport height from the top. */
  eyeLine: 0.32,
} as const;

export interface DealerPoseFrame {
  /** Sprite width, left and top as percentages of Jak's viewport. */
  readonly width: number;
  readonly left: number;
  readonly top: number;
}

/** Places a sprite's full atlas rect inside the viewport so its eyes land on the shared eye line. */
export function dealerPoseFrame(id: DealerSpriteId): DealerPoseFrame {
  const { rect, framing } = DEALER_SPRITES[id];
  const eyes = DEALER_EYES[id];
  const unit = (DEALER_WINDOW.lensShare * 100) / DEALER_LENS_WIDTH[framing]; // % of viewport width per sheet px
  return {
    width: rect.width * unit,
    left: 50 - (eyes.x - rect.x) * unit,
    top: DEALER_WINDOW.eyeLine * 100 - (eyes.y - rect.y) * unit * DEALER_WINDOW.aspect,
  };
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return hash;
}

export interface DealerVisualState {
  readonly mood: DealerMood;
  readonly pose: DealerSpriteId;
  readonly action: DealerAction | null;
  readonly actionPose: DealerSpriteId | null;
}

/** Resolves the dealer's look from the on-screen dialogue event (+ optional one-shot action cue). */
export function dealerVisualFor(event: DialogueEvent, seed = '', action: DealerAction | null = null): DealerVisualState {
  const mood = EVENT_MOODS[event];
  const poses = MOOD_POSES[mood];
  return {
    mood,
    pose: poses[hashSeed(seed) % poses.length],
    action,
    actionPose: action ? DEALER_ACTION_POSES[action] : null,
  };
}
