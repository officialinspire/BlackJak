import type { AchievementId } from '../types/profile';

/** Logbook sections: what kind of play earns the achievement. */
export type AchievementCategory = 'gameplay' | 'skill' | 'visits' | 'daily' | 'comedy';

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = ['gameplay', 'skill', 'visits', 'daily', 'comedy'];

export const ACHIEVEMENT_CATEGORY_LABELS: Readonly<Record<AchievementCategory, string>> = {
  gameplay: 'Gameplay',
  skill: 'Skill',
  visits: 'Log-ins',
  daily: 'Daily Hand',
  comedy: 'Comedy',
};

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
}

export interface TitleDefinition {
  name: string;
  minRep: number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'blackjak', name: 'BLACKJAK', description: 'Get your first natural blackjack.', category: 'gameplay' },
  { id: 'why-would-you-do-that', name: 'WHY WOULD YOU DO THAT?', description: 'Hit on 20.', category: 'comedy' },
  { id: 'split-personality', name: 'SPLIT PERSONALITY', description: 'Win both hands after a split.', category: 'skill' },
  { id: 'golden-boy', name: 'GOLDEN BOY', description: 'Win 10 hands.', category: 'gameplay' },
  { id: 'house-money', name: 'HOUSE MONEY', description: 'Reach 5,000 practice chips.', category: 'gameplay' },
  { id: 'i-can-quit-anytime', name: 'I CAN QUIT ANYTIME', description: 'Complete 100 hands.', category: 'gameplay' },
  { id: 'again', name: 'AGAIN.', description: 'Start another hand after a five-loss streak.', category: 'comedy' },
  { id: 'jakpot', name: 'JAKPOT', description: 'Get three natural blackjacks within ten completed hands.', category: 'skill' },
  { id: 'absolute-bullshii', name: 'ABSOLUTE BULLSHII', description: 'Watch the dealer reach 21 with five or more cards.', category: 'comedy' },
  // Gameplay milestones
  { id: 'pull-up-a-chair', name: 'PULL UP A CHAIR', description: 'Complete your first hand.', category: 'gameplay' },
  { id: 'professional-degenerate', name: 'PROFESSIONAL DEGENERATE', description: 'Win 100 hands.', category: 'gameplay' },
  { id: 'natural-talent', name: 'NATURAL TALENT', description: 'Get 10 natural blackjacks.', category: 'gameplay' },
  { id: 'high-roller', name: 'HIGH ROLLER', description: 'Reach 10,000 practice chips.', category: 'gameplay' },
  { id: 'house-guest', name: 'HOUSE GUEST', description: "Complete 25 rounds in Jak's House.", category: 'gameplay' },
  { id: 'this-is-fine', name: 'THIS IS FINE', description: 'Complete 500 hands. Everything is fine.', category: 'gameplay' },
  // Skill
  { id: 'double-trouble', name: 'DOUBLE TROUBLE', description: 'Win a doubled-down hand.', category: 'skill' },
  { id: 'double-or-nothing', name: 'DOUBLE OR NOTHING', description: 'Win 10 doubled-down hands.', category: 'skill' },
  { id: 'on-fire', name: 'ON FIRE', description: 'Win 5 rounds in a row.', category: 'skill' },
  { id: 'untouchable', name: 'UNTOUCHABLE', description: 'Win 10 rounds in a row.', category: 'skill' },
  { id: 'five-card-charlie', name: 'FIVE CARD CHARLIE', description: 'Win a hand holding five or more cards.', category: 'skill' },
  { id: 'hand-crafted', name: 'HAND-CRAFTED 21', description: 'Win with exactly 21 from three or more cards.', category: 'skill' },
  { id: 'comeback-kid', name: 'COMEBACK KID', description: 'Win a round right after losing three in a row.', category: 'skill' },
  { id: 'maximum-heat', name: 'MAXIMUM HEAT', description: "Reach the 2× Hot Hand multiplier in Jak's House.", category: 'skill' },
  // Visits: daily and weekly log-ins
  { id: 'back-again', name: 'BACK AGAIN', description: 'Visit the table 3 days in a row.', category: 'visits' },
  { id: 'creature-of-habit', name: 'CREATURE OF HABIT', description: 'Visit the table 7 days in a row.', category: 'visits' },
  { id: 'part-of-the-furniture', name: 'PART OF THE FURNITURE', description: 'Visit the table 30 days in a row.', category: 'visits' },
  { id: 'weekly-regular', name: 'WEEKLY REGULAR', description: 'Visit the table 4 weeks in a row.', category: 'visits' },
  { id: 'season-ticket', name: 'SEASON TICKET', description: 'Visit the table 12 weeks in a row.', category: 'visits' },
  // Daily Hand
  { id: 'daily-dose', name: 'DAILY DOSE', description: 'Finish your first Daily Hand.', category: 'daily' },
  { id: 'same-problem', name: 'SAME PROBLEM, EVERY DAY', description: 'Reach a 7-day Daily Hand streak.', category: 'daily' },
  { id: 'daily-grind', name: 'DAILY GRIND', description: 'Win 10 Daily Hands.', category: 'daily' },
  // Comedy
  { id: 'so-close', name: 'SO CLOSE', description: 'Bust with exactly 22.', category: 'comedy' },
  { id: 'scared-money', name: 'SCARED MONEY', description: 'Stand on 11 or less. You could not have busted.', category: 'comedy' },
  { id: 'rock-bottom', name: 'ROCK BOTTOM', description: 'Lose 10 rounds in a row.', category: 'comedy' },
  { id: 'responsible-gambling', name: 'RESPONSIBLE GAMBLING', description: 'Run out of chips and take the refill.', category: 'comedy' },
  { id: 'all-in', name: 'ALL IN, NO NOTES', description: 'Bet your entire balance on one hand.', category: 'comedy' },
  { id: 'double-down-fall-down', name: 'DOUBLE DOWN, FALL DOWN', description: 'Bust a doubled-down hand.', category: 'comedy' },
  { id: 'night-owl', name: 'NIGHT OWL', description: 'Finish a hand between midnight and 4 a.m.', category: 'comedy' },
  { id: 'fashion-victim', name: 'FASHION VICTIM', description: 'Try all three card decks.', category: 'comedy' },
] as const;

export const TITLES: readonly TitleDefinition[] = [
  { name: 'Table Scrub', minRep: 0 },
  { name: 'Weekend Gambler', minRep: 250 },
  { name: 'Bad Influence', minRep: 750 },
  { name: 'Double Down Demon', minRep: 1500 },
  { name: 'House Problem', minRep: 3000 },
  { name: 'Golden Hand', minRep: 5000 },
  { name: "Jak's Favorite", minRep: 8000 },
  { name: 'BlackJak', minRep: 12000 },
] as const;

const achievementIds = new Set<AchievementId>(ACHIEVEMENTS.map((achievement) => achievement.id));

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === 'string' && achievementIds.has(value as AchievementId);
}

export function isAchievementCategory(value: unknown): value is AchievementCategory {
  return typeof value === 'string' && (ACHIEVEMENT_CATEGORIES as readonly string[]).includes(value);
}

export function achievementById(id: AchievementId): AchievementDefinition {
  const achievement = ACHIEVEMENTS.find((candidate) => candidate.id === id);
  if (!achievement) throw new Error(`Unknown achievement: ${id}`);
  return achievement;
}

export function titleForRep(rep: number): TitleDefinition {
  const safeRep = Number.isFinite(rep) && rep >= 0 ? rep : 0;
  return [...TITLES].reverse().find((title) => safeRep >= title.minRep) ?? TITLES[0];
}

export interface TitleProgress {
  current: TitleDefinition;
  next: TitleDefinition | null;
  percent: number;
}

export function titleProgressForRep(rep: number): TitleProgress {
  const safeRep = Number.isFinite(rep) && rep >= 0 ? rep : 0;
  const current = titleForRep(safeRep);
  const index = TITLES.findIndex((title) => title.name === current.name);
  const next = TITLES[index + 1] ?? null;

  if (!next) return { current, next: null, percent: 100 };

  const span = next.minRep - current.minRep;
  const earned = safeRep - current.minRep;
  return {
    current,
    next,
    percent: Math.max(0, Math.min(100, (earned / span) * 100)),
  };
}
