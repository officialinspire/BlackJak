export interface ClassicStats {
  totalHands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
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

export interface PlayerProfile {
  chips: number;
  rep: number;
  stats: ClassicStats;
  progression: ProgressionState;
}
