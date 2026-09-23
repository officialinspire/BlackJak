export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type HandStatus = 'active' | 'stood' | 'bust' | 'blackjack' | 'resolved';

export interface PlayerHand {
  id: string;
  cards: Card[];
  wager: number;
  status: HandStatus;
  doubled: boolean;
  fromSplit: boolean;
}

export type RoundPhase = 'idle' | 'player-turn' | 'dealer-turn' | 'resolved';
export type PlayerAction = 'hit' | 'stand' | 'double' | 'split';
export type Outcome = 'blackjack' | 'win' | 'loss' | 'push';

export interface HandResult {
  handId: string;
  outcome: Outcome;
  wager: number;
  returned: number;
  net: number;
}

export interface RoundState {
  phase: RoundPhase;
  deck: Card[];
  dealer: Card[];
  hands: PlayerHand[];
  activeHandIndex: number;
  results: HandResult[];
}

export interface RandomSource {
  next(): number;
}
