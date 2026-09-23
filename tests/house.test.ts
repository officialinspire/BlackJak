import { describe, expect, it } from 'vitest';
import {
  completeHouseRound,
  createHouseState,
  hotHandMultiplier,
  isGoldCard,
  replayHouseRound,
  startHouseRound,
  startRound,
  type Card,
  type RoundState,
} from '../src/game';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
const deckFor = (...drawOrder: Card[]): Card[] => [...drawOrder].reverse();

function resolvedWin(): RoundState {
  return {
    phase: 'resolved',
    deck: [],
    dealer: [c('10'), c('8')],
    hands: [{
      id: 'hand-1',
      cards: [c('10'), c('10')],
      wager: 25,
      status: 'resolved',
      doubled: false,
      fromSplit: false,
    }],
    activeHandIndex: 0,
    results: [{ handId: 'hand-1', outcome: 'win', wager: 25, returned: 50, net: 25 }],
  };
}

function resolvedLoss(): RoundState {
  const round = resolvedWin();
  round.results = [{ handId: 'hand-1', outcome: 'loss', wager: 25, returned: 0, net: -25 }];
  return round;
}

describe("Jak's House modifiers", () => {
  it('keeps Classic startRound unchanged while Gold Card only affects every third House hand', () => {
    const supplied = deckFor(c('9'), c('6'), c('7'), c('10'));

    const classic = startRound(25, undefined, supplied);
    expect(classic.hands[0].cards[0].rank).toBe('9');

    let house = createHouseState();
    house = startHouseRound(25, house, undefined, supplied).house;
    house = startHouseRound(25, house, undefined, supplied).house;
    const third = startHouseRound(25, house, undefined, supplied);

    expect(third.house.roundNumber).toBe(3);
    expect(third.house.goldRound).toBe(true);
    expect(third.round.hands[0].cards[0].rank).toBe('A');
    expect(isGoldCard(third.house, third.round.hands[0].id, 0)).toBe(true);
  });

  it('starts a House session with one Run It Back token', () => {
    expect(createHouseState().runItBackTokens).toBe(1);
  });

  it('offers Run It Back after a net loss and consumes the token without incrementing round number', () => {
    let house = createHouseState();
    const started = startHouseRound(25, house, undefined, deckFor(c('10'), c('9'), c('7'), c('8')));
    house = completeHouseRound(started.house, resolvedLoss(), 0).house;
    expect(house.replayAvailable).toBe(true);

    const replay = replayHouseRound(house, undefined, deckFor(c('10'), c('6'), c('8'), c('9')));
    expect(replay.house.runItBackTokens).toBe(0);
    expect(replay.house.roundNumber).toBe(started.house.roundNumber);
    expect(replay.house.currentStake).toBe(25);
  });

  it('earns another Run It Back token after five completed House rounds while empty', () => {
    let house = { ...createHouseState(), runItBackTokens: 0 };
    let awarded = false;
    for (let index = 0; index < 5; index += 1) {
      const result = completeHouseRound(house, resolvedWin(), 50);
      house = result.house;
      awarded = result.tokenAwarded;
    }
    expect(house.runItBackTokens).toBe(1);
    expect(awarded).toBe(true);
  });

  it('builds Hot Hand REP multiplier only across consecutive all-winning House rounds', () => {
    expect(hotHandMultiplier(1)).toBe(1);
    expect(hotHandMultiplier(2)).toBe(1.25);
    expect(hotHandMultiplier(5)).toBe(2);
    expect(hotHandMultiplier(12)).toBe(2);

    const first = completeHouseRound(createHouseState(), resolvedWin(), 100);
    expect(first.hotHandBonusRep).toBe(0);

    const second = completeHouseRound(first.house, resolvedWin(), 100);
    expect(second.hotHandMultiplier).toBe(1.25);
    expect(second.hotHandBonusRep).toBe(25);

    const reset = completeHouseRound(second.house, resolvedLoss(), 0);
    expect(reset.house.hotHandStreak).toBe(0);
  });
});
