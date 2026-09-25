import type { AchievementId } from '../types/profile';

/**
 * Small inline-SVG badges for the achievement logbook. Every badge shares the
 * same chip-style frame (wood rim, gold notches, felt face) and a glyph drawn
 * from classed shapes, so CSS alone turns an earned badge into a locked
 * silhouette. No gradients or ids: the same badge can appear several times on
 * a page without clashing.
 */
export interface AchievementBadge {
  /** Human-readable badge name, used for screen readers. */
  name: string;
  /** SVG shapes drawn on the 40×40 badge face. */
  glyph: string;
}

const diamond = (cx: number, cy: number): string =>
  `<path class="badge-gold" d="M${cx} ${cy - 4.6}L${cx + 3.3} ${cy}L${cx} ${cy + 4.6}L${cx - 3.3} ${cy}Z"/>`;

const fanCard = (angle: number, tone: 'cream' | 'gold'): string =>
  `<rect class="badge-${tone} badge-cut" x="17.4" y="11.5" width="5.2" height="14" rx="1" transform="rotate(${angle} 20 28)"/>`;

export const ACHIEVEMENT_BADGES: Readonly<Record<AchievementId, AchievementBadge>> = {
  blackjak: {
    name: 'Ace of Spades',
    glyph: `
      <rect class="badge-cream" x="13.5" y="10.5" width="13" height="19" rx="2"/>
      <path class="badge-ink" d="M20 14.2c2.7 2.7 4.6 4 4.6 6 0 1.5-1.1 2.4-2.4 2.4-.8 0-1.5-.3-1.8-.8l.7 2.6h-2.2l.7-2.6c-.3.5-1 .8-1.8.8-1.3 0-2.4-.9-2.4-2.4 0-2 1.9-3.3 4.6-6z"/>`,
  },
  'why-would-you-do-that': {
    name: 'Question Mark on 20',
    glyph: `
      <path class="badge-line" d="M15.8 15.6c0-2.5 1.9-4.2 4.2-4.2s4.2 1.6 4.2 3.8c0 3-4.2 3.1-4.2 6.4"/>
      <circle class="badge-gold" cx="20" cy="26.6" r="1.8"/>`,
  },
  'split-personality': {
    name: 'Split Pair',
    glyph: `
      <rect class="badge-cream badge-cut" x="10.8" y="12.5" width="9.4" height="14" rx="1.6" transform="rotate(-14 15.5 19.5)"/>
      <rect class="badge-gold badge-cut" x="19.8" y="12.5" width="9.4" height="14" rx="1.6" transform="rotate(14 24.5 19.5)"/>`,
  },
  'golden-boy': {
    name: 'Golden Crown',
    glyph: `
      <path class="badge-gold" d="M11 25l1-11 4.5 5L20 12l3.5 7 4.5-5 1 11z"/>
      <rect class="badge-cream" x="11" y="25.6" width="18" height="2.6" rx=".8"/>`,
  },
  'house-money': {
    name: 'Chip Stack',
    glyph: `
      <ellipse class="badge-cream badge-cut" cx="20" cy="26" rx="8.2" ry="3"/>
      <ellipse class="badge-gold badge-cut" cx="20" cy="22.4" rx="8.2" ry="3"/>
      <ellipse class="badge-cream badge-cut" cx="20" cy="18.8" rx="8.2" ry="3"/>
      <ellipse class="badge-gold badge-cut" cx="20" cy="15.2" rx="8.2" ry="3"/>
      <ellipse class="badge-ink" cx="20" cy="15.2" rx="3.6" ry="1.2"/>`,
  },
  'i-can-quit-anytime': {
    name: 'Hourglass',
    glyph: `
      <path class="badge-cream" d="M14 11h12v2c0 3-3.5 5-4.5 7 1 2 4.5 4 4.5 7v2H14v-2c0-3 3.5-5 4.5-7-1-2-4.5-4-4.5-7z"/>
      <path class="badge-gold" d="M17 14.4h6c-.5 1.3-2 2.4-3 3.2-1-.8-2.5-1.9-3-3.2zM16.9 27.2h6.2c0-1.6-1.8-2.8-3.1-3.7-1.3.9-3.1 2.1-3.1 3.7z"/>`,
  },
  again: {
    name: 'Replay Arrow',
    glyph: `
      <path class="badge-line" d="M27 20a7 7 0 1 1-2.05-4.95"/>
      <path class="badge-gold" d="M27.3 17.4l-.9-5.3-4.4 4.3z"/>`,
  },
  jakpot: {
    name: 'Triple Diamond',
    glyph: `${diamond(20, 14.4)}${diamond(14.8, 23.4)}${diamond(25.2, 23.4)}`,
  },
  'absolute-bullshii': {
    name: 'Five-Card Fan',
    glyph: [fanCard(-30, 'cream'), fanCard(-15, 'cream'), fanCard(0, 'cream'), fanCard(15, 'cream'), fanCard(30, 'gold')].join(''),
  },
};

export function achievementBadge(id: AchievementId): AchievementBadge {
  return ACHIEVEMENT_BADGES[id];
}

/** Decorative SVG only; callers supply the accessible name. */
export function badgeSvg(id: AchievementId): string {
  return `<svg class="badge-svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
      <circle class="badge-rim" cx="20" cy="20" r="19"/>
      <circle class="badge-notches" cx="20" cy="20" r="17.2"/>
      <circle class="badge-face" cx="20" cy="20" r="15"/>
      <circle class="badge-inlay" cx="20" cy="20" r="13.6"/>
      <g class="badge-glyph">${ACHIEVEMENT_BADGES[id].glyph}</g>
    </svg>`;
}

/** A labelled badge image: `role="img"` carries the badge name and earned state. */
export function badgeMarkup(id: AchievementId, earned: boolean, className = 'achievement-badge'): string {
  const label = `${ACHIEVEMENT_BADGES[id].name} badge, ${earned ? 'earned' : 'locked'}`;
  return `<span class="${className} ${earned ? 'is-earned' : 'is-locked'}" role="img" aria-label="${label}" data-badge="${id}">${badgeSvg(id)}</span>`;
}
