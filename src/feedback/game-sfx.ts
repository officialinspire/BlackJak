import type { FeedbackCue, HapticCue } from './feedback';

export type GameSfxEvent =
  | 'round-start-paid'
  | 'round-start-free'
  | 'stake-select'
  | 'hit'
  | 'stand'
  | 'double'
  | 'split'
  | 'result-win'
  | 'result-loss'
  | 'result-blackjack'
  | 'result-neutral'
  | 'refill';

export interface GameSfxStep {
  readonly cue: FeedbackCue;
  readonly haptic: HapticCue | null;
  readonly delayMs: number;
}

const step = (cue: FeedbackCue, haptic: HapticCue | null = null, delayMs = 0): GameSfxStep => ({
  cue,
  haptic,
  delayMs,
});

const SEQUENCES: Record<GameSfxEvent, readonly GameSfxStep[]> = {
  'round-start-paid': [
    step('chip-place', 'tap'),
    step('shuffle', null, 45),
    step('deal', 'deal', 190),
  ],
  'round-start-free': [
    step('shuffle'),
    step('deal', 'deal', 150),
  ],
  'stake-select': [step('chip-select', 'select')],
  hit: [step('hit', 'hit')],
  stand: [step('stand', 'stand')],
  double: [step('double', 'double')],
  split: [step('split', 'split')],
  'result-win': [
    step('card-flip', 'flip'),
    step('win', 'win', 105),
  ],
  'result-loss': [
    step('card-flip', 'flip'),
    step('loss', 'loss', 105),
  ],
  'result-blackjack': [
    step('card-flip', 'flip'),
    step('blackjack', 'blackjack', 105),
  ],
  'result-neutral': [
    step('card-flip', 'result'),
  ],
  refill: [step('chip-place', 'result')],
};

export function gameSfxSequence(event: GameSfxEvent): readonly GameSfxStep[] {
  return SEQUENCES[event];
}

/**
 * A gameplay event may cause multiple DOM renders, but its audio should fire
 * only once. Supplying a stable token lets callers dedupe state transitions
 * without suppressing deliberate repeated interactions such as chip selection.
 */
export class SfxEventGate {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly maxEntries = 96) {}

  accept(token?: string): boolean {
    if (!token) return true;
    if (this.seen.has(token)) return false;

    this.seen.add(token);
    this.order.push(token);

    while (this.order.length > this.maxEntries) {
      const expired = this.order.shift();
      if (expired) this.seen.delete(expired);
    }

    return true;
  }
}
