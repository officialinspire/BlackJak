export type CardMotionState = 'NEW' | 'SETTLED' | 'FLIPPING' | 'MOVING/SPLIT';

export interface CardVisual {
  readonly id: string;
  readonly hidden: boolean;
  readonly fingerprint: string;
  readonly dealOrder?: number;
  readonly splitSourceId?: string;
}

export interface CardMotionPlan {
  readonly id: string;
  readonly state: CardMotionState;
  readonly dealOrder: number;
}

/** Tracks card identities across complete DOM rerenders. */
export class CardMotionPlanner {
  private previous = new Map<string, { hidden: boolean; fingerprint: string }>();
  private current = new Map<string, { hidden: boolean; fingerprint: string }>();

  beginFrame(): void {
    this.current = new Map();
  }

  plan(card: CardVisual): CardMotionPlan {
    const prior = this.previous.get(card.id);
    let state: CardMotionState = 'SETTLED';
    if (prior?.hidden && !card.hidden) state = 'FLIPPING';
    else if (!prior && card.splitSourceId && this.previous.has(card.splitSourceId)) state = 'MOVING/SPLIT';
    else if (!prior || prior.fingerprint !== card.fingerprint) state = 'NEW';

    this.current.set(card.id, { hidden: card.hidden, fingerprint: card.fingerprint });
    return { id: card.id, state, dealOrder: card.dealOrder ?? 0 };
  }

  commitFrame(): void {
    this.previous = this.current;
  }

  reset(): void {
    this.previous.clear();
    this.current.clear();
  }
}

export function cardVisualId(roundSerial: number, owner: 'dealer' | 'player', handId: string, slot: number): string {
  return `${roundSerial}:${owner}:${handId}:${slot}`;
}
