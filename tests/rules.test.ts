import { describe, expect, it } from 'vitest';
import { allowedActions, dealerShouldHit, determineOutcome, payoutFor, type Card, type PlayerHand } from '../src/game';

const c = (rank: Card['rank'], suit: Card['suit'] = 'clubs'): Card => ({ rank, suit });
const hand = (cards: Card[], wager = 25): PlayerHand => ({ id: 'h1', cards, wager, status: 'active', doubled: false, fromSplit: false });

describe('dealer rules', () => {
  it('hits through 16 and stands on hard 17', () => {
    expect(dealerShouldHit([c('10'), c('6')])).toBe(true);
    expect(dealerShouldHit([c('10'), c('7')])).toBe(false);
  });

  it('stands on soft 17 in v1', () => {
    expect(dealerShouldHit([c('A'), c('6')])).toBe(false);
  });
});

describe('actions', () => {
  it('allows double/split only with enough bankroll on the initial two cards', () => {
    expect(allowedActions(hand([c('8'), c('8')]), 25)).toEqual(['hit', 'stand', 'double', 'split']);
    expect(allowedActions(hand([c('8'), c('8')]), 10)).toEqual(['hit', 'stand']);
    expect(allowedActions(hand([c('8'), c('8'), c('2')]), 25)).toEqual(['hit', 'stand']);
  });
});

describe('outcomes and payouts', () => {
  it('resolves bust, dealer bust, push, and natural blackjack', () => {
    expect(determineOutcome([c('K'), c('Q'), c('2')], [c('10'), c('7')])).toBe('loss');
    expect(determineOutcome([c('10'), c('8')], [c('10'), c('8'), c('6')])).toBe('win');
    expect(determineOutcome([c('10'), c('8')], [c('9'), c('9')])).toBe('push');
    expect(determineOutcome([c('A'), c('K')], [c('10'), c('9')])).toBe('blackjack');
  });

  it('does not pay split 21 as natural blackjack', () => {
    expect(determineOutcome([c('A'), c('K')], [c('10'), c('9')], true)).toBe('win');
  });

  it('calculates 3:2 blackjack, 1:1 win, push, and loss returns', () => {
    expect(payoutFor('blackjack', 20)).toBe(50);
    expect(payoutFor('win', 20)).toBe(40);
    expect(payoutFor('push', 20)).toBe(20);
    expect(payoutFor('loss', 20)).toBe(0);
  });
});
