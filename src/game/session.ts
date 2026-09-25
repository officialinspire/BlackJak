import { DEFAULT_CHIPS, MAX_STAKE, STAKE_OPTIONS } from '../config/constants';
import type { PlayerProfile } from '../types/profile';
import type { HandResult } from './types';

/**
 * The stake a deal would use: the player's pick when they can afford it,
 * otherwise the largest affordable preset, otherwise everything up to the
 * table max. Pure, so the pick survives chips dipping mid-hand (stakes are
 * reserved while a hand is in play) and applies again once chips recover.
 */
export function effectiveStake(selected: number, chips: number): number {
  if (!Number.isFinite(chips) || chips <= 0) return 0;
  if (Number.isFinite(selected) && selected > 0 && selected <= chips) return selected;
  const affordablePreset = [...STAKE_OPTIONS].reverse().find((stake) => stake <= chips);
  return affordablePreset ?? Math.min(chips, MAX_STAKE);
}

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
