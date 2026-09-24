import { describe, expect, it } from 'vitest';
import { MAX_PLAYER_HANDS, allowedActions, performAction, startRound, type Card } from '../src/game';

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

  it('automatically stands a split-created 21 and advances to the active hand', () => {
    const state = startRound(25, undefined, deckFor(c('10'), c('6'), c('10'), c('10'), c('A'), c('2')));
    performAction(state, 'split', 100);

    expect(state.hands[0]).toMatchObject({ status: 'stood', fromSplit: true });
    expect(state.hands[1].status).toBe('active');
    expect(state.activeHandIndex).toBe(1);
  });

  it('resolves when every split hand is dealt 21 and pays each as a 1:1 win', () => {
    const state = startRound(20, undefined, deckFor(c('A'), c('6'), c('A'), c('10'), c('K'), c('Q'), c('2')));
    performAction(state, 'split', 100);

    expect(state.phase).toBe('resolved');
    expect(state.hands).toHaveLength(2);
    expect(state.results).toEqual([
      { handId: 'hand-1', outcome: 'win', wager: 20, returned: 40, net: 20 },
      { handId: 'hand-2', outcome: 'win', wager: 20, returned: 40, net: 20 },
    ]);
  });

  it('caps resplits at four hands while retaining double after split', () => {
    const state = startRound(10, undefined, deckFor(
      c('8'), c('6'), c('8'), c('10'),
      c('8'), c('8'), // first split leaves two splittable pairs
      c('2'), c('3'), // split the first pair
      c('8'), c('8'), // split the remaining pair into two pairs
      c('10'), c('2'), c('3'), c('4'),
    ));

    performAction(state, 'split', 100);
    performAction(state, 'split', 100);
    expect(allowedActions(state.hands[0], 100, state.hands.length)).toContain('double');
    performAction(state, 'stand');
    performAction(state, 'stand');
    performAction(state, 'split', 100);

    expect(state.hands).toHaveLength(MAX_PLAYER_HANDS);
    expect(allowedActions(state.hands[state.activeHandIndex], 100, state.hands.length)).not.toContain('split');
    expect(() => performAction(state, 'split', 100)).toThrow('not currently allowed');
    expect(state.hands).toHaveLength(MAX_PLAYER_HANDS);
  });

  it('does not partially mutate a hand when a supplied deck cannot complete a split', () => {
    const state = startRound(25, undefined, deckFor(c('8'), c('10'), c('8'), c('7'), c('2')));
    const before = structuredClone(state);
    expect(() => performAction(state, 'split', 100)).toThrow('two cards remaining');
    expect(state).toEqual(before);
  });

  it('skips dealer draws when every split hand busts', () => {
    const state = startRound(25, undefined, deckFor(c('10'), c('6'), c('10'), c('9'), c('5'), c('4'), c('K'), c('Q')));
    performAction(state, 'split', 100);
    performAction(state, 'hit');
    performAction(state, 'hit');
    expect(state.phase).toBe('resolved');
    expect(state.dealer).toHaveLength(2);
    expect(state.results.every((result) => result.outcome === 'loss')).toBe(true);
  });

  it('resolves dealer natural against a regular hand and pushes matching naturals', () => {
    const dealerNatural = startRound(25, undefined, deckFor(c('10'), c('A'), c('9'), c('K')));
    expect(dealerNatural.results[0].outcome).toBe('loss');

    const bothNatural = startRound(25, undefined, deckFor(c('A'), c('A'), c('K'), c('K')));
    expect(bothNatural.results[0].outcome).toBe('push');
  });
});
