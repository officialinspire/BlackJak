export interface ClassicStats {
  totalHands: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export interface PlayerProfile {
  chips: number;
  rep: number;
  stats: ClassicStats;
}
