import { afterEach, describe, expect, it } from 'vitest';
import {
  applyProgression,
  completeDailyChallenge,
  createDailyChallenge,
  createHouseState,
  emptyRoundProgressionContext,
  isGoldCard,
  performAction,
  refillPracticeChips,
  reserveStake,
  settleResults,
  startHouseRound,
  startRound,
  type Card,
} from '../src/game';
import { defaultFeedbackPreferences, loadFeedbackPreferences, saveFeedbackPreferences } from '../src/storage/preferences';
import { defaultProfile, loadProfile, saveProfile } from '../src/storage/profile';

const originalWindow = globalThis.window;
const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
const deckFor = (...drawOrder: Card[]): Card[] => [...drawOrder].reverse();

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

function installMemoryStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  });
}

describe('BlackJak release smoke (rules unchanged since v0.1.0)', () => {
  it('boots from safe fresh defaults and can recover a zero-chip profile', () => {
    const fresh = defaultProfile();

    expect(fresh.chips).toBe(1000);
    expect(fresh.rep).toBe(0);
    expect(fresh.stats.totalHands).toBe(0);
    expect(refillPracticeChips({ ...fresh, chips: 0 }).chips).toBe(1000);
  });

  it('settles a natural blackjack through economy, REP, stats, and achievement progression', () => {
    const before = defaultProfile();
    const reserved = reserveStake(before, 20);
    const round = startRound(20, undefined, deckFor(c('A'), c('9'), c('K'), c('8')));

    expect(round.phase).toBe('resolved');
    expect(round.results[0]?.outcome).toBe('blackjack');

    const settled = settleResults(reserved, round.results);
    const progression = applyProgression(settled, round, emptyRoundProgressionContext());

    expect(progression.profile.chips).toBe(1030);
    expect(progression.profile.rep).toBe(100);
    expect(progression.profile.stats.wins).toBe(1);
    expect(progression.profile.stats.blackjacks).toBe(1);
    expect(progression.profile.progression.unlockedAchievements).toContain('blackjak');
  });

  it('keeps bust, double, and split paths resolvable with deterministic decks', () => {
    const bust = startRound(25, undefined, deckFor(c('10'), c('6'), c('8'), c('9'), c('9')));
    performAction(bust, 'hit');
    expect(bust.phase).toBe('resolved');
    expect(bust.results[0]?.outcome).toBe('loss');

    const doubled = startRound(25, undefined, deckFor(c('5'), c('10'), c('6'), c('7'), c('10')));
    performAction(doubled, 'double', 100);
    expect(doubled.phase).toBe('resolved');
    expect(doubled.hands[0]?.doubled).toBe(true);
    expect(doubled.hands[0]?.wager).toBe(50);

    const split = startRound(25, undefined, deckFor(c('8'), c('6'), c('8'), c('10'), c('2'), c('3'), c('10'), c('2')));
    performAction(split, 'split', 100);
    expect(split.hands).toHaveLength(2);
    performAction(split, 'stand');
    performAction(split, 'stand');
    expect(split.phase).toBe('resolved');
    expect(split.results).toHaveLength(2);
  });

  it('persists profile progression and settings through the versioned local-storage layer', () => {
    installMemoryStorage();

    const profile = {
      ...defaultProfile(),
      chips: 1375,
      rep: 450,
      progression: {
        ...defaultProfile().progression,
        unlockedAchievements: ['blackjak' as const],
      },
    };
    saveProfile(profile);

    const preferences = {
      ...defaultFeedbackPreferences(),
      master: false,
      music: false,
      volume: 0.4,
    };
    saveFeedbackPreferences(preferences);

    expect(loadProfile()).toMatchObject({
      chips: 1375,
      rep: 450,
      progression: { unlockedAchievements: ['blackjak'] },
    });
    expect(loadFeedbackPreferences()).toMatchObject({
      master: false,
      music: false,
      volume: 0.4,
    });
  });

  it('keeps Jak\'s House modifiers isolated and schedules the Gold Card on the third paid hand', () => {
    const supplied = deckFor(c('9'), c('6'), c('7'), c('10'));
    const classic = startRound(25, undefined, supplied);
    expect(classic.hands[0]?.cards[0]?.rank).toBe('9');

    let house = createHouseState();
    house = startHouseRound(25, house, undefined, supplied).house;
    house = startHouseRound(25, house, undefined, supplied).house;
    const third = startHouseRound(25, house, undefined, supplied);

    expect(third.house.goldRound).toBe(true);
    expect(third.round.hands[0]?.cards[0]?.rank).toBe('A');
    expect(isGoldCard(third.house, third.round.hands[0]?.id ?? '', 0)).toBe(true);
  });

  it('keeps Daily Hand deterministic and awards its REP only once per date', () => {
    const first = createDailyChallenge('2026-09-23');
    const second = createDailyChallenge('2026-09-23');

    expect(first.seed).toBe(second.seed);
    expect(first.round.hands[0]?.cards).toEqual(second.round.hands[0]?.cards);
    expect(first.round.phase).toBe('player-turn');

    const completed = completeDailyChallenge(defaultProfile(), '2026-09-23', 'win');
    const repeated = completeDailyChallenge(completed.profile, '2026-09-23', 'win');

    expect(completed.repAwarded).toBe(75);
    expect(repeated.repAwarded).toBe(0);
    expect(repeated.profile.rep).toBe(completed.profile.rep);
  });
});
