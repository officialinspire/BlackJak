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
  | 'fashion-victim'
  // Milestones: chips, REP and lifetime counts
  | 'chips-25k'
  | 'chips-50k'
  | 'chips-100k'
  | 'chips-250k'
  | 'chips-1m'
  | 'rep-25k'
  | 'rep-50k'
  | 'rep-100k'
  | 'rep-250k'
  | 'rep-1m'
  | 'hands-1000'
  | 'hands-5000'
  | 'wins-500'
  | 'wins-1000'
  | 'naturals-50'
  | 'naturals-100'
  // Gameplay
  | 'beginners-luck'
  | 'double-dipper'
  | 'splitsville'
  | 'welcome-to-the-house'
  | 'house-regular'
  | 'golden-touch'
  | 'second-chance'
  | 'high-stakes'
  // Skill
  | 'unstoppable'
  | 'double-down-devotee'
  | 'split-decision'
  | 'charlies-angel'
  | 'soft-touch'
  | 'back-to-back'
  | 'low-and-slow'
  | 'phoenix'
  // Visits
  | 'loyalty-program'
  | 'permanent-resident'
  | 'half-year-habit'
  | 'anniversary'
  | 'frequent-flyer'
  // Daily Hand
  | 'all-month'
  | 'daily-regular'
  | 'daily-domination'
  | 'daily-natural'
  | 'no-solution'
  // Comedy
  | 'agree-to-disagree'
  | 'stalemate'
  | 'live-dangerously'
  | 'early-bird'
  | 'gravity-wins'
  | 'card-hoarder'
  | 'split-disorder'
  | 'down-bad';

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
