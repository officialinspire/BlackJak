import type { Card, Rank } from './types';

const rankValue = (rank: Rank): number => {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
};

export interface HandEvaluation {
  total: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export function evaluateHand(cards: readonly Card[]): HandEvaluation {
  let total = cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
  let acesAsEleven = cards.filter((card) => card.rank === 'A').length;

  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }

  return {
    total,
    isSoft: acesAsEleven > 0,
    isBust: total > 21,
    isBlackjack: cards.length === 2 && total === 21,
  };
}

export const cardPointValue = (card: Card): number => rankValue(card.rank);

export function canSplitCards(cards: readonly Card[]): boolean {
  if (cards.length !== 2) return false;
  return cardPointValue(cards[0]) === cardPointValue(cards[1]);
}
