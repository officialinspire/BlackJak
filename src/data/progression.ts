import type { AchievementId } from '../types/profile';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
}

export interface TitleDefinition {
  name: string;
  minRep: number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'blackjak', name: 'BLACKJAK', description: 'Get your first natural blackjack.' },
  { id: 'why-would-you-do-that', name: 'WHY WOULD YOU DO THAT?', description: 'Hit on 20.' },
  { id: 'split-personality', name: 'SPLIT PERSONALITY', description: 'Win both hands after a split.' },
  { id: 'golden-boy', name: 'GOLDEN BOY', description: 'Win 10 hands.' },
  { id: 'house-money', name: 'HOUSE MONEY', description: 'Reach 5,000 practice chips.' },
  { id: 'i-can-quit-anytime', name: 'I CAN QUIT ANYTIME', description: 'Complete 100 hands.' },
  { id: 'again', name: 'AGAIN.', description: 'Start another hand after a five-loss streak.' },
  { id: 'jakpot', name: 'JAKPOT', description: 'Get three natural blackjacks within ten completed hands.' },
  { id: 'absolute-bullshii', name: 'ABSOLUTE BULLSHII', description: 'Watch the dealer reach 21 with five or more cards.' },
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
