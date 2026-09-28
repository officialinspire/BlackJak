import { afterEach, describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  isAchievementId,
} from '../src/data/progression';
import {
  achievementProgress,
  applyProgression,
  dayNumber,
  emptyRoundProgressionContext,
  recordDailyHand,
  recordDeckTried,
  recordHotHand,
  recordRefill,
  recordVisit,
  weekNumber,
  type Card,
  type RoundProgressionContext,
  type RoundState,
} from '../src/game';
import { defaultProfile, loadProfile, saveProfile } from '../src/storage/profile';
import type { AchievementId, PlayerProfile } from '../src/types/profile';
import { ACHIEVEMENT_BADGES, badgeSvg } from '../src/ui/achievement-badges';
import { achievementLogMarkup, isAchievementCategoryFilter } from '../src/ui/achievement-log';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

type Outcome = 'win' | 'loss' | 'push' | 'blackjack';

function round(cards: Card[], outcome: Outcome, options: { dealer?: Card[]; doubled?: boolean } = {}): RoundState {
  return {
    phase: 'resolved',
    deck: [],
    dealer: options.dealer ?? [c('10'), c('7')],
    hands: [{ id: 'hand-1', cards, wager: 25, status: 'resolved', doubled: options.doubled ?? false, fromSplit: false }],
    activeHandIndex: 0,
    results: [{ handId: 'hand-1', outcome, wager: 25, returned: outcome === 'loss' ? 0 : 50, net: outcome === 'loss' ? -25 : 25 }],
  };
}

function settle(
  profile: PlayerProfile,
  state: RoundState,
  context: Partial<RoundProgressionContext> = {},
): { profile: PlayerProfile; ids: AchievementId[] } {
  // Mirrors settleResults' hand counting so stat-based rules see the new hand.
  const stats = { ...profile.stats };
  for (const result of state.results) {
    stats.totalHands += 1;
    if (result.outcome === 'win' || result.outcome === 'blackjack') stats.wins += 1;
    if (result.outcome === 'blackjack') stats.blackjacks += 1;
    if (result.outcome === 'loss') stats.losses += 1;
  }
  const update = applyProgression({ ...profile, stats }, state, { ...emptyRoundProgressionContext(), ...context });
  return { profile: update.profile, ids: update.unlocked.map((achievement) => achievement.id) };
}

const unlockedIn = (profile: PlayerProfile): AchievementId[] => profile.progression.unlockedAchievements;

describe('expanded achievement catalogue', () => {
  it('has 89 achievements across six categories, each with a unique name and badge', () => {
    expect(ACHIEVEMENTS).toHaveLength(89);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.name)).size).toBe(89);
    for (const category of ACHIEVEMENT_CATEGORIES) {
      expect(ACHIEVEMENTS.filter((achievement) => achievement.category === category).length).toBeGreaterThanOrEqual(3);
    }
    for (const achievement of ACHIEVEMENTS) {
      expect(isAchievementId(achievement.id)).toBe(true);
      expect(ACHIEVEMENT_BADGES[achievement.id]?.glyph.length).toBeGreaterThan(0);
      expect(badgeSvg(achievement.id).length).toBeLessThan(1500);
    }
  });
});

describe('gameplay, skill and comedy unlocks after a hand', () => {
  it('unlocks PULL UP A CHAIR on the first completed hand', () => {
    expect(settle(defaultProfile(), round([c('10'), c('8')], 'win')).ids).toContain('pull-up-a-chair');
  });

  it('unlocks DOUBLE TROUBLE for a doubled win and DOUBLE DOWN, FALL DOWN for a doubled bust', () => {
    expect(settle(defaultProfile(), round([c('5'), c('6'), c('10')], 'win', { doubled: true })).ids).toContain('double-trouble');
    const bust = settle(defaultProfile(), round([c('10'), c('6'), c('9')], 'loss', { doubled: true })).ids;
    expect(bust).toContain('double-down-fall-down');
    expect(bust).not.toContain('double-trouble');
  });

  it('unlocks SO CLOSE only for a bust of exactly 22', () => {
    expect(settle(defaultProfile(), round([c('10'), c('5'), c('7')], 'loss')).ids).toContain('so-close');
    expect(settle(defaultProfile(), round([c('10'), c('5'), c('9')], 'loss')).ids).not.toContain('so-close');
  });

  it('unlocks HAND-CRAFTED 21 for a winning three-card 21 but not a natural', () => {
    expect(settle(defaultProfile(), round([c('7'), c('7'), c('7')], 'win')).ids).toContain('hand-crafted');
    expect(settle(defaultProfile(), round([c('A'), c('K')], 'blackjack')).ids).not.toContain('hand-crafted');
  });

  it('unlocks FIVE CARD CHARLIE for a five-card win', () => {
    expect(settle(defaultProfile(), round([c('2'), c('3'), c('4'), c('2'), c('5')], 'win')).ids).toContain('five-card-charlie');
  });

  it('unlocks COMEBACK KID for a win right after three straight losses', () => {
    let profile = defaultProfile();
    for (let index = 0; index < 3; index += 1) profile = settle(profile, round([c('10'), c('7')], 'loss', { dealer: [c('10'), c('9')] })).profile;
    expect(profile.progression.currentLossStreak).toBe(3);
    expect(settle(profile, round([c('10'), c('9')], 'win')).ids).toContain('comeback-kid');
    expect(settle(defaultProfile(), round([c('10'), c('9')], 'win')).ids).not.toContain('comeback-kid');
  });

  it('unlocks ON FIRE after five straight wins and ROCK BOTTOM after ten straight losses', () => {
    let winner = defaultProfile();
    let ids: AchievementId[] = [];
    for (let index = 0; index < 5; index += 1) ({ profile: winner, ids } = settle(winner, round([c('10'), c('9')], 'win')));
    expect(ids).toContain('on-fire');
    expect(unlockedIn(winner)).not.toContain('untouchable');

    let loser = defaultProfile();
    for (let index = 0; index < 10; index += 1) loser = settle(loser, round([c('10'), c('7')], 'loss', { dealer: [c('10'), c('9')] })).profile;
    expect(unlockedIn(loser)).toContain('rock-bottom');
  });

  it('credits streaks and peaks already reached before this update', () => {
    const veteran = defaultProfile();
    veteran.stats.longestWinStreak = 12;
    veteran.stats.highestChipBalance = 15_000;
    const ids = settle(veteran, round([c('10'), c('7')], 'loss', { dealer: [c('10'), c('9')] })).ids;
    expect(ids).toEqual(expect.arrayContaining(['on-fire', 'untouchable', 'high-roller']));
  });

  it('unlocks SCARED MONEY, ALL IN and NIGHT OWL from the round context', () => {
    const ids = settle(defaultProfile(), round([c('5'), c('4')], 'loss'), { stoodOnLow: true, allIn: true, finishedHour: 2 }).ids;
    expect(ids).toEqual(expect.arrayContaining(['scared-money', 'all-in', 'night-owl']));
    const daytime = settle(defaultProfile(), round([c('10'), c('9')], 'win'), { finishedHour: 4 }).ids;
    expect(daytime).not.toContain('night-owl');
    expect(daytime).not.toContain('scared-money');
    expect(daytime).not.toContain('all-in');
  });

  it("counts Jak's House rounds and unlocks HOUSE GUEST at 25", () => {
    let profile = defaultProfile();
    for (let index = 0; index < 24; index += 1) profile = settle(profile, round([c('10'), c('9')], 'push'), { house: true }).profile;
    expect(profile.activity.houseRounds).toBe(24);
    expect(unlockedIn(profile)).not.toContain('house-guest');
    expect(settle(profile, round([c('10'), c('9')], 'push'), { house: true }).ids).toContain('house-guest');
    // Classic rounds never count toward it.
    expect(settle(defaultProfile(), round([c('10'), c('9')], 'push')).profile.activity.houseRounds).toBe(0);
  });

  it('unlocks MAXIMUM HEAT at a five-round Hot Hand streak', () => {
    expect(recordHotHand(defaultProfile(), 4).unlocked).toHaveLength(0);
    expect(recordHotHand(defaultProfile(), 5).unlocked.map((achievement) => achievement.id)).toEqual(['maximum-heat']);
  });
});

describe('daily and weekly log-ins', () => {
  const visits = (profile: PlayerProfile, dates: string[]): { profile: PlayerProfile; ids: AchievementId[] } => {
    const ids: AchievementId[] = [];
    for (const date of dates) {
      const update = recordVisit(profile, date);
      profile = update.profile;
      ids.push(...update.unlocked.map((achievement) => achievement.id));
    }
    return { profile, ids };
  };

  it('uses Monday-based weeks and whole local days', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(weekNumber('2026-09-27')).toBe(weekNumber('2026-09-21')); // Sunday and the Monday before
    expect(weekNumber('2026-09-28') - weekNumber('2026-09-27')).toBe(1); // Monday starts a new week
    expect(dayNumber('not-a-date')).toBeNaN();
  });

  it('builds a daily streak, ignores repeat visits the same day, and resets after a gap', () => {
    let { profile, ids } = visits(defaultProfile(), ['2026-09-01', '2026-09-01', '2026-09-02', '2026-09-03']);
    expect(profile.activity.visitStreak).toBe(3);
    expect(profile.activity.daysVisited).toBe(3);
    expect(ids).toEqual(['back-again']);

    ({ profile, ids } = visits(profile, ['2026-09-05']));
    expect(profile.activity.visitStreak).toBe(1);
    expect(profile.activity.longestVisitStreak).toBe(3);
    expect(ids).toEqual([]);
  });

  it('unlocks CREATURE OF HABIT at seven straight days', () => {
    const dates = Array.from({ length: 7 }, (_, index) => `2026-09-${String(index + 10).padStart(2, '0')}`);
    expect(visits(defaultProfile(), dates).ids).toEqual(['back-again', 'creature-of-habit']);
  });

  it('builds a weekly streak from one visit per week and unlocks WEEKLY REGULAR at four', () => {
    const { profile, ids } = visits(defaultProfile(), ['2026-09-07', '2026-09-16', '2026-09-20', '2026-09-25', '2026-09-28']);
    expect(profile.activity.weekStreak).toBe(4);
    expect(ids).toContain('weekly-regular');
    expect(profile.activity.visitStreak).toBe(1);
  });

  it('ignores a clock moved backwards and malformed dates', () => {
    const { profile } = visits(defaultProfile(), ['2026-09-10']);
    expect(recordVisit(profile, '2026-09-08').profile).toBe(profile);
    expect(recordVisit(profile, 'garbage').profile).toBe(profile);
  });
});

describe('Daily Hand, refill and deck achievements', () => {
  it('unlocks DAILY DOSE on the first Daily Hand and DAILY GRIND at ten Daily Hand wins', () => {
    const first = recordDailyHand(defaultProfile(), 'push');
    expect(first.unlocked.map((achievement) => achievement.id)).toEqual(['daily-dose']);
    expect(first.profile.activity).toMatchObject({ dailyHandsCompleted: 1, dailyWins: 0 });

    let profile = first.profile;
    let ids: AchievementId[] = [];
    for (let index = 0; index < 10; index += 1) {
      const update = recordDailyHand(profile, index % 2 ? 'win' : 'blackjack');
      profile = update.profile;
      ids = update.unlocked.map((achievement) => achievement.id);
    }
    expect(profile.activity.dailyWins).toBe(10);
    expect(ids).toEqual(['daily-grind']);
  });

  it('unlocks SAME PROBLEM, EVERY DAY on a seven-day Daily Hand streak', () => {
    const profile = defaultProfile();
    profile.daily.currentStreak = 7;
    expect(recordDailyHand(profile, 'push').unlocked.map((achievement) => achievement.id)).toContain('same-problem');
  });

  it('unlocks RESPONSIBLE GAMBLING once for the refill', () => {
    const first = recordRefill(defaultProfile());
    expect(first.unlocked.map((achievement) => achievement.id)).toEqual(['responsible-gambling']);
    expect(recordRefill(first.profile).unlocked).toHaveLength(0);
  });

  it('unlocks FASHION VICTIM after trying every deck, counting each deck once', () => {
    let profile = defaultProfile();
    for (const theme of ['standard', 'jak', 'jak']) profile = recordDeckTried(profile, theme, 3).profile;
    expect(profile.activity.decksTried).toEqual(['standard', 'jak']);
    expect(unlockedIn(profile)).not.toContain('fashion-victim');
    expect(recordDeckTried(profile, 'inspire', 3).unlocked.map((achievement) => achievement.id)).toEqual(['fashion-victim']);
    // Re-selecting a known deck changes nothing, so nothing is saved.
    expect(recordDeckTried(profile, 'jak', 3).profile).toBe(profile);
  });
});

describe('saved progress', () => {
  const originalWindow = globalThis.window;
  afterEach(() => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  });

  function installMemoryStorage(): Map<string, string> {
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
    return values;
  }

  it('loads a save from before activity tracking with fresh counters and keeps old unlocks', () => {
    installMemoryStorage();
    const legacy: Partial<PlayerProfile> = { ...defaultProfile(), chips: 900 };
    delete legacy.activity;
    legacy.progression = { ...defaultProfile().progression, unlockedAchievements: ['blackjak', 'jakpot'] };
    saveProfile(legacy as PlayerProfile);

    const loaded = loadProfile();
    expect(loaded.chips).toBe(900);
    expect(loaded.progression.unlockedAchievements).toEqual(['blackjak', 'jakpot']);
    expect(loaded.activity).toEqual(defaultProfile().activity);
  });

  it('round-trips activity and drops corrupted values', () => {
    installMemoryStorage();
    const profile = recordVisit(defaultProfile(), '2026-09-28').profile;
    profile.progression.unlockedAchievements = ['night-owl', 'season-ticket'];
    saveProfile(profile);
    expect(loadProfile().activity).toEqual(profile.activity);
    expect(loadProfile().progression.unlockedAchievements).toEqual(['night-owl', 'season-ticket']);

    saveProfile({ ...profile, activity: { visitStreak: -4, lastVisitWeek: 'x', decksTried: ['jak', 7, 'jak'] } } as unknown as PlayerProfile);
    const repaired = loadProfile().activity;
    expect(repaired.visitStreak).toBe(0);
    expect(repaired.lastVisitWeek).toBeNull();
    expect(repaired.decksTried).toEqual(['jak']);
  });
});

describe('Stats logbook for the expanded catalogue', () => {
  it('filters by achievement type and shows per-type counts', () => {
    const markup = achievementLogMarkup(['back-again'], 'all', 'visits');
    const ids = [...markup.matchAll(/<li [^>]*data-achievement-id="([^"]+)"[^>]*>/g)]
      .filter((match) => !/\shidden>$/.test(match[0]))
      .map((match) => match[1]);
    expect(ids).toEqual([
      'back-again', 'creature-of-habit', 'part-of-the-furniture', 'weekly-regular', 'season-ticket',
      'loyalty-program', 'permanent-resident', 'half-year-habit', 'anniversary', 'frequent-flyer',
    ]);
    expect(markup).toContain('data-achievement-type="visits"');
    expect(markup).toMatch(/data-achievement-category="visits"[^>]*aria-pressed="true"[^>]*>\s*Log-ins <b>1\/10<\/b>/);
    expect(markup).toMatch(/data-achievement-category="all"[^>]*aria-pressed="false"[^>]*>\s*Every type <b>1\/89<\/b>/);
    // The overall completion stays whole-logbook.
    expect(markup).toContain('<b>1/89</b>');
    expect(isAchievementCategoryFilter('comedy')).toBe(true);
    expect(isAchievementCategoryFilter('secret')).toBe(false);
  });

  it('tags each entry with its type and shows progress on locked count-based entries only', () => {
    const profile = defaultProfile();
    profile.stats.wins = 42;
    const markup = achievementLogMarkup(['golden-boy'], 'all', 'all', achievementProgress(profile));
    const entry = (id: string): string => markup.match(new RegExp(`<li[^>]*data-achievement-id="${id}"[\\s\\S]*?</li>`))?.[0] ?? '';
    expect(entry('professional-degenerate')).toContain('42 / 100');
    expect(entry('professional-degenerate')).toContain('achievement-tag is-gameplay');
    expect(entry('golden-boy')).not.toContain('achievement-progress');
    expect(entry('night-owl')).toContain('achievement-tag is-comedy');
    expect(entry('night-owl')).not.toContain('achievement-progress');
  });

  it('caps progress at the target', () => {
    const profile = defaultProfile();
    profile.stats.totalHands = 9999;
    expect(achievementProgress(profile)['this-is-fine']).toEqual({ current: 500, target: 500 });
  });

  it('renders the full logbook quickly enough to redraw on every tap', () => {
    const progress = achievementProgress(defaultProfile());
    const started = performance.now();
    for (let index = 0; index < 200; index += 1) achievementLogMarkup(['blackjak', 'night-owl'], 'all', 'all', progress);
    const perRender = (performance.now() - started) / 200;
    expect(perRender).toBeLessThan(5);
    // Every badge is drawn twice (shelf + entry); keep the page well under a quarter megabyte.
    expect(achievementLogMarkup([], 'all', 'all', progress).length).toBeLessThan(200_000);
  });
});
