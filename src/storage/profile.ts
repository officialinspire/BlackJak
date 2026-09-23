import { DEFAULT_CHIPS, DEFAULT_REP } from '../config/constants';
import { isAchievementId } from '../data/progression';
import type { ClassicStats, DailyState, PlayerProfile, ProgressionState } from '../types/profile';
import { storage } from './storage';

const PROFILE_KEY = 'profile';

export const defaultStats = (): ClassicStats => ({
  totalHands: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  doublesAttempted: 0,
  doublesWon: 0,
  splitsAttempted: 0,
  splitSweeps: 0,
  busts: 0,
  longestWinStreak: 0,
  longestLossStreak: 0,
  highestChipBalance: DEFAULT_CHIPS,
  lifetimeRep: 0,
  riskyHits: 0,
  fiveCardWins: 0,
});

export const defaultProgression = (): ProgressionState => ({
  unlockedAchievements: [],
  currentWinStreak: 0,
  currentLossStreak: 0,
  recentBlackjackHands: [],
});

export const defaultDaily = (): DailyState => ({
  dateKey: null,
  completed: false,
  outcome: null,
  rewardClaimed: false,
  currentStreak: 0,
  lastCompletedDate: null,
});

export const defaultProfile = (): PlayerProfile => ({
  chips: DEFAULT_CHIPS,
  rep: DEFAULT_REP,
  stats: defaultStats(),
  progression: defaultProgression(),
  daily: defaultDaily(),
});

const safeCount = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const safeString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export function loadProfile(): PlayerProfile {
  const fallback = defaultProfile();
  const stored = storage.get<Partial<PlayerProfile> | null>(PROFILE_KEY, null);
  if (!stored) return fallback;

  const storedProgression = stored.progression;
  const storedDaily = stored.daily;
  const stats = stored.stats;

  return {
    chips: safeCount(stored.chips, fallback.chips),
    rep: safeCount(stored.rep, fallback.rep),
    stats: {
      totalHands: safeCount(stats?.totalHands),
      wins: safeCount(stats?.wins),
      losses: safeCount(stats?.losses),
      pushes: safeCount(stats?.pushes),
      blackjacks: safeCount(stats?.blackjacks),
      doublesAttempted: safeCount(stats?.doublesAttempted),
      doublesWon: safeCount(stats?.doublesWon),
      splitsAttempted: safeCount(stats?.splitsAttempted),
      splitSweeps: safeCount(stats?.splitSweeps),
      busts: safeCount(stats?.busts),
      longestWinStreak: safeCount(stats?.longestWinStreak),
      longestLossStreak: safeCount(stats?.longestLossStreak),
      highestChipBalance: safeCount(stats?.highestChipBalance, Math.max(fallback.stats.highestChipBalance, safeCount(stored.chips, fallback.chips))),
      lifetimeRep: safeCount(stats?.lifetimeRep, safeCount(stored.rep)),
      riskyHits: safeCount(stats?.riskyHits),
      fiveCardWins: safeCount(stats?.fiveCardWins),
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
    daily: {
      dateKey: safeString(storedDaily?.dateKey),
      completed: storedDaily?.completed === true,
      outcome: storedDaily?.outcome === 'blackjack' || storedDaily?.outcome === 'win' || storedDaily?.outcome === 'loss' || storedDaily?.outcome === 'push'
        ? storedDaily.outcome
        : null,
      rewardClaimed: storedDaily?.rewardClaimed === true,
      currentStreak: safeCount(storedDaily?.currentStreak),
      lastCompletedDate: safeString(storedDaily?.lastCompletedDate),
    },
  };
}

export function saveProfile(profile: PlayerProfile): void {
  storage.set(PROFILE_KEY, profile);
}
