import { DAILY_CHALLENGE_REP, DAILY_CHALLENGE_VERSION } from '../config/constants';
import type { DailyOutcome, DailyState, PlayerProfile } from '../types/profile';
import { createDeck, shuffleDeck } from './deck';
import { startRound } from './round';
import type { RandomSource, RoundState } from './types';

export interface DailyChallenge {
  dateKey: string;
  version: string;
  seed: number;
  round: RoundState;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next(): number {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDailyChallenge(
  dateKey: string,
  version = DAILY_CHALLENGE_VERSION,
): DailyChallenge {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const seed = hashSeed(`${version}:${dateKey}:${attempt}`);
    const rng = seededRandom(seed);
    const deck = shuffleDeck(createDeck(), rng);
    const round = startRound(25, rng, deck);
    if (round.phase === 'player-turn') {
      return { dateKey, version, seed, round };
    }
  }

  throw new Error('Unable to generate a playable Daily Hand.');
}

function parseDateKey(dateKey: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function isConsecutiveDay(previous: string | null, current: string): boolean {
  if (!previous) return false;
  const before = parseDateKey(previous);
  const now = parseDateKey(current);
  return Number.isFinite(before) && Number.isFinite(now) && now - before === 86_400_000;
}

export function dailyStateForDate(state: DailyState, dateKey: string): DailyState {
  if (state.dateKey === dateKey) return state;
  return {
    dateKey,
    completed: false,
    outcome: null,
    rewardClaimed: false,
    currentStreak: state.currentStreak,
    lastCompletedDate: state.lastCompletedDate,
  };
}

export function completeDailyChallenge(
  profile: PlayerProfile,
  dateKey: string,
  outcome: DailyOutcome,
): { profile: PlayerProfile; repAwarded: number } {
  const today = dailyStateForDate(profile.daily, dateKey);
  if (today.completed && today.rewardClaimed) return { profile, repAwarded: 0 };

  const currentStreak = isConsecutiveDay(today.lastCompletedDate, dateKey)
    ? today.currentStreak + 1
    : 1;

  const repAwarded = today.rewardClaimed ? 0 : DAILY_CHALLENGE_REP;
  const daily: DailyState = {
    dateKey,
    completed: true,
    outcome,
    rewardClaimed: true,
    currentStreak,
    lastCompletedDate: dateKey,
  };

  return {
    profile: {
      ...profile,
      rep: profile.rep + repAwarded,
      stats: {
        ...profile.stats,
        lifetimeRep: profile.stats.lifetimeRep + repAwarded,
      },
      daily,
    },
    repAwarded,
  };
}

export function dailyShareText(profile: PlayerProfile, dateKey: string): string {
  const daily = dailyStateForDate(profile.daily, dateKey);
  const result = daily.completed && daily.outcome ? daily.outcome.toUpperCase() : 'INCOMPLETE';
  return [
    'BLACKJAK DAILY HAND',
    dateKey,
    `Result: ${result}`,
    `🔥 ${daily.currentStreak}-day streak`,
    'HOUSE RULES. BAD DECISIONS. ONE MORE HAND.',
  ].join('\n');
}
