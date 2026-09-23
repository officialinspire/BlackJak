import { describe, expect, it } from 'vitest';
import { applyProgression, emptyRoundProgressionContext, type Card, type RoundState } from '../src/game';
import { defaultProfile } from '../src/storage/profile';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

const round = (): RoundState => ({
  phase: 'resolved',
  deck: [],
  dealer: [c('10'), c('8')],
  hands: [{
    id: 'hand-1',
    cards: [c('2'), c('3'), c('4'), c('5'), c('6')],
    wager: 25,
    status: 'resolved',
    doubled: true,
    fromSplit: false,
  }],
  activeHandIndex: 0,
  results: [{ handId: 'hand-1', outcome: 'win', wager: 50, returned: 100, net: 50 }],
});

describe('expanded statistics', () => {
  it('tracks action, outcome, streak, balance, and lifetime REP facts', () => {
    const profile = { ...defaultProfile(), chips: 1500 };
    const update = applyProgression(profile, round(), {
      ...emptyRoundProgressionContext(),
      riskyHitSurvived: true,
      riskyHits: 1,
      doublesAttempted: 1,
    });

    expect(update.profile.stats.doublesAttempted).toBe(1);
    expect(update.profile.stats.doublesWon).toBe(1);
    expect(update.profile.stats.riskyHits).toBe(1);
    expect(update.profile.stats.fiveCardWins).toBe(1);
    expect(update.profile.stats.longestWinStreak).toBe(1);
    expect(update.profile.stats.highestChipBalance).toBe(1500);
    expect(update.profile.stats.lifetimeRep).toBe(update.repEarned);
  });
});
