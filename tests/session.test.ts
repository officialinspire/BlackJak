import { describe, expect, it } from 'vitest';
import { refillPracticeChips, reserveStake, settleResults, type HandResult } from '../src/game';
import { defaultProfile } from '../src/storage/profile';

describe('Classic BlackJak session economy', () => {
  it('reserves the initial or additional fictional stake', () => {
    const profile = reserveStake(defaultProfile(), 25);
    expect(profile.chips).toBe(975);
  });

  it('rejects invalid or unaffordable stakes', () => {
    expect(() => reserveStake(defaultProfile(), 0)).toThrow();
    expect(() => reserveStake({ ...defaultProfile(), chips: 10 }, 25)).toThrow();
  });

  it('settles split-hand results exactly as returned by the rules engine', () => {
    const afterStakes = { ...defaultProfile(), chips: 950 };
    const results: HandResult[] = [
      { handId: 'hand-1', outcome: 'win', wager: 25, returned: 50, net: 25 },
      { handId: 'hand-2', outcome: 'loss', wager: 25, returned: 0, net: -25 },
    ];
    const settled = settleResults(afterStakes, results);
    expect(settled.chips).toBe(1000);
    expect(settled.stats).toMatchObject({ totalHands: 2, wins: 1, losses: 1, pushes: 0, blackjacks: 0 });
  });

  it('counts a natural blackjack as both a win and blackjack', () => {
    const result: HandResult = { handId: 'hand-1', outcome: 'blackjack', wager: 20, returned: 50, net: 30 };
    const settled = settleResults({ ...defaultProfile(), chips: 980 }, [result]);
    expect(settled.chips).toBe(1030);
    expect(settled.stats).toMatchObject({ totalHands: 1, wins: 1, blackjacks: 1 });
  });

  it('restores the baseline practice stack only when broke', () => {
    expect(refillPracticeChips({ ...defaultProfile(), chips: 0 }).chips).toBe(1000);
    expect(refillPracticeChips({ ...defaultProfile(), chips: 5 }).chips).toBe(5);
  });
});
