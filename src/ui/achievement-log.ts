import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CATEGORY_LABELS,
  isAchievementCategory,
  type AchievementCategory,
  type AchievementDefinition,
} from '../data/progression';
import type { AchievementProgress } from '../game/activity';
import type { AchievementId } from '../types/profile';
import { escapeHtml } from '../util/html';
import { badgeMarkup, badgeSvg } from './achievement-badges';

/** Which achievements the Stats-screen logbook is showing. */
export type AchievementFilter = 'all' | 'unlocked' | 'locked';

export const ACHIEVEMENT_FILTERS: readonly AchievementFilter[] = ['all', 'unlocked', 'locked'];

const FILTER_LABELS: Record<AchievementFilter, string> = {
  all: 'All',
  unlocked: 'Unlocked',
  locked: 'Locked',
};

export function isAchievementFilter(value: unknown): value is AchievementFilter {
  return typeof value === 'string' && (ACHIEVEMENT_FILTERS as readonly string[]).includes(value);
}

/** Which kind of achievement the logbook lists: every category, or one. */
export type AchievementCategoryFilter = 'all' | AchievementCategory;

export const ACHIEVEMENT_CATEGORY_FILTERS: readonly AchievementCategoryFilter[] = ['all', ...ACHIEVEMENT_CATEGORIES];

export function isAchievementCategoryFilter(value: unknown): value is AchievementCategoryFilter {
  return value === 'all' || isAchievementCategory(value);
}

export type AchievementProgressMap = Partial<Record<AchievementId, AchievementProgress>>;

export interface AchievementLogbook {
  unlocked: AchievementDefinition[];
  locked: AchievementDefinition[];
  total: number;
  percent: number;
}

/** Splits the catalogue into unlocked/locked groups, keeping catalogue order within each. */
export function achievementLogbook(unlockedIds: Iterable<AchievementId>): AchievementLogbook {
  const unlockedSet = new Set(unlockedIds);
  const unlocked = ACHIEVEMENTS.filter((achievement) => unlockedSet.has(achievement.id));
  const locked = ACHIEVEMENTS.filter((achievement) => !unlockedSet.has(achievement.id));
  const total = ACHIEVEMENTS.length;
  return { unlocked, locked, total, percent: total > 0 ? Math.round((unlocked.length / total) * 100) : 0 };
}

const formatCount = (value: number): string => new Intl.NumberFormat('en-US').format(value);

function progressMarkup(progress: AchievementProgress | undefined): string {
  if (!progress || progress.target <= 0) return '';
  const percent = Math.round((progress.current / progress.target) * 100);
  return `
        <span class="achievement-progress" aria-label="Progress ${formatCount(progress.current)} of ${formatCount(progress.target)}">
          <span class="achievement-progress-track" aria-hidden="true"><span style="width: ${percent}%"></span></span>
          <small>${formatCount(progress.current)} / ${formatCount(progress.target)}</small>
        </span>`;
}

function entryMarkup(achievement: AchievementDefinition, unlocked: boolean, progress: AchievementProgressMap): string {
  const number = String(ACHIEVEMENTS.indexOf(achievement) + 1).padStart(2, '0');
  return `
    <li class="achievement-entry ${unlocked ? 'is-unlocked' : 'is-locked'}" data-achievement-id="${achievement.id}" data-category="${achievement.category}">
      ${badgeMarkup(achievement.id, unlocked)}
      <div class="achievement-entry-copy">
        <strong>${escapeHtml(achievement.name)}</strong>
        <p>${escapeHtml(achievement.description)}</p>${unlocked ? '' : progressMarkup(progress[achievement.id])}
      </div>
      <span class="achievement-entry-meta"><small>No.${number}</small><em class="achievement-tag is-${achievement.category}">${ACHIEVEMENT_CATEGORY_LABELS[achievement.category]}</em><b>${unlocked ? 'UNLOCKED' : 'LOCKED'}</b></span>
    </li>`;
}

function groupMarkup(kind: 'unlocked' | 'locked', entries: AchievementDefinition[], progress: AchievementProgressMap, wholeLog: boolean): string {
  const heading = kind === 'unlocked' ? 'Unlocked' : 'Locked';
  const empty = kind === 'unlocked'
    ? 'Nothing logged yet. Play a few hands and Jak will start keeping score.'
    : wholeLog ? 'Every achievement unlocked. The logbook is complete.' : 'Every achievement of this type is unlocked.';
  const headingId = `achievement-group-${kind}`;
  return `
    <section class="achievement-group is-${kind}" aria-labelledby="${headingId}">
      <h3 id="${headingId}" class="achievement-group-heading"><span>${heading}</span><b>${entries.length}</b></h3>
      ${entries.length
        ? `<ol class="achievement-list">${entries.map((achievement) => entryMarkup(achievement, kind === 'unlocked', progress)).join('')}</ol>`
        : `<p class="achievement-empty">${empty}</p>`}
    </section>`;
}

/**
 * Every badge at a glance, earned ones lit and the rest as silhouettes.
 * Decorative: each entry below carries the badge's accessible name.
 */
function badgeShelfMarkup(unlockedSet: ReadonlySet<AchievementId>): string {
  return `
      <div class="badge-shelf" aria-hidden="true">${ACHIEVEMENTS.map((achievement) => {
        const earned = unlockedSet.has(achievement.id);
        return `<span class="badge-shelf-slot ${earned ? 'is-earned' : 'is-locked'}" data-badge="${achievement.id}">${badgeSvg(achievement.id)}</span>`;
      }).join('')}
      </div>`;
}

/** The browsable achievement logbook on the Stats screen. */
export function achievementLogMarkup(
  unlockedIds: Iterable<AchievementId>,
  filter: AchievementFilter,
  category: AchievementCategoryFilter = 'all',
  progress: AchievementProgressMap = {},
): string {
  const unlockedSet = new Set(unlockedIds);
  const log = achievementLogbook(unlockedSet);
  const inCategory = (achievement: AchievementDefinition): boolean => category === 'all' || achievement.category === category;
  const shownUnlocked = log.unlocked.filter(inCategory);
  const shownLocked = log.locked.filter(inCategory);
  const counts: Record<AchievementFilter, number> = {
    all: shownUnlocked.length + shownLocked.length,
    unlocked: shownUnlocked.length,
    locked: shownLocked.length,
  };
  const chips = ACHIEVEMENT_FILTERS.map((option) => `
        <button type="button" class="achievement-filter${option === filter ? ' is-selected' : ''}" data-achievement-filter="${option}" aria-pressed="${option === filter}">
          ${FILTER_LABELS[option]} <b>${counts[option]}</b>
        </button>`).join('');

  const categoryChips = ACHIEVEMENT_CATEGORY_FILTERS.map((option) => {
    const total = option === 'all' ? log.total : ACHIEVEMENTS.filter((achievement) => achievement.category === option).length;
    const earned = option === 'all' ? log.unlocked.length : log.unlocked.filter((achievement) => achievement.category === option).length;
    const label = option === 'all' ? 'Every type' : ACHIEVEMENT_CATEGORY_LABELS[option];
    return `
        <button type="button" class="achievement-category${option === category ? ' is-selected' : ''}" data-achievement-category="${option}" aria-pressed="${option === category}">
          ${label} <b>${earned}/${total}</b>
        </button>`;
  }).join('');

  const groups = [
    filter !== 'locked' ? groupMarkup('unlocked', shownUnlocked, progress, category === 'all') : '',
    filter !== 'unlocked' ? groupMarkup('locked', shownLocked, progress, category === 'all') : '',
  ].join('');

  return `
    <div class="achievement-section achievement-log" data-achievement-view="${filter}" data-achievement-type="${category}">
      <div class="section-heading"><span>ACHIEVEMENT LOGBOOK</span><b>${log.unlocked.length}/${log.total}</b></div>
      <div class="achievement-completion">
        <p><strong>${log.unlocked.length} of ${log.total}</strong> unlocked <span>${log.percent}%</span></p>
        <div class="achievement-completion-track" role="progressbar" aria-label="Achievements unlocked" aria-valuemin="0" aria-valuemax="${log.total}" aria-valuenow="${log.unlocked.length}" aria-valuetext="${log.unlocked.length} of ${log.total} unlocked">
          <span style="width: ${log.percent}%"></span>
        </div>
      </div>
      ${badgeShelfMarkup(unlockedSet)}
      <div class="achievement-categories" role="group" aria-label="Achievement type">${categoryChips}
      </div>
      <div class="achievement-filters" role="group" aria-label="Filter achievements">${chips}
      </div>
      ${groups}
    </div>`;
}
