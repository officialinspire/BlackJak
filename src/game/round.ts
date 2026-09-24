import { createDeck, drawCard, shuffleDeck, systemRandom } from './deck';
import { evaluateHand } from './hand';
import { allowedActions, dealerShouldHit, resolveHand } from './rules';
import type { Card, PlayerAction, PlayerHand, RandomSource, RoundState } from './types';

export function createInitialRound(deck: Card[] = []): RoundState {
  return {
    phase: 'idle',
    deck: [...deck],
    dealer: [],
    hands: [],
    activeHandIndex: 0,
    results: [],
  };
}

export function startRound(wager: number, rng: RandomSource = systemRandom, suppliedDeck?: readonly Card[]): RoundState {
  if (!Number.isFinite(wager) || wager <= 0) throw new RangeError('Wager must be a positive number.');

  const source = suppliedDeck ? suppliedDeck.map((card) => ({ ...card })) : shuffleDeck(createDeck(), rng);
  const state = createInitialRound(source);
  const player: PlayerHand = {
    id: 'hand-1',
    cards: [],
    wager,
    status: 'active',
    doubled: false,
    fromSplit: false,
  };

  player.cards.push(drawCard(state.deck));
  state.dealer.push(drawCard(state.deck));
  player.cards.push(drawCard(state.deck));
  state.dealer.push(drawCard(state.deck));
  state.hands = [player];

  const playerEval = evaluateHand(player.cards);
  const dealerEval = evaluateHand(state.dealer);

  if (playerEval.isBlackjack || dealerEval.isBlackjack) {
    player.status = playerEval.isBlackjack ? 'blackjack' : 'resolved';
    state.phase = 'resolved';
    state.results = [resolveHand(player, state.dealer)];
  } else {
    state.phase = 'player-turn';
  }

  return state;
}

export function getActiveHand(state: RoundState): PlayerHand {
  const hand = state.hands[state.activeHandIndex];
  if (!hand) throw new Error('No active player hand is available.');
  return hand;
}

function advanceAfterHand(state: RoundState): void {
  const nextIndex = state.hands.findIndex((hand, index) => index > state.activeHandIndex && hand.status === 'active');
  if (nextIndex >= 0) {
    state.activeHandIndex = nextIndex;
    return;
  }

  state.phase = 'dealer-turn';
  playDealer(state);
}

export function playDealer(state: RoundState): void {
  const allPlayerHandsBust = state.hands.every((hand) => evaluateHand(hand.cards).isBust);

  if (!allPlayerHandsBust) {
    while (dealerShouldHit(state.dealer)) {
      state.dealer.push(drawCard(state.deck));
    }
  }

  state.results = state.hands.map((hand) => {
    hand.status = 'resolved';
    return resolveHand(hand, state.dealer);
  });
  state.phase = 'resolved';
}

export function performAction(state: RoundState, action: PlayerAction, availableBankroll = Number.POSITIVE_INFINITY): RoundState {
  if (state.phase !== 'player-turn') throw new Error('Player actions are only valid during the player turn.');

  const hand = getActiveHand(state);
  const validActions = allowedActions(hand, availableBankroll, state.hands.length);
  if (!validActions.includes(action)) throw new Error(`Action "${action}" is not currently allowed.`);

  switch (action) {
    case 'hit': {
      hand.cards.push(drawCard(state.deck));
      const evaluation = evaluateHand(hand.cards);
      if (evaluation.isBust) {
        hand.status = 'bust';
        advanceAfterHand(state);
      } else if (evaluation.total === 21) {
        hand.status = 'stood';
        advanceAfterHand(state);
      }
      break;
    }
    case 'stand':
      hand.status = 'stood';
      advanceAfterHand(state);
      break;
    case 'double': {
      hand.wager *= 2;
      hand.doubled = true;
      hand.cards.push(drawCard(state.deck));
      hand.status = evaluateHand(hand.cards).isBust ? 'bust' : 'stood';
      advanceAfterHand(state);
      break;
    }
    case 'split': {
      if (state.deck.length < 2) throw new Error('Cannot split without two cards remaining in the deck.');
      const movedCard = hand.cards.pop();
      if (!movedCard) throw new Error('Cannot split an empty hand.');

      hand.fromSplit = true;
      hand.cards.push(drawCard(state.deck));

      const splitHand: PlayerHand = {
        id: `hand-${state.hands.length + 1}`,
        cards: [movedCard, drawCard(state.deck)],
        wager: hand.wager,
        status: 'active',
        doubled: false,
        fromSplit: true,
      };

      state.hands.splice(state.activeHandIndex + 1, 0, splitHand);
      for (const splitResult of [hand, splitHand]) {
        if (evaluateHand(splitResult.cards).total === 21) splitResult.status = 'stood';
      }
      if (hand.status !== 'active') advanceAfterHand(state);
      break;
    }
  }

  return state;
}
