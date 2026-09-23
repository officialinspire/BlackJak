import { describe, expect, it } from 'vitest';
import {
  applyProgression,
  calculateRepReward,
  emptyRoundProgressionContext,
  titleForRep,
  unlockAchievementIds,
  type Card,
  type RoundState,
} from '../src/game';
import { defaultProfile } from '../src/storage/profile';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

const resolvedRound = (overrides: Partial<RoundState> = {}): RoundState => ({
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
  ...overrides,
});

describe('REP rewards', () => {
  it('awards 50 REP for a normal win', () => {
    expect(calculateRepReward(resolvedRound(), emptyRoundProgressionContext())).toBe(50);
  });

  it('awards 150 REP for a successful double', () => {
    const round = resolvedRound();
    round.hands[0].doubled = true;
    expect(calculateRepReward(round, emptyRoundProgressionContext())).toBe(150);
  });

  it('stacks five-card and risky-hit bonuses', () => {
    const round = resolvedRound();
    round.hands[0].cards = [c('2'), c('3'), c('4'), c('5'), c('6')];
    expect(calculateRepReward(round, { hitOn20: false, riskyHitSurvived: true })).toBe(225);
  });
});

describe('achievements and progression', () => {
  it('unlocks hit-on-20 and keeps unlocks idempotent', () => {
    const first = unlockAchievementIds(defaultProfile(), ['why-would-you-do-that']);
    expect(first.unlocked).toHaveLength(1);
    const second = unlockAchievementIds(first.profile, ['why-would-you-do-that']);
    expect(second.unlocked).toHaveLength(0);
  });

  it('unlocks natural blackjack and JAKPOT on the third blackjack in ten hands', () => {
    let profile = defaultProfile();

    for (let index = 0; index < 3; index += 1) {
      const round = resolvedRound({
        dealer: [c('10'), c('9')],
        hands: [{
          id: 'hand-1',
          cards: [c('A'), c('K')],
          wager: 20,
          status: 'resolved',
          doubled: false,
          fromSplit: false,
        }],
        results: [{ handId: 'hand-1', outcome: 'blackjack', wager: 20, returned: 50, net: 30 }],
      });
      profile = applyProgression(profile, round, emptyRoundProgressionContext()).profile;
    }

    expect(profile.progression.unlockedAchievements).toContain('blackjak');
    expect(profile.progression.unlockedAchievements).toContain('jakpot');
  });

  it('unlocks ABSOLUTE BULLSHII when dealer reaches 21 with five cards', () => {
    const round = resolvedRound({ dealer: [c('2'), c('3'), c('4'), c('5'), c('7')] });
    const update = applyProgression(defaultProfile(), round, emptyRoundProgressionContext());
    expect(update.profile.progression.unlockedAchievements).toContain('absolute-bullshii');
  });

  it('tracks persistent win and loss streak state', () => {
    const first = applyProgression(defaultProfile(), resolvedRound(), emptyRoundProgressionContext());
    expect(first.profile.progression.currentWinStreak).toBe(1);

    const lossRound = resolvedRound({
      results: [{ handId: 'hand-1', outcome: 'loss', wager: 25, returned: 0, net: -25 }],
    });
    const second = applyProgression(first.profile, lossRound, emptyRoundProgressionContext());
    expect(second.profile.progression.currentWinStreak).toBe(0);
    expect(second.profile.progression.currentLossStreak).toBe(1);
  });
});

describe('titles', () => {
  it('advances titles by REP threshold', () => {
    expect(titleForRep(0).name).toBe('Table Scrub');
    expect(titleForRep(750).name).toBe('Bad Influence');
    expect(titleForRep(12000).name).toBe('BlackJak');
  });
});
