import { DEFAULT_CHIPS, DEFAULT_REP } from '../config/constants';
import { isAchievementId } from '../data/progression';
import type { ClassicStats, PlayerProfile, ProgressionState } from '../types/profile';
import { storage } from './storage';

const PROFILE_KEY = 'profile';

export const defaultStats = (): ClassicStats => ({
  totalHands: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
});

export const defaultProgression = (): ProgressionState => ({
  unlockedAchievements: [],
  currentWinStreak: 0,
  currentLossStreak: 0,
  recentBlackjackHands: [],
});

export const defaultProfile = (): PlayerProfile => ({
  chips: DEFAULT_CHIPS,
  rep: DEFAULT_REP,
  stats: defaultStats(),
  progression: defaultProgression(),
});

const safeCount = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

export function loadProfile(): PlayerProfile {
  const fallback = defaultProfile();
  const stored = storage.get<Partial<PlayerProfile> | null>(PROFILE_KEY, null);
  if (!stored) return fallback;

  const storedProgression = stored.progression;

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
    progression: {
      unlockedAchievements: Array.isArray(storedProgression?.unlockedAchievements)
        ? storedProgression.unlockedAchievements.filter(isAchievementId)
        : [],
      currentWinStreak: safeCount(storedProgression?.currentWinStreak),
      currentLossStreak: safeCount(storedProgression?.currentLossStreak),
      recentBlackjackHands: Array.isArray(storedProgression?.recentBlackjackHands)
        ? storedProgression.recentBlackjackHands
            .filter((value): value is boolean => typeof value === 'boolean')
            .slice(-10)
        : [],
    },
  };
}

export function saveProfile(profile: PlayerProfile): void {
  storage.set(PROFILE_KEY, profile);
}
