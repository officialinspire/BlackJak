import { ACHIEVEMENTS, achievementById, type AchievementDefinition } from '../data/progression';
import type { AchievementId, PlayerProfile, ProgressionState } from '../types/profile';
import { evaluateHand } from './hand';
import type { RoundState } from './types';

export interface RoundProgressionContext {
  hitOn20: boolean;
  riskyHitSurvived: boolean;
  riskyHits?: number;
  doublesAttempted?: number;
  splitsAttempted?: number;
}

export interface ProgressionUpdate {
  profile: PlayerProfile;
  repEarned: number;
  unlocked: AchievementDefinition[];
}

export const emptyRoundProgressionContext = (): RoundProgressionContext => ({
  hitOn20: false,
  riskyHitSurvived: false,
  riskyHits: 0,
  doublesAttempted: 0,
  splitsAttempted: 0,
});

function cloneProgression(progression: ProgressionState): ProgressionState {
  return {
    unlockedAchievements: [...progression.unlockedAchievements],
    currentWinStreak: progression.currentWinStreak,
    currentLossStreak: progression.currentLossStreak,
    recentBlackjackHands: [...progression.recentBlackjackHands],
  };
}

function isWinningOutcome(outcome: string): boolean {
  return outcome === 'win' || outcome === 'blackjack';
}

export function calculateRepReward(round: RoundState, context: RoundProgressionContext): number {
  let rep = 0;

  for (const result of round.results) {
    const hand = round.hands.find((candidate) => candidate.id === result.handId);
    if (!hand) continue;

    if (result.outcome === 'blackjack') {
      rep += 100;
    } else if (result.outcome === 'win') {
      rep += hand.doubled ? 150 : 50;
      if (hand.cards.length >= 5) rep += 100;
    }
  }

  const splitSweep =
    round.hands.length > 1 &&
    round.results.length === round.hands.length &&
    round.results.every((result) => isWinningOutcome(result.outcome));

  if (splitSweep) rep += 150;
  if (context.riskyHitSurvived) rep += 75;

  return rep;
}

export function unlockAchievementIds(
  profile: PlayerProfile,
  ids: readonly AchievementId[],
): { profile: PlayerProfile; unlocked: AchievementDefinition[] } {
  const existing = new Set(profile.progression.unlockedAchievements);
  const newlyUnlocked = ids.filter((id) => !existing.has(id));

  if (newlyUnlocked.length === 0) return { profile, unlocked: [] };

  const progression = cloneProgression(profile.progression);
  progression.unlockedAchievements.push(...newlyUnlocked);

  return {
    profile: { ...profile, progression },
    unlocked: newlyUnlocked.map(achievementById),
  };
}

export function applyRepBonus(profile: PlayerProfile, amount: number): PlayerProfile {
  const safe = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
  if (safe === 0) return profile;

  return {
    ...profile,
    rep: profile.rep + safe,
    stats: {
      ...profile.stats,
      lifetimeRep: profile.stats.lifetimeRep + safe,
    },
  };
}

export function applyProgression(
  settledProfile: PlayerProfile,
  round: RoundState,
  context: RoundProgressionContext,
): ProgressionUpdate {
  const progression = cloneProgression(settledProfile.progression);
  const allWins = round.results.length > 0 && round.results.every((result) => isWinningOutcome(result.outcome));
  const allLosses = round.results.length > 0 && round.results.every((result) => result.outcome === 'loss');

  if (allWins) {
    progression.currentWinStreak += 1;
    progression.currentLossStreak = 0;
  } else if (allLosses) {
    progression.currentLossStreak += 1;
    progression.currentWinStreak = 0;
  } else {
    progression.currentWinStreak = 0;
    progression.currentLossStreak = 0;
  }

  const blackjackFlags = round.results.map((result) => result.outcome === 'blackjack');
  progression.recentBlackjackHands = [...progression.recentBlackjackHands, ...blackjackFlags].slice(-10);

  const repEarned = calculateRepReward(round, context);
  const splitSweep =
    round.hands.length > 1 &&
    round.results.length === round.hands.length &&
    round.results.every((result) => isWinningOutcome(result.outcome));

  const stats = { ...settledProfile.stats };
  stats.doublesAttempted += context.doublesAttempted ?? 0;
  stats.splitsAttempted += context.splitsAttempted ?? 0;
  stats.riskyHits += context.riskyHits ?? 0;
  stats.doublesWon += round.hands.filter((hand) => {
    const result = round.results.find((candidate) => candidate.handId === hand.id);
    return hand.doubled && result ? isWinningOutcome(result.outcome) : false;
  }).length;
  if (splitSweep) stats.splitSweeps += 1;
  stats.busts += round.hands.filter((hand) => evaluateHand(hand.cards).isBust).length;
  stats.fiveCardWins += round.hands.filter((hand) => {
    const result = round.results.find((candidate) => candidate.handId === hand.id);
    return hand.cards.length >= 5 && result?.outcome === 'win';
  }).length;
  stats.longestWinStreak = Math.max(stats.longestWinStreak, progression.currentWinStreak);
  stats.longestLossStreak = Math.max(stats.longestLossStreak, progression.currentLossStreak);
  stats.highestChipBalance = Math.max(stats.highestChipBalance, settledProfile.chips);
  stats.lifetimeRep += repEarned;

  let nextProfile: PlayerProfile = {
    ...settledProfile,
    rep: settledProfile.rep + repEarned,
    stats,
    progression,
  };

  const candidates: AchievementId[] = [];

  if (round.results.some((result) => result.outcome === 'blackjack')) candidates.push('blackjak');
  if (context.hitOn20) candidates.push('why-would-you-do-that');
  if (splitSweep) candidates.push('split-personality');
  if (nextProfile.stats.wins >= 10) candidates.push('golden-boy');
  if (nextProfile.chips >= 5000) candidates.push('house-money');
  if (nextProfile.stats.totalHands >= 100) candidates.push('i-can-quit-anytime');
  if (progression.recentBlackjackHands.filter(Boolean).length >= 3) candidates.push('jakpot');

  const dealer = evaluateHand(round.dealer);
  if (round.dealer.length >= 5 && dealer.total === 21) candidates.push('absolute-bullshii');

  const unlocked = unlockAchievementIds(nextProfile, candidates);
  nextProfile = unlocked.profile;

  return {
    profile: nextProfile,
    repEarned,
    unlocked: unlocked.unlocked,
  };
}

export function allAchievements(): readonly AchievementDefinition[] {
  return ACHIEVEMENTS;
}

export { titleForRep, titleProgressForRep } from '../data/progression';
