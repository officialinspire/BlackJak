import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../src/data/progression';
import {
  applyProgression,
  emptyRoundProgressionContext,
  recordDailyHand,
  recordDeckTried,
  recordHotHand,
  recordMilestones,
  recordRefill,
  recordVisit,
  settleResults,
  unlockAchievementIds,
  type Card,
  type RoundProgressionContext,
  type RoundState,
} from '../src/game';
import { defaultProfile } from '../src/storage/profile';
import type { AchievementId, DailyOutcome, PlayerProfile } from '../src/types/profile';

/*
 * Every achievement in the catalogue is driven by a real game scenario here,
 * through the same pure functions the app calls (settleResults +
 * applyProgression after a hand, the activity recorders elsewhere). The
 * coverage test fails if an achievement is added without a way to earn it.
 */

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });
type Outcome = 'win' | 'loss' | 'push' | 'blackjack';

interface HandSpec { cards: Card[]; outcome: Outcome; doubled?: boolean }

function round(hands: HandSpec[], dealer: Card[] = [c('10'), c('7')]): RoundState {
  return {
    phase: 'resolved',
    deck: [],
    dealer,
    hands: hands.map((hand, index) => ({
      id: `hand-${index + 1}`, cards: hand.cards, wager: 25, status: 'resolved', doubled: hand.doubled ?? false, fromSplit: hands.length > 1,
    })),
    activeHandIndex: 0,
    results: hands.map((hand, index) => {
      const returned = hand.outcome === 'loss' ? 0 : hand.outcome === 'push' ? 25 : hand.outcome === 'blackjack' ? 62.5 : 50;
      return { handId: `hand-${index + 1}`, outcome: hand.outcome, wager: 25, returned, net: returned - 25 };
    }),
  };
}

const WIN = (): RoundState => round([{ cards: [c('10'), c('9')], outcome: 'win' }]);
const LOSS = (): RoundState => round([{ cards: [c('10'), c('7')], outcome: 'loss' }], [c('10'), c('9')]);
const NATURAL = (): RoundState => round([{ cards: [c('A'), c('K')], outcome: 'blackjack' }]);

/** Plays one hand exactly as the app settles it; returns the new profile and what it unlocked. */
function play(profile: PlayerProfile, state: RoundState, context: Partial<RoundProgressionContext> = {}): { profile: PlayerProfile; ids: AchievementId[] } {
  const settled = settleResults(profile, state.results);
  const update = applyProgression(settled, state, { ...emptyRoundProgressionContext(), ...context });
  return { profile: update.profile, ids: update.unlocked.map((achievement) => achievement.id) };
}

/** Plays `times` hands, collecting every unlock. */
function playMany(times: number, next: () => RoundState, context: Partial<RoundProgressionContext> = {}, start = defaultProfile()) {
  let profile = start;
  const ids = new Set<AchievementId>();
  for (let index = 0; index < times; index += 1) {
    const result = play(profile, next(), context);
    profile = result.profile;
    result.ids.forEach((id) => ids.add(id));
  }
  return { profile, ids };
}

function withStats(patch: Partial<PlayerProfile['stats']>): PlayerProfile {
  const profile = defaultProfile();
  return { ...profile, stats: { ...profile.stats, ...patch } };
}

const idsOf = (update: { unlocked: { id: AchievementId }[] }): AchievementId[] => update.unlocked.map((achievement) => achievement.id);

function visitDays(days: number, stepDays = 1, start = '2026-01-05'): AchievementId[] {
  let profile = defaultProfile();
  const ids: AchievementId[] = [];
  const base = new Date(`${start}T12:00:00Z`);
  for (let index = 0; index < days; index += 1) {
    const date = new Date(base.getTime() + index * stepDays * 86_400_000).toISOString().slice(0, 10);
    const update = recordVisit(profile, date);
    profile = update.profile;
    ids.push(...idsOf(update));
  }
  return ids;
}

function dailyHands(outcomes: DailyOutcome[], streak = 0): AchievementId[] {
  let profile = defaultProfile();
  profile.daily.currentStreak = streak;
  const ids: AchievementId[] = [];
  for (const outcome of outcomes) {
    const update = recordDailyHand(profile, outcome);
    profile = update.profile;
    ids.push(...idsOf(update));
  }
  return ids;
}

/** One scenario per achievement: returns every ID the scenario unlocked. */
const SCENARIOS: Record<AchievementId, () => Iterable<AchievementId>> = {
  // Original nine
  blackjak: () => play(defaultProfile(), NATURAL()).ids,
  'why-would-you-do-that': () => play(defaultProfile(), LOSS(), { hitOn20: true }).ids,
  'split-personality': () => play(defaultProfile(), round([{ cards: [c('8'), c('10')], outcome: 'win' }, { cards: [c('8'), c('K')], outcome: 'win' }])).ids,
  'golden-boy': () => playMany(10, WIN).ids,
  'house-money': () => play({ ...defaultProfile(), chips: 5000 }, WIN()).ids,
  'i-can-quit-anytime': () => play(withStats({ totalHands: 99 }), LOSS()).ids,
  again: () => unlockAchievementIds(defaultProfile(), ['again']).unlocked.map((achievement) => achievement.id),
  jakpot: () => playMany(3, NATURAL).ids,
  'absolute-bullshii': () => play(defaultProfile(), round([{ cards: [c('10'), c('9')], outcome: 'loss' }], [c('2'), c('3'), c('4'), c('5'), c('7')])).ids,
  // Gameplay (v0.5)
  'pull-up-a-chair': () => play(defaultProfile(), LOSS()).ids,
  'professional-degenerate': () => play(withStats({ wins: 99 }), WIN()).ids,
  'natural-talent': () => play(withStats({ blackjacks: 9 }), NATURAL()).ids,
  'high-roller': () => play({ ...defaultProfile(), chips: 10_000 }, WIN()).ids,
  'house-guest': () => playMany(25, LOSS, { house: true }).ids,
  'this-is-fine': () => play(withStats({ totalHands: 499 }), LOSS()).ids,
  // Skill (v0.5)
  'double-trouble': () => play(defaultProfile(), round([{ cards: [c('5'), c('6'), c('9')], outcome: 'win', doubled: true }])).ids,
  'double-or-nothing': () => play(withStats({ doublesWon: 9 }), round([{ cards: [c('5'), c('6'), c('9')], outcome: 'win', doubled: true }])).ids,
  'on-fire': () => playMany(5, WIN).ids,
  untouchable: () => playMany(10, WIN).ids,
  'five-card-charlie': () => play(defaultProfile(), round([{ cards: [c('2'), c('3'), c('4'), c('2'), c('5')], outcome: 'win' }])).ids,
  'hand-crafted': () => play(defaultProfile(), round([{ cards: [c('7'), c('7'), c('7')], outcome: 'win' }])).ids,
  'comeback-kid': () => { const lost = playMany(3, LOSS); return play(lost.profile, WIN()).ids; },
  'maximum-heat': () => idsOf(recordHotHand(defaultProfile(), 5)),
  // Visits (v0.5)
  'back-again': () => visitDays(3),
  'creature-of-habit': () => visitDays(7),
  'part-of-the-furniture': () => visitDays(30),
  'weekly-regular': () => visitDays(4, 7),
  'season-ticket': () => visitDays(12, 7),
  // Daily Hand (v0.5)
  'daily-dose': () => dailyHands(['push']),
  'same-problem': () => dailyHands(['win'], 7),
  'daily-grind': () => dailyHands(Array(10).fill('win')),
  // Comedy (v0.5)
  'so-close': () => play(defaultProfile(), round([{ cards: [c('10'), c('5'), c('7')], outcome: 'loss' }])).ids,
  'scared-money': () => play(defaultProfile(), LOSS(), { stoodOnLow: true }).ids,
  'rock-bottom': () => playMany(10, LOSS).ids,
  'responsible-gambling': () => idsOf(recordRefill(defaultProfile())),
  'all-in': () => play(defaultProfile(), LOSS(), { allIn: true }).ids,
  'double-down-fall-down': () => play(defaultProfile(), round([{ cards: [c('10'), c('6'), c('9')], outcome: 'loss', doubled: true }])).ids,
  'night-owl': () => play(defaultProfile(), LOSS(), { finishedHour: 1 }).ids,
  'fashion-victim': () => {
    let profile = defaultProfile();
    const ids: AchievementId[] = [];
    for (const theme of ['standard', 'jak', 'inspire']) { const update = recordDeckTried(profile, theme, 3); profile = update.profile; ids.push(...idsOf(update)); }
    return ids;
  },
  // Milestones (v0.6): chip and REP ladders
  'chips-25k': () => idsOf(recordMilestones({ ...defaultProfile(), chips: 25_000 })),
  'chips-50k': () => idsOf(recordMilestones({ ...defaultProfile(), chips: 50_000 })),
  'chips-100k': () => idsOf(recordMilestones(withStats({ highestChipBalance: 100_000 }))),
  'chips-250k': () => idsOf(recordMilestones({ ...defaultProfile(), chips: 250_000 })),
  'chips-1m': () => idsOf(recordMilestones({ ...defaultProfile(), chips: 1_000_000 })),
  'rep-25k': () => idsOf(recordMilestones({ ...defaultProfile(), rep: 25_000 })),
  'rep-50k': () => idsOf(recordMilestones({ ...defaultProfile(), rep: 50_000 })),
  'rep-100k': () => idsOf(recordMilestones({ ...defaultProfile(), rep: 100_000 })),
  'rep-250k': () => idsOf(recordMilestones(withStats({ lifetimeRep: 250_000 }))),
  'rep-1m': () => idsOf(recordMilestones({ ...defaultProfile(), rep: 1_000_000 })),
  'hands-1000': () => play(withStats({ totalHands: 999 }), LOSS()).ids,
  'hands-5000': () => play(withStats({ totalHands: 4999 }), LOSS()).ids,
  'wins-500': () => play(withStats({ wins: 499 }), WIN()).ids,
  'wins-1000': () => play(withStats({ wins: 999 }), WIN()).ids,
  'naturals-50': () => play(withStats({ blackjacks: 49 }), NATURAL()).ids,
  'naturals-100': () => play(withStats({ blackjacks: 99 }), NATURAL()).ids,
  // Gameplay (v0.6)
  'beginners-luck': () => play(defaultProfile(), WIN()).ids,
  'double-dipper': () => play(defaultProfile(), LOSS(), { doublesAttempted: 1 }).ids,
  splitsville: () => play(defaultProfile(), LOSS(), { splitsAttempted: 1 }).ids,
  'welcome-to-the-house': () => play(defaultProfile(), LOSS(), { house: true }).ids,
  'house-regular': () => playMany(100, LOSS, { house: true }).ids,
  'golden-touch': () => play(defaultProfile(), WIN(), { house: true, goldRound: true }).ids,
  'second-chance': () => play(defaultProfile(), WIN(), { house: true, replay: true }).ids,
  'high-stakes': () => play(defaultProfile(), LOSS(), { maxStake: true }).ids,
  // Skill (v0.6)
  unstoppable: () => playMany(15, WIN).ids,
  'double-down-devotee': () => play(withStats({ doublesWon: 24 }), round([{ cards: [c('5'), c('6'), c('9')], outcome: 'win', doubled: true }])).ids,
  'split-decision': () => play(withStats({ splitSweeps: 4 }), round([{ cards: [c('8'), c('10')], outcome: 'win' }, { cards: [c('8'), c('K')], outcome: 'win' }])).ids,
  'charlies-angel': () => play(withStats({ fiveCardWins: 4 }), round([{ cards: [c('2'), c('3'), c('4'), c('2'), c('5')], outcome: 'win' }])).ids,
  'soft-touch': () => play(defaultProfile(), round([{ cards: [c('A'), c('4'), c('6')], outcome: 'win' }])).ids,
  'back-to-back': () => playMany(2, NATURAL).ids,
  'low-and-slow': () => play(defaultProfile(), round([{ cards: [c('10'), c('2')], outcome: 'win' }], [c('10'), c('6'), c('K')])).ids,
  phoenix: () => { const lost = playMany(5, LOSS); return play(lost.profile, WIN()).ids; },
  // Visits (v0.6)
  'loyalty-program': () => visitDays(60),
  'permanent-resident': () => visitDays(100),
  'half-year-habit': () => visitDays(26, 7),
  anniversary: () => visitDays(52, 7),
  'frequent-flyer': () => visitDays(30, 2),
  // Daily Hand (v0.6)
  'all-month': () => dailyHands(['push'], 30),
  'daily-regular': () => dailyHands(Array(25).fill('push')),
  'daily-domination': () => dailyHands(Array(50).fill('win')),
  'daily-natural': () => dailyHands(['blackjack']),
  'no-solution': () => dailyHands(['loss']),
  // Comedy (v0.6)
  'agree-to-disagree': () => play(defaultProfile(), round([{ cards: [c('10'), c('7')], outcome: 'push' }])).ids,
  stalemate: () => playMany(25, () => round([{ cards: [c('10'), c('7')], outcome: 'push' }])).ids,
  'live-dangerously': () => play(withStats({ riskyHits: 49 }), LOSS(), { riskyHits: 1 }).ids,
  'early-bird': () => play(defaultProfile(), LOSS(), { finishedHour: 6 }).ids,
  'gravity-wins': () => play(withStats({ busts: 99 }), round([{ cards: [c('10'), c('6'), c('9')], outcome: 'loss' }])).ids,
  'card-hoarder': () => play(defaultProfile(), round([{ cards: [c('A'), c('2'), c('2'), c('3'), c('2'), c('3'), c('4')], outcome: 'win' }])).ids,
  'split-disorder': () => play(defaultProfile(), round([{ cards: [c('8'), c('9')], outcome: 'loss' }, { cards: [c('8'), c('8')], outcome: 'loss' }], [c('10'), c('9')])).ids,
  'down-bad': () => playMany(20, LOSS).ids,
};

describe('every achievement is earnable', () => {
  it('has a scenario for all 89 achievements in six categories, and nothing else', () => {
    expect(ACHIEVEMENTS).toHaveLength(89);
    expect(ACHIEVEMENT_CATEGORIES).toEqual(['milestones', 'gameplay', 'skill', 'visits', 'daily', 'comedy']);
    expect(Object.keys(SCENARIOS).sort()).toEqual(ACHIEVEMENTS.map((achievement) => achievement.id).sort());
  });

  it.each(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement.name] as const))('%s (%s) unlocks from its scenario', (id) => {
    expect([...SCENARIOS[id]()]).toContain(id);
  });
});

describe('thresholds are exact (one short does not unlock)', () => {
  it.each([
    ['chips-25k', { ...defaultProfile(), chips: 24_999 }],
    ['chips-1m', { ...defaultProfile(), chips: 999_999 }],
    ['rep-25k', { ...defaultProfile(), rep: 24_999 }],
    ['rep-1m', { ...defaultProfile(), rep: 999_999 }],
  ] as const)('%s', (id, profile) => {
    expect(idsOf(recordMilestones(profile))).not.toContain(id);
  });

  it('awards every chip rung at once when a balance jumps past several', () => {
    expect(idsOf(recordMilestones({ ...defaultProfile(), chips: 120_000 }))).toEqual(['chips-25k', 'chips-50k', 'chips-100k']);
    expect(idsOf(recordMilestones({ ...defaultProfile(), rep: 60_000 }))).toEqual(['rep-25k', 'rep-50k']);
  });

  it('never re-awards a milestone', () => {
    const first = recordMilestones({ ...defaultProfile(), chips: 30_000 });
    expect(idsOf(recordMilestones({ ...first.profile, chips: 31_000 }))).toEqual([]);
    expect(recordMilestones(first.profile).profile).toBe(first.profile);
  });

  it.each([
    ['hands-1000', () => play(withStats({ totalHands: 998 }), LOSS()).ids],
    ['unstoppable', () => playMany(14, WIN).ids],
    ['down-bad', () => playMany(19, LOSS).ids],
    ['stalemate', () => playMany(24, () => round([{ cards: [c('10'), c('7')], outcome: 'push' }])).ids],
    ['house-regular', () => playMany(99, LOSS, { house: true }).ids],
    ['loyalty-program', () => visitDays(59)],
    ['anniversary', () => visitDays(51, 7)],
    ['frequent-flyer', () => visitDays(29, 2)],
    ['daily-domination', () => dailyHands(Array(49).fill('win'))],
    ['early-bird', () => play(defaultProfile(), LOSS(), { finishedHour: 7 }).ids],
  ] as const)('%s stays locked one step short', (id, scenario) => {
    expect([...scenario()]).not.toContain(id);
  });

  it('does not treat unrelated rounds as special', () => {
    const plain = play(defaultProfile(), WIN()).ids;
    for (const id of ['golden-touch', 'second-chance', 'high-stakes', 'soft-touch', 'back-to-back', 'low-and-slow', 'card-hoarder', 'split-disorder', 'agree-to-disagree'] as const) {
      expect(plain).not.toContain(id);
    }
    // Gold Card and replay only count when the round is won.
    expect(play(defaultProfile(), LOSS(), { house: true, goldRound: true }).ids).not.toContain('golden-touch');
    expect(play(defaultProfile(), LOSS(), { house: true, replay: true }).ids).not.toContain('second-chance');
    // A hard 21 is not a soft touch; one natural is not back to back.
    expect(play(defaultProfile(), round([{ cards: [c('7'), c('7'), c('7')], outcome: 'win' }])).ids).not.toContain('soft-touch');
    expect(play(play(defaultProfile(), NATURAL()).profile, WIN()).ids).not.toContain('back-to-back');
  });
});
