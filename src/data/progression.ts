import type { AchievementId } from '../types/profile';

/** Logbook sections: what kind of play earns the achievement. */
export type AchievementCategory = 'milestones' | 'gameplay' | 'skill' | 'visits' | 'daily' | 'comedy';

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = ['milestones', 'gameplay', 'skill', 'visits', 'daily', 'comedy'];

export const ACHIEVEMENT_CATEGORY_LABELS: Readonly<Record<AchievementCategory, string>> = {
  milestones: 'Milestones',
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
  // Milestones: peak chips, REP and lifetime counts
  { id: 'chips-25k', name: 'QUARTER STACK', description: 'Reach 25,000 practice chips.', category: 'milestones' },
  { id: 'chips-50k', name: 'FIFTY GRAND', description: 'Reach 50,000 practice chips.', category: 'milestones' },
  { id: 'chips-100k', name: 'SIX FIGURES', description: 'Reach 100,000 practice chips.', category: 'milestones' },
  { id: 'chips-250k', name: 'WHALE WATCHING', description: 'Reach 250,000 practice chips.', category: 'milestones' },
  { id: 'chips-1m', name: 'FICTIONAL MILLIONAIRE', description: 'Reach 1,000,000 practice chips.', category: 'milestones' },
  { id: 'rep-25k', name: 'LOCAL LEGEND', description: 'Earn 25,000 REP.', category: 'milestones' },
  { id: 'rep-50k', name: 'TABLE ROYALTY', description: 'Earn 50,000 REP.', category: 'milestones' },
  { id: 'rep-100k', name: 'HALL OF FAME', description: 'Earn 100,000 REP.', category: 'milestones' },
  { id: 'rep-250k', name: 'MYTHICAL', description: 'Earn 250,000 REP.', category: 'milestones' },
  { id: 'rep-1m', name: "JAK'S EQUAL", description: 'Earn 1,000,000 REP.', category: 'milestones' },
  { id: 'hands-1000', name: 'FOUR DIGITS', description: 'Complete 1,000 hands.', category: 'milestones' },
  { id: 'hands-5000', name: 'TOUCH GRASS', description: 'Complete 5,000 hands. Then maybe go outside.', category: 'milestones' },
  { id: 'wins-500', name: 'WINNING IS A HABIT', description: 'Win 500 hands.', category: 'milestones' },
  { id: 'wins-1000', name: 'THE CLOSER', description: 'Win 1,000 hands.', category: 'milestones' },
  { id: 'naturals-50', name: 'NATURAL BORN', description: 'Get 50 natural blackjacks.', category: 'milestones' },
  { id: 'naturals-100', name: 'ACE COLLECTOR', description: 'Get 100 natural blackjacks.', category: 'milestones' },
  // Gameplay
  { id: 'beginners-luck', name: "BEGINNER'S LUCK", description: 'Win your first hand.', category: 'gameplay' },
  { id: 'double-dipper', name: 'DOUBLE DIPPER', description: 'Double down for the first time.', category: 'gameplay' },
  { id: 'splitsville', name: 'SPLITSVILLE', description: 'Split a pair for the first time.', category: 'gameplay' },
  { id: 'welcome-to-the-house', name: 'WELCOME TO THE HOUSE', description: "Finish your first round in Jak's House.", category: 'gameplay' },
  { id: 'house-regular', name: 'HOUSE REGULAR', description: "Complete 100 rounds in Jak's House.", category: 'gameplay' },
  { id: 'golden-touch', name: 'GOLDEN TOUCH', description: 'Win a Gold Card round.', category: 'gameplay' },
  { id: 'second-chance', name: 'SECOND CHANCE', description: 'Win a Run It Back replay.', category: 'gameplay' },
  { id: 'high-stakes', name: 'HIGH STAKES', description: 'Bet the table maximum on a hand.', category: 'gameplay' },
  // Skill
  { id: 'unstoppable', name: 'UNSTOPPABLE', description: 'Win 15 rounds in a row.', category: 'skill' },
  { id: 'double-down-devotee', name: 'DOUBLE DOWN DEVOTEE', description: 'Win 25 doubled-down hands.', category: 'skill' },
  { id: 'split-decision', name: 'SPLIT DECISION', description: 'Win both hands after a split 5 times.', category: 'skill' },
  { id: 'charlies-angel', name: "CHARLIE'S ANGEL", description: 'Win 5 hands holding five or more cards.', category: 'skill' },
  { id: 'soft-touch', name: 'SOFT TOUCH', description: 'Win with a soft 21 from three or more cards.', category: 'skill' },
  { id: 'back-to-back', name: 'BACK TO BACK', description: 'Get natural blackjacks in two rounds in a row.', category: 'skill' },
  { id: 'low-and-slow', name: 'LOW AND SLOW', description: 'Win a hand totalling 12 or less.', category: 'skill' },
  { id: 'phoenix', name: 'PHOENIX', description: 'Win a round right after losing five in a row.', category: 'skill' },
  // Visits
  { id: 'loyalty-program', name: 'LOYALTY PROGRAM', description: 'Visit the table 60 days in a row.', category: 'visits' },
  { id: 'permanent-resident', name: 'PERMANENT RESIDENT', description: 'Visit the table 100 days in a row.', category: 'visits' },
  { id: 'half-year-habit', name: 'HALF-YEAR HABIT', description: 'Visit the table 26 weeks in a row.', category: 'visits' },
  { id: 'anniversary', name: 'ANNIVERSARY', description: 'Visit the table 52 weeks in a row.', category: 'visits' },
  { id: 'frequent-flyer', name: 'FREQUENT FLYER', description: 'Visit the table on 30 different days.', category: 'visits' },
  // Daily Hand
  { id: 'all-month', name: 'SAME PROBLEM, ALL MONTH', description: 'Reach a 30-day Daily Hand streak.', category: 'daily' },
  { id: 'daily-regular', name: 'DAILY REGULAR', description: 'Finish 25 Daily Hands.', category: 'daily' },
  { id: 'daily-domination', name: 'DAILY DOMINATION', description: 'Win 50 Daily Hands.', category: 'daily' },
  { id: 'daily-natural', name: 'DAILY NATURAL', description: 'Get a natural blackjack on a Daily Hand.', category: 'daily' },
  { id: 'no-solution', name: 'SAME PROBLEM, NO SOLUTION', description: 'Lose a Daily Hand.', category: 'daily' },
  // Comedy
  { id: 'agree-to-disagree', name: 'AGREE TO DISAGREE', description: 'Push with the dealer.', category: 'comedy' },
  { id: 'stalemate', name: 'STALEMATE ENTHUSIAST', description: 'Push 25 times.', category: 'comedy' },
  { id: 'live-dangerously', name: 'LIVE DANGEROUSLY', description: 'Hit on 16 or more 50 times.', category: 'comedy' },
  { id: 'early-bird', name: 'EARLY BIRD', description: 'Finish a hand between 5 and 7 a.m.', category: 'comedy' },
  { id: 'gravity-wins', name: 'GRAVITY WINS', description: 'Bust 100 times.', category: 'comedy' },
  { id: 'card-hoarder', name: 'CARD HOARDER', description: 'Hold seven or more cards in one hand.', category: 'comedy' },
  { id: 'split-disorder', name: 'SPLIT PERSONALITY DISORDER', description: 'Lose both hands after a split.', category: 'comedy' },
  { id: 'down-bad', name: 'DOWN BAD', description: 'Lose 20 rounds in a row.', category: 'comedy' },
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
