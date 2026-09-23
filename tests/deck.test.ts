import { describe, expect, it } from 'vitest';
import { createDeck, shuffleDeck, type RandomSource } from '../src/game';

describe('deck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((card) => `${card.rank}-${card.suit}`)).size).toBe(52);
  });

  it('shuffles deterministically with injected RNG', () => {
    const sequence = [0.1, 0.7, 0.3, 0.9];
    let cursor = 0;
    const rng: RandomSource = { next: () => sequence[cursor++ % sequence.length] };
    const first = shuffleDeck(createDeck(), rng);
    cursor = 0;
    const second = shuffleDeck(createDeck(), rng);
    expect(first).toEqual(second);
  });
});
