import { DEFAULT_CHIPS } from '../config/constants';
import type { PlayerProfile } from '../types/profile';
import type { HandResult } from './types';

export function reserveStake(profile: PlayerProfile, amount: number): PlayerProfile {
  if (!Number.isFinite(amount) || amount <= 0) throw new RangeError('Stake must be a positive number.');
  if (amount > profile.chips) throw new RangeError('Not enough practice chips for that stake.');

  return { ...profile, chips: profile.chips - amount };
}

export function settleResults(profile: PlayerProfile, results: readonly HandResult[]): PlayerProfile {
  if (results.length === 0) return profile;

  const stats = { ...profile.stats };
  let returned = 0;

  for (const result of results) {
    returned += result.returned;
    stats.totalHands += 1;

    switch (result.outcome) {
      case 'blackjack':
        stats.blackjacks += 1;
        stats.wins += 1;
        break;
      case 'win':
        stats.wins += 1;
        break;
      case 'loss':
        stats.losses += 1;
        break;
      case 'push':
        stats.pushes += 1;
        break;
    }
  }

  return {
    ...profile,
    chips: profile.chips + returned,
    stats,
  };
}

export function refillPracticeChips(profile: PlayerProfile): PlayerProfile {
  return profile.chips > 0 ? profile : { ...profile, chips: DEFAULT_CHIPS };
}
