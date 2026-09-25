import { afterEach, describe, expect, it } from 'vitest';
import progressionCss from '../src/styles/progression.css?raw';
import renderSource from '../src/ui/render.ts?raw';
import { ACHIEVEMENTS } from '../src/data/progression';
import { unlockAchievementIds } from '../src/game';
import { defaultProfile, loadProfile, saveProfile } from '../src/storage/profile';
import type { AchievementId } from '../src/types/profile';
import {
  ACHIEVEMENT_FILTERS,
  achievementLogbook,
  achievementLogMarkup,
  isAchievementFilter,
} from '../src/ui/achievement-log';

const ALL_IDS: AchievementId[] = [
  'blackjak',
  'why-would-you-do-that',
  'split-personality',
  'golden-boy',
  'house-money',
  'i-can-quit-anytime',
  'again',
  'jakpot',
  'absolute-bullshii',
];

const entryIds = (markup: string, group?: 'unlocked' | 'locked'): string[] => {
  const scope = group
    ? markup.match(new RegExp(`<section class="achievement-group is-${group}"[\\s\\S]*?</section>`))?.[0] ?? ''
    : markup;
  return [...scope.matchAll(/data-achievement-id="([^"]+)"/g)].map((match) => match[1]);
};

const originalWindow = globalThis.window;

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
});

describe('achievement logbook', () => {
  it('keeps all nine achievement IDs in catalogue order', () => {
    expect(ACHIEVEMENTS.map((achievement) => achievement.id)).toEqual(ALL_IDS);
    expect(entryIds(achievementLogMarkup([], 'all'))).toEqual(ALL_IDS);
  });

  it('groups unlocked entries ahead of locked ones in the All view with a completion count', () => {
    const markup = achievementLogMarkup(['jakpot', 'blackjak'], 'all');
    expect(entryIds(markup, 'unlocked')).toEqual(['blackjak', 'jakpot']);
    expect(entryIds(markup, 'locked')).toEqual(ALL_IDS.filter((id) => id !== 'blackjak' && id !== 'jakpot'));
    expect(markup.indexOf('is-unlocked')).toBeLessThan(markup.indexOf('achievement-group is-locked'));
    expect(markup).toContain('<b>2/9</b>');
    expect(markup).toContain('<strong>2 of 9</strong> unlocked');
    expect(markup).toContain('aria-valuenow="2"');
    expect(markup).toContain('aria-valuemax="9"');
    expect(markup).toContain('width: 22%');
  });

  it('filters to only unlocked or only locked entries', () => {
    const unlocked: AchievementId[] = ['golden-boy', 'again'];
    const onlyUnlocked = achievementLogMarkup(unlocked, 'unlocked');
    expect(entryIds(onlyUnlocked)).toEqual(['golden-boy', 'again']);
    expect(onlyUnlocked).not.toContain('achievement-group is-locked');

    const onlyLocked = achievementLogMarkup(unlocked, 'locked');
    expect(entryIds(onlyLocked)).toHaveLength(7);
    expect(entryIds(onlyLocked)).not.toContain('golden-boy');
    expect(onlyLocked).not.toContain('achievement-group is-unlocked');
  });

  it('marks the selected filter and shows per-filter counts', () => {
    const markup = achievementLogMarkup(['blackjak'], 'locked');
    expect(markup).toContain('data-achievement-view="locked"');
    for (const filter of ACHIEVEMENT_FILTERS) {
      const button = markup.match(new RegExp(`<button[^>]*data-achievement-filter="${filter}"[^>]*>[\\s\\S]*?</button>`))?.[0];
      expect(button).toBeDefined();
      expect(button).toContain(`aria-pressed="${filter === 'locked'}"`);
    }
    expect(markup).toMatch(/data-achievement-filter="all"[^>]*>\s*All <b>9<\/b>/);
    expect(markup).toMatch(/data-achievement-filter="unlocked"[^>]*>\s*Unlocked <b>1<\/b>/);
    expect(markup).toMatch(/data-achievement-filter="locked"[^>]*>\s*Locked <b>8<\/b>/);
  });

  it('shows friendly empty states for both groups', () => {
    expect(achievementLogMarkup([], 'unlocked')).toContain('achievement-empty');
    expect(achievementLogMarkup(ALL_IDS, 'locked')).toContain('The logbook is complete.');
    expect(achievementLogbook(ALL_IDS).percent).toBe(100);
  });

  it('only accepts known filter values', () => {
    expect(ACHIEVEMENT_FILTERS.every(isAchievementFilter)).toBe(true);
    expect(isAchievementFilter('everything')).toBe(false);
    expect(isAchievementFilter(undefined)).toBe(false);
  });
});

describe('existing unlock display', () => {
  it('shows achievements unlocked through progression as unlocked', () => {
    const { profile, unlocked } = unlockAchievementIds(defaultProfile(), ['why-would-you-do-that']);
    expect(unlocked.map((achievement) => achievement.id)).toEqual(['why-would-you-do-that']);
    const markup = achievementLogMarkup(profile.progression.unlockedAchievements, 'all');
    expect(markup).toMatch(/achievement-entry is-unlocked" data-achievement-id="why-would-you-do-that"/);
    expect(markup).toMatch(/achievement-entry is-locked" data-achievement-id="blackjak"/);
  });

  it('reads unlocks back from saved progress', () => {
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
    const profile = defaultProfile();
    profile.progression.unlockedAchievements = ['house-money', 'absolute-bullshii'];
    saveProfile(profile);

    const markup = achievementLogMarkup(loadProfile().progression.unlockedAchievements, 'unlocked');
    expect(entryIds(markup)).toEqual(['house-money', 'absolute-bullshii']);
  });
});

describe('Stats screen wiring', () => {
  it('renders the logbook from the model filter and keeps it across re-renders', () => {
    expect(renderSource).toContain('achievementLogMarkup(model.profile.progression.unlockedAchievements, model.achievementFilter)');
    expect(renderSource).toMatch(/achievementFilter: 'all',/);
    // Only the filter click handler assigns it; screen changes and re-renders leave it alone.
    expect(renderSource.match(/model\.achievementFilter = /g)).toHaveLength(1);
    expect(renderSource).toContain("'data-achievement-filter',");
    expect(renderSource).toContain("querySelectorAll<HTMLButtonElement>('[data-achievement-filter]')");
  });

  it('keeps achievement toasts on the table screens', () => {
    expect(renderSource.match(/\$\{achievementToastMarkup\(\)\}/g)).toHaveLength(2);
    expect(renderSource).toContain('ACHIEVEMENT UNLOCKED');
  });

  it('keeps filter targets touch-sized and entries single-column on phones', () => {
    expect(progressionCss).toMatch(/\.achievement-filter\s*{[^}]*min-height:\s*44px/s);
    expect(progressionCss).toMatch(/@media \(max-width: 520px\)\s*{\s*\.achievement-entry\s*{[^}]*grid-template-columns:\s*auto minmax\(0,1fr\)/s);
    expect(progressionCss).not.toContain('.achievement-grid');
  });
});
