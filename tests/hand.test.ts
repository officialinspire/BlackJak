import { describe, expect, it } from 'vitest';
import { canSplitCards, evaluateHand, type Card } from '../src/game';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

describe('hand evaluation', () => {
  it('treats an ace as 11 when safe', () => {
    expect(evaluateHand([c('A'), c('6')])).toMatchObject({ total: 17, isSoft: true, isBust: false });
  });

  it('reduces aces from 11 to 1 to prevent busts', () => {
    expect(evaluateHand([c('A'), c('9'), c('8')])).toMatchObject({ total: 18, isSoft: false, isBust: false });
  });

  it('handles multiple aces', () => {
    expect(evaluateHand([c('A'), c('A'), c('9')])).toMatchObject({ total: 21, isSoft: true, isBust: false });
  });

  it('detects natural blackjack only with two cards', () => {
    expect(evaluateHand([c('A'), c('K')]).isBlackjack).toBe(true);
    expect(evaluateHand([c('7'), c('7'), c('7')]).isBlackjack).toBe(false);
  });

  it('allows equal-value ten cards to split under BlackJak v1 policy', () => {
    expect(canSplitCards([c('K'), c('10')])).toBe(true);
    expect(canSplitCards([c('9'), c('10')])).toBe(false);
  });
});
