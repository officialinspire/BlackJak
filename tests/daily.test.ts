import { describe, expect, it } from 'vitest';
import {
  completeDailyChallenge,
  createDailyChallenge,
  dailyShareText,
  localDateKey,
} from '../src/game';
import { defaultProfile } from '../src/storage/profile';

describe('Daily Hand', () => {
  it('generates the same challenge for the same date/version', () => {
    const first = createDailyChallenge('2026-09-23');
    const second = createDailyChallenge('2026-09-23');
    expect(first.seed).toBe(second.seed);
    expect(first.round.hands[0].cards).toEqual(second.round.hands[0].cards);
    expect(first.round.dealer[0]).toEqual(second.round.dealer[0]);
  });

  it('generates a player-turn challenge instead of an auto-resolved natural', () => {
    expect(createDailyChallenge('2026-09-23').round.phase).toBe('player-turn');
  });

  it('awards Daily REP only once per date', () => {
    const first = completeDailyChallenge(defaultProfile(), '2026-09-23', 'win');
    expect(first.repAwarded).toBeGreaterThan(0);
    const second = completeDailyChallenge(first.profile, '2026-09-23', 'win');
    expect(second.repAwarded).toBe(0);
    expect(second.profile.rep).toBe(first.profile.rep);
  });

  it('builds a completion streak only across consecutive dates', () => {
    const first = completeDailyChallenge(defaultProfile(), '2026-09-23', 'loss').profile;
    const second = completeDailyChallenge(first, '2026-09-24', 'win').profile;
    expect(second.daily.currentStreak).toBe(2);

    const gap = completeDailyChallenge(second, '2026-09-26', 'push').profile;
    expect(gap.daily.currentStreak).toBe(1);
  });

  it('formats a stable local date key and share text without personal data', () => {
    expect(localDateKey(new Date(2026, 8, 23, 12))).toBe('2026-09-23');
    const completed = completeDailyChallenge(defaultProfile(), '2026-09-23', 'blackjack').profile;
    const text = dailyShareText(completed, '2026-09-23');
    expect(text).toContain('BLACKJAK DAILY HAND');
    expect(text).toContain('BLACKJACK');
  });
});
