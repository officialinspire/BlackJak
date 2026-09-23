import { describe, expect, it } from 'vitest';
import { performAction, startRound, type Card } from '../src/game';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

// drawCard pops from the end, so arrays below are written in reverse draw order.
const deckFor = (...drawOrder: Card[]): Card[] => [...drawOrder].reverse();

describe('round state machine', () => {
  it('deals player/dealer alternating and enters player turn', () => {
    const state = startRound(25, undefined, deckFor(c('10'), c('6'), c('8'), c('9')));
    expect(state.hands[0].cards.map((card) => card.rank)).toEqual(['10', '8']);
    expect(state.dealer.map((card) => card.rank)).toEqual(['6', '9']);
    expect(state.phase).toBe('player-turn');
  });

  it('auto-resolves natural blackjack', () => {
    const state = startRound(20, undefined, deckFor(c('A'), c('9'), c('K'), c('8')));
    expect(state.phase).toBe('resolved');
    expect(state.results[0]).toMatchObject({ outcome: 'blackjack', returned: 50, net: 30 });
  });

  it('hits then resolves a bust without dealer drawing', () => {
    const state = startRound(25, undefined, deckFor(c('10'), c('6'), c('8'), c('9'), c('9')));
    performAction(state, 'hit');
    expect(state.phase).toBe('resolved');
    expect(state.results[0].outcome).toBe('loss');
    expect(state.dealer).toHaveLength(2);
  });

  it('stands and lets dealer draw to at least 17', () => {
    const state = startRound(25, undefined, deckFor(c('10'), c('6'), c('8'), c('9'), c('2')));
    performAction(state, 'stand');
    expect(state.phase).toBe('resolved');
    expect(state.dealer.map((card) => card.rank)).toEqual(['6', '9', '2']);
  });

  it('doubles wager, draws exactly one card, then resolves', () => {
    const state = startRound(25, undefined, deckFor(c('5'), c('10'), c('6'), c('7'), c('10')));
    performAction(state, 'double', 100);
    expect(state.hands[0].wager).toBe(50);
    expect(state.hands[0].cards).toHaveLength(3);
    expect(state.hands[0].doubled).toBe(true);
    expect(state.phase).toBe('resolved');
  });

  it('splits equal-value cards into independently resolvable hands', () => {
    const state = startRound(25, undefined, deckFor(c('8'), c('6'), c('8'), c('10'), c('2'), c('3'), c('10'), c('2')));
    performAction(state, 'split', 100);
    expect(state.hands).toHaveLength(2);
    expect(state.hands[0].cards.map((card) => card.rank)).toEqual(['8', '2']);
    expect(state.hands[1].cards.map((card) => card.rank)).toEqual(['8', '3']);
    performAction(state, 'stand');
    expect(state.activeHandIndex).toBe(1);
    performAction(state, 'stand');
    expect(state.phase).toBe('resolved');
    expect(state.results).toHaveLength(2);
  });
});
