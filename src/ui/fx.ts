import type { PlayerAction } from '../game';

/*
 * One-shot game-feel cues. Game events queue cues; the next render reads them
 * to add short-lived classes, and then they are gone, so a later re-render
 * (e.g. choosing a stake) never replays a bust shake or a dialogue arrival.
 * Nothing here waits: every effect is a CSS animation on already-updated DOM,
 * and game state changes immediately.
 */

export type FxCue =
  | 'deal'
  | 'shuffle'
  | 'line'
  | 'panel'
  | 'result'
  | 'bust'
  | 'achievement'
  | 'stake'
  | `stake:${string}`
  | `action:${PlayerAction}`;

/** Effect durations (ms). All sit inside the 120–500ms feel budget. */
export const FX_TIMING = {
  cardDeal: 260,
  /** Cardistry: Jak thumb-fans the deck on the shuffle cue. */
  cardistryFan: 480,
  /** Cardistry: a Hit card twirls in off the deck. */
  cardTwirl: 300,
  /** Cardistry: the top card springs up as a card leaves the deck. */
  deckSpring: 240,
  cardFlip: 320,
  splitMove: 240,
  chipBounce: 260,
  actionFlash: 180,
  resultPop: 450,
  /** Cardistry: a blackjack fans open and snaps shut. */
  cardFlourish: 460,
  bustImpact: 260,
  achievementPop: 320,
  panelArrive: 280,
  lineArrive: 220,
  dealerReaction: 240,
} as const;

export type FxTimingKey = keyof typeof FX_TIMING;

const kebab = (id: string): string => id.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** CSS custom properties for fx.css, e.g. `--fx-card-deal:200ms`. */
export function fxStyleVars(): string {
  return (Object.entries(FX_TIMING) as [FxTimingKey, number][])
    .map(([key, ms]) => `--fx-${kebab(key)}:${ms}ms`)
    .join(';');
}

export class FxQueue {
  private cues = new Set<FxCue>();

  cue(...cues: FxCue[]): void {
    for (const cue of cues) this.cues.add(cue);
  }

  /** Returns the pending cues and clears the queue (one render's worth). */
  consume(): ReadonlySet<FxCue> {
    const current = this.cues;
    this.cues = new Set();
    return current;
  }
}

/** Screen-level classes for plain cues: `fx-result`, `fx-bust`, … (`stake:25` → `fx-stake`). */
export function fxClassNames(cues: ReadonlySet<string>): string {
  const names = new Set<string>();
  for (const cue of cues) {
    const [kind, detail] = cue.split(':');
    names.add(`fx-${kind}`);
    if (detail) names.add(`fx-${kind}-${detail}`);
  }
  return [...names].sort().join(' ');
}

/**
 * Stale-input guard: a pointer tap that lands within this window after the
 * controls changed shape (e.g. Stand → Deal again, Deal → Hit) is treated as
 * the tail of a double-tap and ignored. Keyboard activations are never guarded
 * (repeat keys are already filtered), and taps on unchanged controls (repeated
 * Hit) are never delayed.
 */
export const INPUT_GUARD_MS = 260;

/** Stable identity for the controls currently occupying the action area. */
export function controlsStateKey(input: {
  readonly screen: string;
  readonly dockPhase: string | null;
  readonly dailyPhase?: string;
  readonly dailyHandIndex?: number;
}): string | null {
  if (input.screen === 'daily') {
    return `daily:${input.dailyPhase ?? 'preview'}:${input.dailyHandIndex ?? -1}`;
  }
  return input.dockPhase ? `dock:${input.dockPhase}` : null;
}

export function shouldIgnoreActivation(input: {
  readonly now: number;
  readonly controlsChangedAt: number;
  readonly pointer: boolean;
}): boolean {
  if (!input.pointer) return false;
  // A tap stamped before the change (queued while a slow render ran) was aimed
  // at the old controls, so it is stale too; negative elapsed counts.
  const elapsed = input.now - input.controlsChangedAt;
  return elapsed < INPUT_GUARD_MS;
}
