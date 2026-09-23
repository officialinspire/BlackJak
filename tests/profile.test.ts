import { afterEach, describe, expect, it } from 'vitest';
import { loadProfile } from '../src/storage/profile';
import { storage } from '../src/storage/storage';

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

describe('profile migration', () => {
  it('hydrates progression defaults for a pre-Prompt-5 saved profile', () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });

    storage.set('profile', {
      chips: 1234,
      rep: 0,
      stats: { totalHands: 4, wins: 2, losses: 1, pushes: 1, blackjacks: 0 },
    });

    const profile = loadProfile();
    expect(profile.chips).toBe(1234);
    expect(profile.progression.unlockedAchievements).toEqual([]);
    expect(profile.progression.currentLossStreak).toBe(0);
    expect(profile.progression.recentBlackjackHands).toEqual([]);
  });
});
