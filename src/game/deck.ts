import { RANKS, SUITS, type Card, type RandomSource } from './types';

export const systemRandom: RandomSource = {
  next: () => Math.random(),
};

export function createDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

export function shuffleDeck(deck: readonly Card[], rng: RandomSource = systemRandom): Card[] {
  const shuffled = deck.map((card) => ({ ...card }));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = rng.next();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new RangeError('RandomSource.next() must return a finite number in [0, 1).');
    }

    const swapIndex = Math.floor(sample * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function drawCard(deck: Card[]): Card {
  const card = deck.pop();
  if (!card) throw new Error('Cannot draw from an empty deck.');
  return card;
}
