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
  | 'absolute-bullshii'
  // Gameplay milestones
  | 'pull-up-a-chair'
  | 'professional-degenerate'
  | 'natural-talent'
  | 'high-roller'
  | 'house-guest'
  | 'this-is-fine'
  // Skill
  | 'double-trouble'
  | 'double-or-nothing'
  | 'on-fire'
  | 'untouchable'
  | 'five-card-charlie'
  | 'hand-crafted'
  | 'comeback-kid'
  | 'maximum-heat'
  // Visits (daily and weekly log-ins)
  | 'back-again'
  | 'creature-of-habit'
  | 'part-of-the-furniture'
  | 'weekly-regular'
  | 'season-ticket'
  // Daily Hand
  | 'daily-dose'
  | 'same-problem'
  | 'daily-grind'
  // Comedy
  | 'so-close'
  | 'scared-money'
  | 'rock-bottom'
  | 'responsible-gambling'
  | 'all-in'
  | 'double-down-fall-down'
  | 'night-owl'
  | 'fashion-victim';

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

/**
 * Play habits outside a single hand: visit streaks (daily and weekly log-ins),
 * Daily Hand and Jak's House counts, and card decks tried. Feeds achievements.
 */
export interface ActivityState {
  /** Local date (YYYY-MM-DD) of the most recent visit. */
  lastVisitDate: string | null;
  /** Consecutive days with a visit, ending at lastVisitDate. */
  visitStreak: number;
  longestVisitStreak: number;
  /** Distinct days with a visit. */
  daysVisited: number;
  /** Monday-based week index of the most recent visit. */
  lastVisitWeek: number | null;
  /** Consecutive weeks with a visit, ending at lastVisitWeek. */
  weekStreak: number;
  longestWeekStreak: number;
  dailyHandsCompleted: number;
  dailyWins: number;
  houseRounds: number;
  /** Card deck themes the player has switched to. */
  decksTried: string[];
}

export interface PlayerProfile {
  chips: number;
  rep: number;
  stats: ClassicStats;
  progression: ProgressionState;
  daily: DailyState;
  activity: ActivityState;
}
