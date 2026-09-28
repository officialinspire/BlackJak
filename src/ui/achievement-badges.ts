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

const round1 = (value: number): string => String(Math.round(value * 10) / 10);

/** Five-point star centred on (cx, cy). */
const star = (cx: number, cy: number, outer: number, inner: number): string => {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    return `${round1(cx + radius * Math.cos(angle))} ${round1(cy + radius * Math.sin(angle))}`;
  });
  return `<path class="badge-gold" d="M${points.join('L')}Z"/>`;
};

/** Calendar page with `days` ink dots (up to four per row). */
const calendar = (days: number): string => {
  const dots = Array.from({ length: days }, (_, index) => {
    const row = Math.floor(index / 4);
    const column = index % 4;
    return `<circle class="badge-ink" cx="${14.9 + column * 3.4}" cy="${20.6 + row * 3.6}" r="1.2"/>`;
  }).join('');
  return `<rect class="badge-cream" x="12" y="12.5" width="16" height="15" rx="1.6"/><rect class="badge-gold" x="12" y="12.5" width="16" height="4" rx="1.2"/>${dots}`;
};

/** Eight-tooth gear with an ink hub. */
const gear = (): string => {
  const teeth = Array.from({ length: 8 }, (_, index) =>
    `<rect class="badge-gold" x="18.4" y="10.6" width="3.2" height="4" rx=".6" transform="rotate(${index * 45} 20 20)"/>`).join('');
  return `${teeth}<circle class="badge-gold" cx="20" cy="20" r="6.6"/><circle class="badge-ink" cx="20" cy="20" r="2.6"/>`;
};

const chipPyramid = (): string =>
  [[14, 25.5], [20, 25.5], [26, 25.5], [17, 20], [23, 20], [20, 14.5]]
    .map(([cx, cy], index) => `<circle class="badge-${index % 2 ? 'cream' : 'gold'} badge-cut" cx="${cx}" cy="${cy}" r="3.3"/>`)
    .join('');

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
  // Gameplay milestones
  'pull-up-a-chair': {
    name: 'Bar Stool',
    glyph: `
      <ellipse class="badge-gold" cx="20" cy="14.5" rx="6.5" ry="2.2"/>
      <path class="badge-line" d="M15.8 16.6l-2 11.4M24.2 16.6l2 11.4M15 23.2h10"/>`,
  },
  'professional-degenerate': {
    name: 'Briefcase',
    glyph: `
      <path class="badge-line" d="M17 15.4v-2.2h6v2.2"/>
      <rect class="badge-cream" x="11.5" y="15.5" width="17" height="12" rx="1.8"/>
      <rect class="badge-gold" x="18.3" y="19.6" width="3.4" height="3" rx=".6"/>`,
  },
  'natural-talent': {
    name: 'Gold Star',
    glyph: star(20, 20.6, 9, 3.8),
  },
  'high-roller': {
    name: 'Money Bag',
    glyph: `
      <path class="badge-gold" d="M16.5 12.5h7l-1.6 3c3.6 1.4 6.1 4.6 6.1 8.1 0 2.6-2.4 4.3-8 4.3s-8-1.7-8-4.3c0-3.5 2.5-6.7 6.1-8.1z"/>
      <rect class="badge-ink" x="17" y="15" width="6" height="1.3" rx=".5"/>
      <circle class="badge-cream" cx="20" cy="22.8" r="2.4"/>`,
  },
  'house-guest': {
    name: 'Little House',
    glyph: `
      <path class="badge-gold" d="M20 10.5l9.5 8h-19z"/>
      <rect class="badge-cream" x="13" y="18.5" width="14" height="10" rx=".8"/>
      <rect class="badge-ink" x="18" y="22" width="4" height="6.5" rx=".6"/>`,
  },
  'this-is-fine': {
    name: 'Steaming Mug',
    glyph: `
      <path class="badge-gold" d="M15.5 10.5c1.8 1.8-1 3 .8 5h1.4c-1.8-2 1-3.2-.8-5zM19.5 10.5c1.8 1.8-1 3 .8 5h1.4c-1.8-2 1-3.2-.8-5z"/>
      <rect class="badge-cream" x="12.5" y="17" width="11" height="11" rx="1.6"/>
      <path class="badge-line" d="M23.5 19.5h1.6a2.4 2.4 0 0 1 0 4.8h-1.6"/>`,
  },
  // Skill
  'double-trouble': {
    name: 'Twin Chips',
    glyph: `
      <circle class="badge-cream badge-cut" cx="16" cy="20" r="6"/>
      <circle class="badge-gold badge-cut" cx="24" cy="20" r="6"/>
      <circle class="badge-ink" cx="24" cy="20" r="2.2"/>`,
  },
  'double-or-nothing': {
    name: 'Double Chevron',
    glyph: `
      <path class="badge-gold" d="M12 20l8-7 8 7-2.4 2.3L20 17.4l-5.6 4.9z"/>
      <path class="badge-cream" d="M12 27l8-7 8 7-2.4 2.3L20 24.4l-5.6 4.9z"/>`,
  },
  'on-fire': {
    name: 'Flame',
    glyph: `
      <path class="badge-gold" d="M20 9.5c1.2 4 6.8 6.6 6.8 12.2a6.8 6.8 0 0 1-13.6 0c0-3 1.6-5 3.3-6.3.2 2 1 3.2 2.2 3.8-.6-3.4.2-6.6 1.3-9.7z"/>
      <path class="badge-cream" d="M20 19c.8 2 3.1 3.1 3.1 5.4a3.1 3.1 0 0 1-6.2 0c0-1.9 1.4-3.2 3.1-5.4z"/>`,
  },
  untouchable: {
    name: 'Shield',
    glyph: `
      <path class="badge-cream" d="M20 10.5l8 3v6.3c0 4.6-3.3 8.1-8 9.7-4.7-1.6-8-5.1-8-9.7v-6.3z"/>
      <path class="badge-gold" d="M20 13.4l5.3 2v4.4c0 3.2-2.2 5.7-5.3 6.9z"/>`,
  },
  'five-card-charlie': {
    name: 'Top Hat',
    glyph: `
      <rect class="badge-cream" x="15" y="11.5" width="10" height="12.5" rx="1"/>
      <rect class="badge-gold" x="15" y="20" width="10" height="2.4"/>
      <rect class="badge-cream" x="11" y="24" width="18" height="2.8" rx="1.2"/>`,
  },
  'hand-crafted': {
    name: 'Three-Card Spread',
    glyph: `
      <rect class="badge-cream badge-cut" x="11" y="14.5" width="8" height="12" rx="1.2"/>
      <rect class="badge-cream badge-cut" x="16" y="12.5" width="8" height="12" rx="1.2"/>
      <rect class="badge-gold badge-cut" x="21" y="14.5" width="8" height="12" rx="1.2"/>`,
  },
  'comeback-kid': {
    name: 'Rebound Arrow',
    glyph: `
      <path class="badge-line" d="M11.5 15.5l5 8.5 8.6-10.6"/>
      <path class="badge-gold" d="M28.6 10.6l-.8 6.2-5-3.9z"/>`,
  },
  'maximum-heat': {
    name: 'Thermometer',
    glyph: `
      <rect class="badge-cream" x="18" y="10.5" width="4" height="13.5" rx="2"/>
      <circle class="badge-gold" cx="20" cy="25.5" r="4"/>
      <rect class="badge-gold" x="19" y="14.5" width="2" height="9.5"/>`,
  },
  // Visits: daily and weekly log-ins
  'back-again': {
    name: 'Three-Day Calendar',
    glyph: calendar(3),
  },
  'creature-of-habit': {
    name: 'Full-Week Calendar',
    glyph: calendar(7),
  },
  'part-of-the-furniture': {
    name: 'Armchair',
    glyph: `
      <rect class="badge-cream" x="14" y="11.5" width="12" height="10" rx="1.6"/>
      <rect class="badge-cream" x="11" y="17.5" width="4" height="9" rx="1.4"/>
      <rect class="badge-cream" x="25" y="17.5" width="4" height="9" rx="1.4"/>
      <rect class="badge-gold" x="14.6" y="20.5" width="10.8" height="4.5" rx="1"/>
      <path class="badge-line" d="M13 26.8v2M27 26.8v2"/>`,
  },
  'weekly-regular': {
    name: 'Tally of Four',
    glyph: `
      <path class="badge-line" d="M14 12.5v15M18 12.5v15M22 12.5v15M26 12.5v15"/>
      <path class="badge-gold" d="M11.6 24.4l16.3-9.6 1.1 1.9-16.3 9.6z"/>`,
  },
  'season-ticket': {
    name: 'Season Ticket',
    glyph: `
      <path class="badge-gold" d="M11 14.5h18v3.3a2.2 2.2 0 0 0 0 4.4v3.3H11v-3.3a2.2 2.2 0 0 0 0-4.4z"/>
      <rect class="badge-ink" x="22.5" y="15.5" width="1" height="9"/>
      <circle class="badge-cream" cx="16.8" cy="20" r="2.3"/>`,
  },
  // Daily Hand
  'daily-dose': {
    name: 'Sunrise',
    glyph: `
      <path class="badge-line" d="M20 11.5v3M12.9 14.9l2.1 2.1M27.1 14.9l-2.1 2.1"/>
      <path class="badge-gold" d="M13.5 24a6.5 6.5 0 0 1 13 0z"/>
      <rect class="badge-cream" x="11" y="24.8" width="18" height="2.2" rx="1"/>`,
  },
  'same-problem': {
    name: 'Infinity Loop',
    glyph: `
      <path class="badge-line" d="M20 20c-2.3-3-4.5-4.4-6.4-4.4a4.4 4.4 0 0 0 0 8.8c1.9 0 4.1-1.4 6.4-4.4s4.5-4.4 6.4-4.4a4.4 4.4 0 0 1 0 8.8c-1.9 0-4.1-1.4-6.4-4.4z"/>`,
  },
  'daily-grind': {
    name: 'Grinding Gear',
    glyph: gear(),
  },
  // Comedy
  'so-close': {
    name: 'Near-Miss Target',
    glyph: `
      <circle class="badge-line" cx="19" cy="21" r="7.5"/>
      <circle class="badge-line" cx="19" cy="21" r="3.2"/>
      <circle class="badge-gold" cx="27.6" cy="12.8" r="2.1"/>`,
  },
  'scared-money': {
    name: 'White Flag',
    glyph: `
      <path class="badge-line" d="M14 11v18"/>
      <path class="badge-cream" d="M15 11.5c3-1.5 5.5 1.5 8.5 0s4 0 4 0v8c-3 1.5-5.5-1.5-8.5 0s-4 0-4 0z"/>`,
  },
  'rock-bottom': {
    name: 'Rock Bottom Arrow',
    glyph: `
      <path class="badge-gold" d="M17.5 10.5h5v8.5h4L20 25.5 13.5 19h4z"/>
      <rect class="badge-cream" x="11" y="27" width="18" height="2.4" rx="1"/>`,
  },
  'responsible-gambling': {
    name: 'Piggy Bank',
    glyph: `
      <circle class="badge-gold" cx="20.2" cy="11.8" r="2.2"/>
      <ellipse class="badge-cream" cx="20" cy="21" rx="8" ry="6"/>
      <rect class="badge-cream" x="14.5" y="25" width="2.6" height="4" rx=".8"/>
      <rect class="badge-cream" x="22.9" y="25" width="2.6" height="4" rx=".8"/>
      <path class="badge-cream" d="M14.4 16.8l-1.2-3.4 3.8 1.8z"/>
      <rect class="badge-ink" x="18" y="15.8" width="4.4" height="1.2" rx=".6"/>`,
  },
  'all-in': {
    name: 'Chip Pyramid',
    glyph: chipPyramid(),
  },
  'double-down-fall-down': {
    name: 'Cracked Chip',
    glyph: `
      <path class="badge-gold" d="M19 12a8 8 0 0 0 0 16l-2-4 2.5-3-2.5-4z"/>
      <path class="badge-cream" d="M21.5 12a8 8 0 0 1 0 16l-2-4 2.5-3-2.5-4z"/>`,
  },
  'night-owl': {
    name: 'Crescent Moon',
    glyph: `
      <path class="badge-gold" d="M22.5 11a9 9 0 1 0 6.5 13.2 7.2 7.2 0 0 1-6.5-13.2z"/>
      <circle class="badge-cream" cx="26.6" cy="13.6" r="1.4"/>`,
  },
  'fashion-victim': {
    name: 'Paint Palette',
    glyph: `
      <path class="badge-cream" d="M20 11c5.5 0 9 3.6 9 8 0 3-2.4 3.4-4.3 3.4-1.6 0-2.2 1-1.6 2.4.7 1.7-.4 3.2-3.1 3.2-5 0-9-3.8-9-8.5S14.5 11 20 11z"/>
      <circle class="badge-gold" cx="16" cy="17" r="1.7"/>
      <circle class="badge-ink" cx="21" cy="15" r="1.7"/>
      <circle class="badge-gold" cx="15.5" cy="22.5" r="1.7"/>`,
  },
};

export function achievementBadge(id: AchievementId): AchievementBadge {
  return ACHIEVEMENT_BADGES[id];
}

const svgCache = new Map<AchievementId, string>();

/**
 * Decorative SVG only; callers supply the accessible name. Built once per badge
 * with the source indentation stripped: the Stats logbook draws every badge
 * twice (shelf and entry) and redraws on each filter tap.
 */
export function badgeSvg(id: AchievementId): string {
  let svg = svgCache.get(id);
  if (!svg) {
    svg = `<svg class="badge-svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
      <circle class="badge-rim" cx="20" cy="20" r="19"/>
      <circle class="badge-notches" cx="20" cy="20" r="17.2"/>
      <circle class="badge-face" cx="20" cy="20" r="15"/>
      <circle class="badge-inlay" cx="20" cy="20" r="13.6"/>
      <g class="badge-glyph">${ACHIEVEMENT_BADGES[id].glyph}</g>
    </svg>`.replace(/>\s+</g, '><');
    svgCache.set(id, svg);
  }
  return svg;
}

/** A labelled badge image: `role="img"` carries the badge name and earned state. */
export function badgeMarkup(id: AchievementId, earned: boolean, className = 'achievement-badge'): string {
  const label = `${ACHIEVEMENT_BADGES[id].name} badge, ${earned ? 'earned' : 'locked'}`;
  return `<span class="${className} ${earned ? 'is-earned' : 'is-locked'}" role="img" aria-label="${label}" data-badge="${id}">${badgeSvg(id)}</span>`;
}
