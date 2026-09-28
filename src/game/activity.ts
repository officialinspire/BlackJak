import type { AchievementDefinition } from '../data/progression';
import type { AchievementId, ActivityState, DailyOutcome, PlayerProfile } from '../types/profile';
import { unlockAchievementIds } from './progression';

/*
 * Achievements earned outside a single hand: daily and weekly visit streaks,
 * Daily Hand completions, the chip refill, deck themes, and the Jak's House
 * Hot Hand cap. Every function is pure and returns the updated profile plus
 * what it unlocked, so callers decide when to save and toast.
 */

export interface ActivityUpdate {
  profile: PlayerProfile;
  unlocked: AchievementDefinition[];
}

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 for a local YYYY-MM-DD key, or NaN when malformed. */
export function dayNumber(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return Number.NaN;
  return Math.round(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

/** Monday-based week index (1970-01-01 was a Thursday, so shift by 3 days). */
export function weekNumber(dateKey: string): number {
  const day = dayNumber(dateKey);
  return Number.isFinite(day) ? Math.floor((day + 3) / 7) : Number.NaN;
}

const VISIT_ACHIEVEMENTS: readonly { id: AchievementId; met: (activity: ActivityState) => boolean }[] = [
  { id: 'back-again', met: (activity) => activity.visitStreak >= 3 },
  { id: 'creature-of-habit', met: (activity) => activity.visitStreak >= 7 },
  { id: 'part-of-the-furniture', met: (activity) => activity.visitStreak >= 30 },
  { id: 'weekly-regular', met: (activity) => activity.weekStreak >= 4 },
  { id: 'season-ticket', met: (activity) => activity.weekStreak >= 12 },
  { id: 'loyalty-program', met: (activity) => activity.visitStreak >= 60 },
  { id: 'permanent-resident', met: (activity) => activity.visitStreak >= 100 },
  { id: 'half-year-habit', met: (activity) => activity.weekStreak >= 26 },
  { id: 'anniversary', met: (activity) => activity.weekStreak >= 52 },
  { id: 'frequent-flyer', met: (activity) => activity.daysVisited >= 30 },
];

/**
 * Logs a visit on `dateKey`. The first visit of a day extends or restarts the
 * daily streak, and the first of a week does the same for the weekly streak.
 * Repeat visits on the same day change nothing.
 */
export function recordVisit(profile: PlayerProfile, dateKey: string): ActivityUpdate {
  const today = dayNumber(dateKey);
  const previous = profile.activity.lastVisitDate;
  if (!Number.isFinite(today) || previous === dateKey) return { profile, unlocked: [] };

  const previousDay = previous ? dayNumber(previous) : Number.NaN;
  // A clock moved backwards is not a new day.
  if (Number.isFinite(previousDay) && today < previousDay) return { profile, unlocked: [] };

  const week = weekNumber(dateKey);
  const current = profile.activity;
  const visitStreak = today - previousDay === 1 ? current.visitStreak + 1 : 1;
  const newWeek = current.lastVisitWeek !== week;
  const weekStreak = !newWeek
    ? Math.max(1, current.weekStreak)
    : current.lastVisitWeek !== null && week - current.lastVisitWeek === 1
      ? current.weekStreak + 1
      : 1;

  const activity: ActivityState = {
    ...current,
    lastVisitDate: dateKey,
    visitStreak,
    longestVisitStreak: Math.max(current.longestVisitStreak, visitStreak),
    daysVisited: current.daysVisited + 1,
    lastVisitWeek: week,
    weekStreak,
    longestWeekStreak: Math.max(current.longestWeekStreak, weekStreak),
  };

  const ids = VISIT_ACHIEVEMENTS.filter((entry) => entry.met(activity)).map((entry) => entry.id);
  return unlockAchievementIds({ ...profile, activity }, ids);
}

/** Counts a finished Daily Hand (call after the day's result is saved). */
export function recordDailyHand(profile: PlayerProfile, outcome: DailyOutcome): ActivityUpdate {
  const won = outcome === 'win' || outcome === 'blackjack';
  const activity: ActivityState = {
    ...profile.activity,
    dailyHandsCompleted: profile.activity.dailyHandsCompleted + 1,
    dailyWins: profile.activity.dailyWins + (won ? 1 : 0),
  };
  const ids: AchievementId[] = ['daily-dose'];
  if (profile.daily.currentStreak >= 7) ids.push('same-problem');
  if (profile.daily.currentStreak >= 30) ids.push('all-month');
  if (activity.dailyWins >= 10) ids.push('daily-grind');
  if (activity.dailyWins >= 50) ids.push('daily-domination');
  if (activity.dailyHandsCompleted >= 25) ids.push('daily-regular');
  if (outcome === 'blackjack') ids.push('daily-natural');
  if (outcome === 'loss') ids.push('no-solution');
  return unlockAchievementIds({ ...profile, activity }, ids);
}

/** Remembers a card deck theme; trying `totalDecks` distinct decks unlocks FASHION VICTIM. */
export function recordDeckTried(profile: PlayerProfile, theme: string, totalDecks: number): ActivityUpdate {
  const known = profile.activity.decksTried.includes(theme);
  const decksTried = known ? profile.activity.decksTried : [...profile.activity.decksTried, theme];
  const next = known ? profile : { ...profile, activity: { ...profile.activity, decksTried } };
  return unlockAchievementIds(next, decksTried.length >= totalDecks ? ['fashion-victim'] : []);
}

/** Peak-chip and REP ladders. */
export const CHIP_MILESTONES: readonly (readonly [AchievementId, number])[] = [
  ['chips-25k', 25_000],
  ['chips-50k', 50_000],
  ['chips-100k', 100_000],
  ['chips-250k', 250_000],
  ['chips-1m', 1_000_000],
];

export const REP_MILESTONES: readonly (readonly [AchievementId, number])[] = [
  ['rep-25k', 25_000],
  ['rep-50k', 50_000],
  ['rep-100k', 100_000],
  ['rep-250k', 250_000],
  ['rep-1m', 1_000_000],
];

/**
 * Chip and REP ladders. REP also grows outside a hand (Daily Hand, House
 * bonus), so this runs after every change to either, and at startup so
 * balances earned before these achievements existed are credited.
 */
export function recordMilestones(profile: PlayerProfile): ActivityUpdate {
  const peakChips = Math.max(profile.chips, profile.stats.highestChipBalance);
  const rep = Math.max(profile.rep, profile.stats.lifetimeRep);
  const ids = [
    ...CHIP_MILESTONES.filter(([, target]) => peakChips >= target),
    ...REP_MILESTONES.filter(([, target]) => rep >= target),
  ].map(([id]) => id);
  return unlockAchievementIds(profile, ids);
}

/** The refill is only offered at zero chips, so taking it is the whole joke. */
export function recordRefill(profile: PlayerProfile): ActivityUpdate {
  return unlockAchievementIds(profile, ['responsible-gambling']);
}

/** Hot Hand caps at 2× on the fifth consecutive all-winning House round. */
export const MAX_HEAT_STREAK = 5;

export function recordHotHand(profile: PlayerProfile, hotHandStreak: number): ActivityUpdate {
  return unlockAchievementIds(profile, hotHandStreak >= MAX_HEAT_STREAK ? ['maximum-heat'] : []);
}

export interface AchievementProgress {
  current: number;
  target: number;
}

/** Progress toward count-based achievements, for the logbook's locked entries. */
export function achievementProgress(profile: PlayerProfile): Partial<Record<AchievementId, AchievementProgress>> {
  const { stats, activity, daily } = profile;
  const progress = (current: number, target: number): AchievementProgress => ({ current: Math.min(current, target), target });
  return {
    'golden-boy': progress(stats.wins, 10),
    'house-money': progress(stats.highestChipBalance, 5000),
    'i-can-quit-anytime': progress(stats.totalHands, 100),
    'professional-degenerate': progress(stats.wins, 100),
    'natural-talent': progress(stats.blackjacks, 10),
    'high-roller': progress(stats.highestChipBalance, 10_000),
    'house-guest': progress(activity.houseRounds, 25),
    'this-is-fine': progress(stats.totalHands, 500),
    'double-or-nothing': progress(stats.doublesWon, 10),
    'on-fire': progress(stats.longestWinStreak, 5),
    untouchable: progress(stats.longestWinStreak, 10),
    'back-again': progress(activity.visitStreak, 3),
    'creature-of-habit': progress(activity.visitStreak, 7),
    'part-of-the-furniture': progress(activity.visitStreak, 30),
    'weekly-regular': progress(activity.weekStreak, 4),
    'season-ticket': progress(activity.weekStreak, 12),
    'same-problem': progress(daily.currentStreak, 7),
    'daily-grind': progress(activity.dailyWins, 10),
    'rock-bottom': progress(stats.longestLossStreak, 10),
    'fashion-victim': progress(activity.decksTried.length, 3),
    ...Object.fromEntries(CHIP_MILESTONES.map(([id, target]) => [id, progress(Math.max(profile.chips, stats.highestChipBalance), target)])),
    ...Object.fromEntries(REP_MILESTONES.map(([id, target]) => [id, progress(Math.max(profile.rep, stats.lifetimeRep), target)])),
    'hands-1000': progress(stats.totalHands, 1000),
    'hands-5000': progress(stats.totalHands, 5000),
    'wins-500': progress(stats.wins, 500),
    'wins-1000': progress(stats.wins, 1000),
    'naturals-50': progress(stats.blackjacks, 50),
    'naturals-100': progress(stats.blackjacks, 100),
    'house-regular': progress(activity.houseRounds, 100),
    unstoppable: progress(stats.longestWinStreak, 15),
    'double-down-devotee': progress(stats.doublesWon, 25),
    'split-decision': progress(stats.splitSweeps, 5),
    'charlies-angel': progress(stats.fiveCardWins, 5),
    'loyalty-program': progress(activity.visitStreak, 60),
    'permanent-resident': progress(activity.visitStreak, 100),
    'half-year-habit': progress(activity.weekStreak, 26),
    anniversary: progress(activity.weekStreak, 52),
    'frequent-flyer': progress(activity.daysVisited, 30),
    'all-month': progress(daily.currentStreak, 30),
    'daily-regular': progress(activity.dailyHandsCompleted, 25),
    'daily-domination': progress(activity.dailyWins, 50),
    stalemate: progress(stats.pushes, 25),
    'live-dangerously': progress(stats.riskyHits, 50),
    'gravity-wins': progress(stats.busts, 100),
    'down-bad': progress(stats.longestLossStreak, 20),
  };
}
