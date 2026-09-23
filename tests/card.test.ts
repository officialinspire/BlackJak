import { describe, expect, it } from 'vitest';
import { cardMarkup } from '../src/ui/card';

describe('accessible card markup', () => {
  it('exposes visible cards as named playing-card images while keeping a non-color suit symbol', () => {
    const markup = cardMarkup({ rank: 'K', suit: 'hearts' });

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-roledescription="playing card"');
    expect(markup).toContain('aria-label="K of hearts"');
    expect(markup).toContain('data-suit="hearts"');
    expect(markup).toContain('♥');
  });

  it('announces hidden dealer cards without exposing their face', () => {
    const markup = cardMarkup({ rank: 'A', suit: 'spades' }, true);

    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Hidden dealer card"');
    expect(markup).not.toContain('A of spades');
  });

  it('describes the House Gold Card rule in its accessible name', () => {
    const markup = cardMarkup({ rank: 'A', suit: 'diamonds' }, false, 0, 'gold');

    expect(markup).toContain('aria-label="Gold Card, counts as Ace, A of diamonds"');
    expect(markup).toContain('gold-card');
  });
});
