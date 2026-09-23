import { HOUSE_MODIFIERS, type HouseModifierId } from '../data/house';
import { createDeck, shuffleDeck, systemRandom } from './deck';
import { startRound } from './round';
import type { Card, RandomSource, RoundState } from './types';

export interface GoldCardMarker {
  handId: string;
  cardIndex: number;
}

export interface HouseState {
  roundNumber: number;
  hotHandStreak: number;
  runItBackTokens: number;
  completedTowardToken: number;
  replayAvailable: boolean;
  currentStake: number | null;
  goldRound: boolean;
  goldCard: GoldCardMarker | null;
}

export interface HouseRoundStart {
  round: RoundState;
  house: HouseState;
}

export interface HouseResolution {
  house: HouseState;
  hotHandMultiplier: number;
  hotHandBonusRep: number;
  tokenAwarded: boolean;
}

export const createHouseState = (): HouseState => ({
  roundNumber: 0,
  hotHandStreak: 0,
  runItBackTokens: 1,
  completedTowardToken: 0,
  replayAvailable: false,
  currentStake: null,
  goldRound: false,
  goldCard: null,
});

export function houseModifier(id: HouseModifierId) {
  const modifier = HOUSE_MODIFIERS.find((candidate) => candidate.id === id);
  if (!modifier) throw new Error(`Unknown House modifier: ${id}`);
  return modifier;
}

export function hotHandMultiplier(streak: number): number {
  const safeStreak = Math.max(0, Math.floor(streak));
  if (safeStreak <= 1) return 1;
  return Math.min(2, 1 + (safeStreak - 1) * 0.25);
}

function prepareHouseDeck(
  goldRound: boolean,
  rng: RandomSource,
  suppliedDeck?: readonly Card[],
): Card[] {
  const deck = suppliedDeck
    ? suppliedDeck.map((card) => ({ ...card }))
    : shuffleDeck(createDeck(), rng);

  if (goldRound && deck.length >= 4) {
    const playerFirstIndex = deck.length - 1;
    const original = deck[playerFirstIndex];
    deck[playerFirstIndex] = { ...original, rank: 'A' };
  }

  return deck;
}

function beginHouseRound(
  stake: number,
  house: HouseState,
  incrementRound: boolean,
  rng: RandomSource,
  suppliedDeck?: readonly Card[],
): HouseRoundStart {
  if (!Number.isFinite(stake) || stake <= 0) throw new RangeError('House stake must be a positive number.');

  const nextRoundNumber = incrementRound ? house.roundNumber + 1 : house.roundNumber;
  const goldRound = nextRoundNumber > 0 && nextRoundNumber % 3 === 0;
  const deck = prepareHouseDeck(goldRound, rng, suppliedDeck);
  const round = startRound(stake, rng, deck);

  return {
    round,
    house: {
      ...house,
      roundNumber: nextRoundNumber,
      replayAvailable: false,
      currentStake: stake,
      goldRound,
      goldCard: goldRound ? { handId: round.hands[0]?.id ?? 'hand-1', cardIndex: 0 } : null,
    },
  };
}

export function startHouseRound(
  stake: number,
  house: HouseState,
  rng: RandomSource = systemRandom,
  suppliedDeck?: readonly Card[],
): HouseRoundStart {
  return beginHouseRound(stake, house, true, rng, suppliedDeck);
}

export function replayHouseRound(
  house: HouseState,
  rng: RandomSource = systemRandom,
  suppliedDeck?: readonly Card[],
): HouseRoundStart {
  if (!house.replayAvailable || house.runItBackTokens <= 0 || !house.currentStake) {
    throw new Error('Run It Back is not currently available.');
  }

  const spent: HouseState = {
    ...house,
    runItBackTokens: house.runItBackTokens - 1,
    replayAvailable: false,
  };

  return beginHouseRound(house.currentStake, spent, false, rng, suppliedDeck);
}

function totalNet(round: RoundState): number {
  return round.results.reduce((sum, result) => sum + result.net, 0);
}

export function completeHouseRound(
  house: HouseState,
  round: RoundState,
  baseRepEarned: number,
): HouseResolution {
  if (round.phase !== 'resolved') throw new Error('House round must be resolved before completion.');

  const allWins =
    round.results.length > 0 &&
    round.results.every((result) => result.outcome === 'win' || result.outcome === 'blackjack');

  const nextStreak = allWins ? house.hotHandStreak + 1 : 0;
  const multiplier = hotHandMultiplier(nextStreak);
  const hotHandBonusRep = allWins
    ? Math.max(0, Math.floor(baseRepEarned * (multiplier - 1)))
    : 0;

  let tokens = house.runItBackTokens;
  let completedTowardToken = tokens > 0 ? 0 : house.completedTowardToken + 1;
  let tokenAwarded = false;

  if (tokens === 0 && completedTowardToken >= 5) {
    tokens = 1;
    completedTowardToken = 0;
    tokenAwarded = true;
  }

  const losingRound = totalNet(round) < 0;
  const replayAvailable = losingRound && tokens > 0;

  return {
    house: {
      ...house,
      hotHandStreak: nextStreak,
      runItBackTokens: tokens,
      completedTowardToken,
      replayAvailable,
    },
    hotHandMultiplier: multiplier,
    hotHandBonusRep,
    tokenAwarded,
  };
}

export function isGoldCard(
  house: HouseState,
  handId: string,
  cardIndex: number,
): boolean {
  return Boolean(
    house.goldCard &&
    house.goldCard.handId === handId &&
    house.goldCard.cardIndex === cardIndex,
  );
}
