import { canSplitCards, evaluateHand } from './hand';
import type { Card, HandResult, Outcome, PlayerAction, PlayerHand } from './types';

export const BLACKJACK_PAYOUT = 1.5;
export const MAX_PLAYER_HANDS = 4;

export function dealerShouldHit(cards: readonly Card[]): boolean {
  return evaluateHand(cards).total < 17;
}

export function allowedActions(
  hand: PlayerHand,
  availableBankroll = Number.POSITIVE_INFINITY,
  playerHandCount = 1,
): PlayerAction[] {
  if (hand.status !== 'active') return [];

  const actions: PlayerAction[] = ['hit', 'stand'];
  const isInitialTwoCards = hand.cards.length === 2;

  if (isInitialTwoCards && availableBankroll >= hand.wager) {
    actions.push('double');
    if (playerHandCount < MAX_PLAYER_HANDS && canSplitCards(hand.cards)) actions.push('split');
  }

  return actions;
}

export function determineOutcome(playerCards: readonly Card[], dealerCards: readonly Card[], fromSplit = false): Outcome {
  const player = evaluateHand(playerCards);
  const dealer = evaluateHand(dealerCards);

  if (player.isBust) return 'loss';
  if (player.isBlackjack && !fromSplit && !dealer.isBlackjack) return 'blackjack';
  if (dealer.isBlackjack && !(player.isBlackjack && !fromSplit)) return 'loss';
  if (player.isBlackjack && !fromSplit && dealer.isBlackjack) return 'push';
  if (dealer.isBust) return 'win';
  if (player.total > dealer.total) return 'win';
  if (player.total < dealer.total) return 'loss';
  return 'push';
}

export function payoutFor(outcome: Outcome, wager: number): number {
  switch (outcome) {
    case 'blackjack':
      return wager + wager * BLACKJACK_PAYOUT;
    case 'win':
      return wager * 2;
    case 'push':
      return wager;
    case 'loss':
      return 0;
  }
}

export function resolveHand(hand: PlayerHand, dealerCards: readonly Card[]): HandResult {
  const outcome = determineOutcome(hand.cards, dealerCards, hand.fromSplit);
  const returned = payoutFor(outcome, hand.wager);
  return {
    handId: hand.id,
    outcome,
    wager: hand.wager,
    returned,
    net: returned - hand.wager,
  };
}
