export interface ClassicStats {
  totalHands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  doublesAttempted: number;
  doublesWon: number;
  splitsAttempted: number;
  splitSweeps: number;
  busts: number;
  longestWinStreak: number;
  longestLossStreak: number;
  highestChipBalance: number;
  lifetimeRep: number;
  riskyHits: number;
  fiveCardWins: number;
}

export type AchievementId =
  | 'blackjak'
  | 'why-would-you-do-that'
  | 'split-personality'
  | 'golden-boy'
  | 'house-money'
  | 'i-can-quit-anytime'
  | 'again'
  | 'jakpot'
  | 'absolute-bullshii';

export interface ProgressionState {
  unlockedAchievements: AchievementId[];
  currentWinStreak: number;
  currentLossStreak: number;
  recentBlackjackHands: boolean[];
}

export type DailyOutcome = 'blackjack' | 'win' | 'loss' | 'push';

export interface DailyState {
  dateKey: string | null;
  completed: boolean;
  outcome: DailyOutcome | null;
  rewardClaimed: boolean;
  currentStreak: number;
  lastCompletedDate: string | null;
}

export interface PlayerProfile {
  chips: number;
  rep: number;
  stats: ClassicStats;
  progression: ProgressionState;
  daily: DailyState;
}
