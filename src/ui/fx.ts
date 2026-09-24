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
  cardDeal: 200,
  cardFlip: 320,
  chipBounce: 260,
  actionFlash: 180,
  resultPop: 450,
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
  for (const cue of cues) names.add(`fx-${cue.split(':')[0]}`);
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

export function shouldIgnoreActivation(input: {
  readonly now: number;
  readonly controlsChangedAt: number;
  readonly pointer: boolean;
}): boolean {
  if (!input.pointer) return false;
  const elapsed = input.now - input.controlsChangedAt;
  return elapsed >= 0 && elapsed < INPUT_GUARD_MS;
}
