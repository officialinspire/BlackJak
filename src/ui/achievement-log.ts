import { ACHIEVEMENTS, type AchievementDefinition } from '../data/progression';
import type { AchievementId } from '../types/profile';
import { escapeHtml } from '../util/html';

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

function entryMarkup(achievement: AchievementDefinition, unlocked: boolean): string {
  const number = String(ACHIEVEMENTS.indexOf(achievement) + 1).padStart(2, '0');
  return `
    <li class="achievement-entry ${unlocked ? 'is-unlocked' : 'is-locked'}" data-achievement-id="${achievement.id}">
      <span class="achievement-mark" aria-hidden="true">${unlocked ? '◆' : '◇'}</span>
      <div class="achievement-entry-copy">
        <strong>${escapeHtml(achievement.name)}</strong>
        <p>${escapeHtml(achievement.description)}</p>
      </div>
      <span class="achievement-entry-meta"><small>No.${number}</small><b>${unlocked ? 'UNLOCKED' : 'LOCKED'}</b></span>
    </li>`;
}

function groupMarkup(kind: 'unlocked' | 'locked', entries: AchievementDefinition[]): string {
  const heading = kind === 'unlocked' ? 'Unlocked' : 'Locked';
  const empty = kind === 'unlocked'
    ? 'Nothing logged yet. Play a few hands and Jak will start keeping score.'
    : 'Every achievement unlocked. The logbook is complete.';
  const headingId = `achievement-group-${kind}`;
  return `
    <section class="achievement-group is-${kind}" aria-labelledby="${headingId}">
      <h3 id="${headingId}" class="achievement-group-heading"><span>${heading}</span><b>${entries.length}</b></h3>
      ${entries.length
        ? `<ol class="achievement-list">${entries.map((achievement) => entryMarkup(achievement, kind === 'unlocked')).join('')}</ol>`
        : `<p class="achievement-empty">${empty}</p>`}
    </section>`;
}

/** The browsable achievement logbook on the Stats screen. */
export function achievementLogMarkup(unlockedIds: Iterable<AchievementId>, filter: AchievementFilter): string {
  const log = achievementLogbook(unlockedIds);
  const counts: Record<AchievementFilter, number> = {
    all: log.total,
    unlocked: log.unlocked.length,
    locked: log.locked.length,
  };
  const chips = ACHIEVEMENT_FILTERS.map((option) => `
        <button type="button" class="achievement-filter${option === filter ? ' is-selected' : ''}" data-achievement-filter="${option}" aria-pressed="${option === filter}">
          ${FILTER_LABELS[option]} <b>${counts[option]}</b>
        </button>`).join('');

  const groups = [
    filter !== 'locked' ? groupMarkup('unlocked', log.unlocked) : '',
    filter !== 'unlocked' ? groupMarkup('locked', log.locked) : '',
  ].join('');

  return `
    <div class="achievement-section achievement-log" data-achievement-view="${filter}">
      <div class="section-heading"><span>ACHIEVEMENT LOGBOOK</span><b>${log.unlocked.length}/${log.total}</b></div>
      <div class="achievement-completion">
        <p><strong>${log.unlocked.length} of ${log.total}</strong> unlocked <span>${log.percent}%</span></p>
        <div class="achievement-completion-track" role="progressbar" aria-label="Achievements unlocked" aria-valuemin="0" aria-valuemax="${log.total}" aria-valuenow="${log.unlocked.length}" aria-valuetext="${log.unlocked.length} of ${log.total} unlocked">
          <span style="width: ${log.percent}%"></span>
        </div>
      </div>
      <div class="achievement-filters" role="group" aria-label="Filter achievements">${chips}
      </div>
      ${groups}
    </div>`;
}
