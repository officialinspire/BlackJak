import { DEFAULT_CHIPS, DEFAULT_REP } from '../config/constants';
import type { ClassicStats, PlayerProfile } from '../types/profile';
import { storage } from './storage';

const PROFILE_KEY = 'profile';

export const defaultStats = (): ClassicStats => ({
  totalHands: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
});

export const defaultProfile = (): PlayerProfile => ({
  chips: DEFAULT_CHIPS,
  rep: DEFAULT_REP,
  stats: defaultStats(),
});

const safeCount = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

export function loadProfile(): PlayerProfile {
  const fallback = defaultProfile();
  const stored = storage.get<Partial<PlayerProfile> | null>(PROFILE_KEY, null);
  if (!stored) return fallback;

  return {
    chips: safeCount(stored.chips, fallback.chips),
    rep: safeCount(stored.rep, fallback.rep),
    stats: {
      totalHands: safeCount(stored.stats?.totalHands),
      wins: safeCount(stored.stats?.wins),
      losses: safeCount(stored.stats?.losses),
      pushes: safeCount(stored.stats?.pushes),
      blackjacks: safeCount(stored.stats?.blackjacks),
    },
  };
}

export function saveProfile(profile: PlayerProfile): void {
  storage.set(PROFILE_KEY, profile);
}
