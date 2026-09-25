import { describe, expect, it } from 'vitest';
import progressionCss from '../src/styles/progression.css?raw';
import renderSource from '../src/ui/render.ts?raw';
import { ACHIEVEMENTS } from '../src/data/progression';
import { ACHIEVEMENT_BADGES, badgeMarkup, badgeSvg } from '../src/ui/achievement-badges';
import { achievementLogMarkup } from '../src/ui/achievement-log';

const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
const glyphOf = (svg: string): string => svg.match(/<g class="badge-glyph">([\s\S]*?)<\/g>/)?.[1].trim() ?? '';

describe('achievement badges', () => {
  it('gives each of the nine achievements a distinct named badge', () => {
    expect(Object.keys(ACHIEVEMENT_BADGES).sort()).toEqual([...ids].sort());
    const names = ids.map((id) => ACHIEVEMENT_BADGES[id].name);
    const glyphs = ids.map((id) => glyphOf(badgeSvg(id)));
    expect(new Set(names).size).toBe(9);
    expect(new Set(glyphs).size).toBe(9);
    for (const glyph of glyphs) expect(glyph.length).toBeGreaterThan(0);
  });

  it('is lightweight inline SVG with fixed dimensions and no emoji, ids, or external assets', () => {
    for (const id of ids) {
      const svg = badgeSvg(id);
      expect(svg).toMatch(/^<svg class="badge-svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">/);
      expect(svg).not.toMatch(/\bid=|href=|<image|<text|url\(/);
      expect(svg).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(svg.length).toBeLessThan(1500);
    }
  });

  it('labels badges for screen readers with name and earned state', () => {
    expect(badgeMarkup('blackjak', true)).toContain('role="img" aria-label="Ace of Spades badge, earned"');
    expect(badgeMarkup('jakpot', false)).toContain('role="img" aria-label="Triple Diamond badge, locked"');
    expect(badgeMarkup('jakpot', false)).toContain('class="achievement-badge is-locked"');
  });

  it('shows earned badges lit and locked badges as silhouettes in the logbook', () => {
    const markup = achievementLogMarkup(['golden-boy'], 'all');
    expect(markup).toMatch(/data-achievement-id="golden-boy"[\s\S]*?achievement-badge is-earned" role="img" aria-label="Golden Crown badge, earned"/);
    expect(markup).toMatch(/data-achievement-id="blackjak"[\s\S]*?achievement-badge is-locked" role="img" aria-label="Ace of Spades badge, locked"/);
    expect(markup.match(/role="img"/g)).toHaveLength(9);
  });

  it('adds a decorative shelf of all nine badges in catalogue order', () => {
    const markup = achievementLogMarkup(['again', 'jakpot'], 'locked');
    const shelf = markup.match(/<div class="badge-shelf" aria-hidden="true">[\s\S]*?<\/div>/)?.[0] ?? '';
    const slots = [...shelf.matchAll(/badge-shelf-slot (is-\w+)" data-badge="([^"]+)"/g)];
    expect(slots.map((slot) => slot[2])).toEqual(ids);
    expect(slots.filter((slot) => slot[1] === 'is-earned').map((slot) => slot[2])).toEqual(['again', 'jakpot']);
  });

  it('uses the achievement badge in the unlock toast', () => {
    expect(renderSource).toContain('<span class="toast-icon" aria-hidden="true">${badgeSvg(achievement.id)}</span>');
  });

  it('styles badges in wood, cream, and gold, flattens locked ones, and reserves their space', () => {
    expect(progressionCss).toMatch(/--badge-cream:\s*var\(--bj-cream\)/);
    expect(progressionCss).toMatch(/--badge-gold:\s*var\(--bj-gold-bright\)/);
    const locked = progressionCss.match(/\.achievement-badge\.is-locked,\s*\.badge-shelf-slot\.is-locked\s*{([^}]*)}/)?.[1] ?? '';
    expect(locked).toMatch(/--badge-cream:\s*(#[0-9a-f]+)/);
    expect(locked.match(/--badge-cream:\s*(#[0-9a-f]+)/)?.[1]).toBe(locked.match(/--badge-gold:\s*(#[0-9a-f]+)/)?.[1]);
    expect(progressionCss).toMatch(/\.achievement-badge\s*{\s*width:\s*44px;\s*height:\s*44px;/);
    expect(progressionCss).toMatch(/\.badge-shelf-slot\s*{[^}]*aspect-ratio:\s*1/);
    expect(progressionCss).toMatch(/@media \(max-width: 350px\)\s*{[\s\S]*?\.badge-shelf\s*{\s*grid-template-columns:\s*repeat\(5/);
  });
});
